import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import Order from '@/models/Order';
import { fillDocxTemplate, validateFormData } from '@/lib/docxProcessor';
import { convertDocxToPdf } from '@/lib/cloudmersive';
import { uploadFile } from '@/lib/storage';
import { createRazorpayOrder } from '@/lib/razorpay';
import { getPricing } from '@/lib/pricing';
import { v4 as uuidv4 } from 'uuid';
import { sendNewOrderNotification, sendCustomerOrderConfirmation } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      templateId, 
      formData, 
      customerInfo, 
      printingOptions, 
      deliveryOption,
      expectedDate
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

    // Upload both filled DOCX and PDF to storage
    const storageProvider = process.env.STORAGE_PROVIDER || 'cloudinary';
    console.log(`Uploading filled documents to ${storageProvider}...`);
    const filledDocxUrl = await uploadFile(
      filledDocxBuffer, 
      'orders/filled-docx', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    const filledPdfUrl = await uploadFile(
      pdfBuffer, 
      'orders/filled-pdf', 
      'application/pdf'
    );

    // Calculate pricing
    const pricing = await getPricing();
    const basePrice = pricing.basePrices[printingOptions.pageSize as keyof typeof pricing.basePrices];
    const sidedMultiplier = printingOptions.sided === 'double' ? pricing.multipliers.doubleSided : 1;
    
    // Calculate total amount based on color option
    const pageCount = printingOptions.pageCount || 1;
    let amount = 0;
    
    if (printingOptions.color === 'mixed' && printingOptions.pageColors) {
      // Mixed color pricing: calculate separately for color and B&W pages
      const colorPages = printingOptions.pageColors.colorPages.length;
      const bwPages = printingOptions.pageColors.bwPages.length;
      
      // If not all pages are specified, treat unspecified pages as B&W
      const unspecifiedPages = pageCount - (colorPages + bwPages);
      const totalBwPages = bwPages + (unspecifiedPages > 0 ? unspecifiedPages : 0);
      
      const colorCost = basePrice * colorPages * pricing.multipliers.color;
      const bwCost = basePrice * totalBwPages;
      
      amount = (colorCost + bwCost) * sidedMultiplier * printingOptions.copies;
      
      console.log(`🔍 Template order - Mixed color pricing:`);
      console.log(`  - Color pages: ${colorPages} (₹${colorCost})`);
      console.log(`  - B&W pages: ${totalBwPages} (₹${bwCost})`);
      console.log(`  - Unspecified pages treated as B&W: ${unspecifiedPages}`);
    } else {
      // Standard pricing for all color or all B&W
      const colorMultiplier = printingOptions.color === 'color' ? pricing.multipliers.color : 1;
      amount = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
    }
    
    // Add compulsory service option cost (only for multi-page jobs)
    if (pageCount > 1) {
      if (printingOptions.serviceOption === 'binding') {
        amount += pricing.additionalServices.binding;
      } else if (printingOptions.serviceOption === 'file') {
        amount += 10; // File handling fee (keep pages inside file)
      } else if (printingOptions.serviceOption === 'service') {
        amount += 5; // Minimal service fee
      }
    }
    
    // Add delivery charge if delivery option is selected
    if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
      amount += deliveryOption.deliveryCharge;
    }

    // Calculate template fee and revenue split for paid templates
    let templatePrice = 0;
    let creatorShareAmount = 0;
    let platformShareAmount = 0;
    const templateCommissionPercent = pricing.templateCommissionPercent ?? 20;

    if (template.isPaid && typeof template.price === 'number' && template.price > 0) {
      templatePrice = template.price;
      amount += templatePrice;

      // Calculate platform and creator shares
      const safeCommission = Math.min(Math.max(templateCommissionPercent, 0), 50);
      platformShareAmount = Math.round((templatePrice * safeCommission) / 100);
      creatorShareAmount = Math.max(0, templatePrice - platformShareAmount);

      console.log(`💰 Template monetization for order:`);
      console.log(`  - Template price: ₹${templatePrice}`);
      console.log(`  - Commission: ${safeCommission}%`);
      console.log(`  - Platform share: ₹${platformShareAmount}`);
      console.log(`  - Creator share: ₹${creatorShareAmount}`);
    }

    // Add 3% Razorpay processing fee as hidden charge
    // This ensures we receive at least the base amount after Razorpay's 2% fee deduction
    const RAZORPAY_FEE_PERCENT = 3;
    const baseAmount = amount;
    const finalAmount = Math.round(baseAmount * (1 + RAZORPAY_FEE_PERCENT / 100));
    const razorpayFee = finalAmount - baseAmount;
    
    console.log(`💳 Razorpay fee calculation:`);
    console.log(`  - Base amount: ₹${baseAmount}`);
    console.log(`  - Razorpay fee (${RAZORPAY_FEE_PERCENT}%): ₹${razorpayFee}`);
    console.log(`  - Final amount (with fee): ₹${finalAmount}`);

    // Create Razorpay order with final amount (including hidden fee)
    const razorpayOrder = await createRazorpayOrder({
      amount: finalAmount,
      receipt: `template_order_${Date.now()}`,
      notes: {
        orderType: 'template',
        templateId,
        customerName: customerInfo.name,
        pageCount: pageCount.toString(),
        templatePrice: templatePrice.toString(),
        amount: baseAmount.toString(), // Store original amount in notes
        razorpayFee: razorpayFee.toString(), // Store fee for tracking
      },
    });

    // Create order in database with monetization fields
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
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      amount,
      razorpayOrderId: razorpayOrder.id,
      status: 'pending_payment',
      // Monetization fields
      templatePrice: templatePrice > 0 ? templatePrice : undefined,
      templateCommissionPercent: templatePrice > 0 ? templateCommissionPercent : undefined,
      creatorShareAmount: creatorShareAmount > 0 ? creatorShareAmount : undefined,
      platformShareAmount: platformShareAmount > 0 ? platformShareAmount : undefined,
      templateCreatorUserId: template.createdByUserId ? template.createdByUserId.toString() : undefined,
    };

    const order = new Order(orderData);
    
    try {
      await order.save();
      console.log(`✅ Template order created successfully with ID: ${order.orderId}`);
    } catch (saveError) {
      console.error('❌ Error saving template order to database:', saveError);
      if (saveError instanceof Error) {
        console.error('❌ Validation errors:', saveError.message);
      }
      throw saveError;
    }

    // Send notifications (both admin and customer)
    const notificationData = {
      orderId: order.orderId,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      orderType: 'template' as const,
      amount,
      pageCount,
      printingOptions,
      deliveryOption,
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      templateName: template.name
    };

    // Send admin notification
    try {
      await sendNewOrderNotification(notificationData);
    } catch (notificationError) {
      console.error('❌ Failed to send admin notification:', notificationError);
      // Don't fail the order creation if notification fails
    }

    // Send customer confirmation email
    try {
      await sendCustomerOrderConfirmation(notificationData);
    } catch (customerNotificationError) {
      console.error('❌ Failed to send customer confirmation:', customerNotificationError);
      // Don't fail the order creation if customer notification fails
    }

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
