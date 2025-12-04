import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { createRazorpayOrder } from '@/lib/razorpay';
import { getPricing } from '@/lib/pricing';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, pdfUrl, formData, amount } = body;

    if (!templateId || !pdfUrl || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Template ID, document URL, and valid amount are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch template to verify it exists and is paid
    const template = await DynamicTemplate.findOne({ id: templateId });
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    if (!template.isPaid || (template.price ?? 0) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Template is not a paid template' },
        { status: 400 }
      );
    }

    if (template.price !== amount) {
      return NextResponse.json(
        { success: false, error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // Get pricing to calculate commission
    const pricing = await getPricing();
    const templateCommissionPercent = pricing.templateCommissionPercent ?? 20;
    const creatorShareAmount = amount * (1 - templateCommissionPercent / 100);
    const platformShareAmount = amount * (templateCommissionPercent / 100);

    // Get creator user ID
    let templateCreatorUserId: string | undefined;
    if (template.createdByType === 'user' && template.createdByEmail) {
      const creator = await User.findOne({ email: template.createdByEmail.toLowerCase() });
      if (creator) {
        templateCreatorUserId = creator._id.toString();
      }
    }

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amount: amount,
      currency: 'INR',
      receipt: `template_${templateId}_${Date.now()}`,
      notes: {
        templateId: templateId,
        templateName: template.name,
        type: 'template_payment'
      }
    });

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
    console.error('Error creating template payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}

