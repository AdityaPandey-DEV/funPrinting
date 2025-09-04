import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { createRazorpayOrder } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Check if this is a file upload or JSON data
    const contentType = request.headers.get('content-type');
    
    let customerInfo, orderType, fileURL, fileType, originalFileName, templateData, printingOptions, deliveryOption;
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      orderType = formData.get('orderType') as string;
      customerInfo = JSON.parse(formData.get('customerInfo') as string);
      printingOptions = JSON.parse(formData.get('printingOptions') as string);
      deliveryOption = JSON.parse(formData.get('deliveryOption') as string);
      templateData = formData.get('templateData') ? JSON.parse(formData.get('templateData') as string) : null;

      // Debug: Log the parsed data
      console.log('🔍 DEBUG - Parsed FormData:');
      console.log('  - customerInfo:', JSON.stringify(customerInfo, null, 2));
      console.log('  - printingOptions:', JSON.stringify(printingOptions, null, 2));
      console.log('  - deliveryOption:', JSON.stringify(deliveryOption, null, 2));

      // Upload file to Cloudinary if it's a file order
      if (orderType === 'file' && file) {
        try {
          const { uploadToCloudinary } = await import('@/lib/cloudinary');
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          fileURL = await uploadToCloudinary(buffer, 'print-service', file.type);
          console.log(`File uploaded successfully to: ${fileURL}`);
          
          // Store file type and original filename for later use
          fileType = file.type;
          originalFileName = file.name;
          console.log(`File type: ${fileType}, Original filename: ${originalFileName}`);
        } catch (error) {
          console.error('Error uploading file:', error);
          throw new Error('Failed to upload file');
        }
      }
    } else {
      // Handle JSON data (for template orders or pre-uploaded files)
      const body = await request.json();
      ({
        customerInfo,
        orderType,
        fileURL,
        templateData,
        printingOptions,
        deliveryOption
      } = body);

      // Debug: Log the parsed JSON data
      console.log('🔍 DEBUG - Parsed JSON:');
      console.log('  - customerInfo:', JSON.stringify(customerInfo, null, 2));
      console.log('  - printingOptions:', JSON.stringify(printingOptions, null, 2));
      console.log('  - deliveryOption:', JSON.stringify(deliveryOption, null, 2));
    }

    let amount = 0;
    
    // Use pageCount from frontend
    const pageCount = printingOptions.pageCount || 1;
    console.log(`📥 Backend received pageCount: ${pageCount}`);

    // Calculate amount based on printing options AND page count using pricing from database
    const { getPricing } = await import('@/lib/pricing');
    const pricing = await getPricing();
    
    const basePrice = pricing.basePrices[printingOptions.pageSize as keyof typeof pricing.basePrices];
    const colorMultiplier = printingOptions.color === 'color' ? pricing.multipliers.color : 1;
    const sidedMultiplier = printingOptions.sided === 'double' ? pricing.multipliers.doubleSided : 1;
    
    // Calculate total amount: base price × page count × color × sided × copies
    amount = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
    
    // Add delivery charge if delivery option is selected
    if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
      amount += deliveryOption.deliveryCharge;
    }
    
    console.log(`🔍 BACKEND CALCULATION DEBUG:`);
    console.log(`  - Base Price (${printingOptions.pageSize}): ₹${basePrice}`);
    console.log(`  - Page Count: ${pageCount}`);
    console.log(`  - Color (${printingOptions.color}): ${colorMultiplier}x`);
    console.log(`  - Sided (${printingOptions.sided}): ${sidedMultiplier}x`);
    console.log(`  - Copies: ${printingOptions.copies}`);
    console.log(`  - Delivery: ${deliveryOption.type === 'delivery' ? `₹${deliveryOption.deliveryCharge}` : 'Free pickup'}`);
    console.log(`  - Formula: ${basePrice} × ${pageCount} × ${colorMultiplier} × ${sidedMultiplier} × ${printingOptions.copies} + ${deliveryOption.type === 'delivery' ? deliveryOption.deliveryCharge : 0}`);
    console.log(`  - Total: ₹${amount}`);

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amount,
      receipt: `order_${Date.now()}`,
      notes: {
        orderType,
        customerName: customerInfo.name,
        pageCount: pageCount.toString(),
      },
    });

    // Validate required fields
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.email) {
      throw new Error('Missing required fields: name, phone, and email are required');
    }

    // Ensure all required fields are present and handle optional fields
    const orderData = {
      customerInfo: {
        name: customerInfo.name,
        phone: customerInfo.phone,
        email: customerInfo.email,
      },
      orderType,
      fileURL: orderType === 'file' ? fileURL : undefined,
      fileType: orderType === 'file' ? fileType : undefined,
      originalFileName: orderType === 'file' ? originalFileName : undefined,
      templateData: orderType === 'template' ? templateData : undefined,
      printingOptions: {
        ...printingOptions,
        pageCount: pageCount, // Add page count to printing options
      },
      deliveryOption,
      amount,
      razorpayOrderId: razorpayOrder.id,
    };

    console.log('🔍 DEBUG - Order data being saved:', JSON.stringify(orderData, null, 2));

    // Create order in database
    const order = new Order(orderData);

    // Save order (orderId will be auto-generated by pre-save hook)
    await order.save();
    
    console.log(`Order created successfully with ID: ${order.orderId}, Amount: ₹${amount}, Pages: ${pageCount}`);

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      pageCount,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
