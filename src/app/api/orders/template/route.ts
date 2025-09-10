import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import Order from '@/models/Order';
import { fillDocxTemplate, validateFormData } from '@/lib/docxProcessor';
import { convertDocxToPdf } from '@/lib/cloudmersive';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { createRazorpayOrder } from '@/lib/razorpay';
import { getPricing } from '@/lib/pricing';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      templateId, 
      formData, 
      customerInfo, 
      printingOptions, 
      deliveryOption 
    } = body;

    if (!templateId || !formData || !customerInfo || !printingOptions || !deliveryOption) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`Processing template order for template: ${templateId}`);

    // Connect to database
    await connectDB();

    // Fetch template from database
    const template = await DynamicTemplate.findOne({ id: templateId });
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Generate form schema and validate form data
    const formSchema = template.placeholders.map((placeholder: string) => ({
      key: placeholder,
      type: 'text', // Default type, could be enhanced
      required: true
    }));

    const validation = validateFormData(formData, formSchema);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid form data', details: validation.errors },
        { status: 400 }
      );
    }

    // Download DOCX template from Cloudinary
    console.log('Downloading DOCX template from Cloudinary...');
    const docxResponse = await fetch(template.wordUrl);
    if (!docxResponse.ok) {
      throw new Error('Failed to fetch DOCX template from Cloudinary');
    }
    const docxBuffer = Buffer.from(await docxResponse.arrayBuffer());

    // Fill DOCX template with form data
    console.log('Filling DOCX template with form data...');
    const filledDocxBuffer = await fillDocxTemplate(docxBuffer, formData);

    // Convert filled DOCX to PDF
    console.log('Converting filled DOCX to PDF...');
    const pdfBuffer = await convertDocxToPdf(filledDocxBuffer);

    // Upload both filled DOCX and PDF to Cloudinary
    console.log('Uploading filled documents to Cloudinary...');
    const filledDocxUrl = await uploadToCloudinary(
      filledDocxBuffer, 
      'orders/filled-docx', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    const filledPdfUrl = await uploadToCloudinary(
      pdfBuffer, 
      'orders/filled-pdf', 
      'application/pdf'
    );

    // Calculate pricing
    const pricing = await getPricing();
    const basePrice = pricing.basePrices[printingOptions.pageSize as keyof typeof pricing.basePrices];
    const colorMultiplier = printingOptions.color === 'color' ? pricing.multipliers.color : 1;
    const sidedMultiplier = printingOptions.sided === 'double' ? pricing.multipliers.doubleSided : 1;
    
    // Calculate total amount: base price × page count × color × sided × copies
    const pageCount = printingOptions.pageCount || 1;
    let amount = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
    
    // Add delivery charge if delivery option is selected
    if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
      amount += deliveryOption.deliveryCharge;
    }

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amount,
      receipt: `template_order_${Date.now()}`,
      notes: {
        orderType: 'template',
        templateId,
        customerName: customerInfo.name,
        pageCount: pageCount.toString(),
      },
    });

    // Create order in database
    const orderData = {
      orderId: uuidv4(),
      customerInfo: {
        name: customerInfo.name,
        phone: customerInfo.phone,
        email: customerInfo.email,
      },
      orderType: 'template',
      templateId,
      templateName: template.name,
      formData,
      filledDocxUrl,
      filledPdfUrl,
      printingOptions: {
        ...printingOptions,
        pageCount,
      },
      deliveryOption,
      amount,
      razorpayOrderId: razorpayOrder.id,
      status: 'pending_payment',
    };

    const order = new Order(orderData);
    await order.save();

    console.log(`Template order created successfully with ID: ${order.orderId}`);

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderId,
        razorpayOrderId: razorpayOrder.id,
        amount,
        pageCount,
        filledPdfUrl, // For immediate preview
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
        }
      },
      key: process.env.RAZORPAY_KEY_ID,
    });

  } catch (error: any) {
    console.error('Error creating template order:', error);
    
    // Handle specific Cloudmersive API errors
    if (error.message.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Cloudmersive API key. Please check your configuration.' },
        { status: 401 }
      );
    }
    
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return NextResponse.json(
        { success: false, error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create template order' },
      { status: 500 }
    );
  }
}
