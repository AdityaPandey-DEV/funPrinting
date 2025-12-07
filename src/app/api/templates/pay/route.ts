import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { createRazorpayOrder } from '@/lib/razorpay';
import { getPricing } from '@/lib/pricing';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    console.log('📋 Template payment request received');
    
    // Validate Razorpay configuration first
    if (!process.env.RAZORPAY_KEY_ID) {
      console.error('❌ RAZORPAY_KEY_ID not found in environment variables');
      return NextResponse.json(
        { success: false, error: 'Payment gateway configuration error' },
        { status: 500 }
      );
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('❌ RAZORPAY_KEY_SECRET not found in environment variables');
      return NextResponse.json(
        { success: false, error: 'Payment gateway configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { templateId, pdfUrl, formData, amount } = body;

    console.log('📋 Template payment - Request data:', {
      templateId: templateId ? 'Present' : 'Missing',
      pdfUrl: pdfUrl ? 'Present' : 'Missing',
      amount: amount,
      formData: formData ? 'Present' : 'Missing'
    });

    if (!templateId || !pdfUrl || !amount || amount <= 0) {
      console.error('❌ Missing required fields:', { templateId: !!templateId, pdfUrl: !!pdfUrl, amount });
      return NextResponse.json(
        { success: false, error: 'Template ID, document URL, and valid amount are required' },
        { status: 400 }
      );
    }

    // Validate amount is reasonable (prevent manipulation)
    if (amount > 100000) { // Max ₹1,00,000
      console.error(`❌ Invalid amount: ₹${amount}`);
      return NextResponse.json(
        { success: false, error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    // Fetch template to verify it exists and is paid
    console.log(`🔍 Fetching template: ${templateId}`);
    const template = await DynamicTemplate.findOne({ id: templateId });
    if (!template) {
      console.error(`❌ Template not found: ${templateId}`);
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }
    console.log(`✅ Template found: ${template.name}`);

    if (!template.isPaid || (template.price ?? 0) <= 0) {
      console.error(`❌ Template is not a paid template: isPaid=${template.isPaid}, price=${template.price}`);
      return NextResponse.json(
        { success: false, error: 'Template is not a paid template' },
        { status: 400 }
      );
    }

    if (template.price !== amount) {
      console.error(`❌ Amount mismatch: template price=${template.price}, requested amount=${amount}`);
      return NextResponse.json(
        { success: false, error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // Get pricing to calculate commission
    console.log('💰 Getting pricing configuration...');
    const pricing = await getPricing();
    const templateCommissionPercent = pricing.templateCommissionPercent ?? 20;
    const creatorShareAmount = amount * (1 - templateCommissionPercent / 100);
    const platformShareAmount = amount * (templateCommissionPercent / 100);
    console.log(`💰 Commission calculation: ${templateCommissionPercent}% (Creator: ₹${creatorShareAmount}, Platform: ₹${platformShareAmount})`);

    // Get creator user ID
    let templateCreatorUserId: string | undefined;
    if (template.createdByType === 'user' && template.createdByEmail) {
      console.log(`🔍 Looking up creator: ${template.createdByEmail}`);
      const creator = await User.findOne({ email: template.createdByEmail.toLowerCase() });
      if (creator) {
        templateCreatorUserId = creator._id.toString();
        console.log(`✅ Creator found: ${templateCreatorUserId}`);
      } else {
        console.log(`⚠️ Creator not found for email: ${template.createdByEmail}`);
      }
    }

    // Create Razorpay order
    console.log(`💳 Creating Razorpay order for amount: ₹${amount}`);
    let razorpayOrder;
    try {
      // Generate receipt - must be max 40 characters (Razorpay limit)
      // Use short format since templateId is already in notes
      const receipt = `tpl_${Date.now()}`;
      
      razorpayOrder = await createRazorpayOrder({
        amount: amount,
        currency: 'INR',
        receipt: receipt,
        notes: {
          templateId: templateId,
          templateName: template.name,
          type: 'template_payment'
        }
      });
      console.log(`✅ Razorpay order created: ${razorpayOrder.id}`);
    } catch (razorpayError: any) {
      console.error('❌ Razorpay order creation failed:', razorpayError);
      const razorpayErrorMessage = razorpayError instanceof Error 
        ? razorpayError.message 
        : (razorpayError?.error?.description || razorpayError?.message || 'Unknown Razorpay error');
      
      // Return specific error message to help with debugging
      return NextResponse.json(
        { 
          success: false, 
          error: `Payment gateway error: ${razorpayErrorMessage}` 
        },
        { status: 500 }
      );
    }

    // Store payment info temporarily in sessionStorage equivalent (we'll store it in Order model with pending status)
    // For now, we'll return the order details and store payment info after verification

    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: amount,
      key: process.env.RAZORPAY_KEY_ID,
      templateId: templateId,
      pdfUrl: pdfUrl,
      formData: formData,
      templateCommissionPercent: templateCommissionPercent,
      creatorShareAmount: creatorShareAmount,
      platformShareAmount: platformShareAmount,
      templateCreatorUserId: templateCreatorUserId
    });

  } catch (error) {
    console.error('❌ Error creating template payment:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Handle specific error types
      if (error.message.includes('Razorpay') || error.message.includes('payment')) {
        return NextResponse.json(
          { success: false, error: `Payment gateway error: ${error.message}` },
          { status: 500 }
        );
      }
      
      if (error.message.includes('database') || error.message.includes('MongoDB') || error.message.includes('connection')) {
        return NextResponse.json(
          { success: false, error: 'Database connection error. Please try again.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `Failed to create payment order: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}

