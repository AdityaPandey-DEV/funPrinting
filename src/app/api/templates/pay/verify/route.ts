import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CreatorEarning from '@/models/CreatorEarning';
import { verifyPayment } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      templateId,
      pdfUrl,
      formData,
      creatorShareAmount,
      platformShareAmount,
      templateCreatorUserId
    } = body;

    console.log('🔍 Template payment verification started for order:', razorpay_order_id);

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ Missing required payment verification fields');
      return NextResponse.json(
        { success: false, error: 'Missing required payment verification fields' },
        { status: 400 }
      );
    }

    // Verify payment signature
    const isValid = verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.error('❌ Invalid payment signature');
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature. Please contact support if payment was deducted.' },
        { status: 400 }
      );
    }

    console.log('✅ Payment signature verified successfully');

    // Check if earning already exists (idempotency)
    const existingEarning = await CreatorEarning.findOne({ 
      razorpayPaymentId: razorpay_payment_id 
    });
    
    if (existingEarning) {
      console.log(`ℹ️ CreatorEarning already exists for payment ${razorpay_payment_id}`);
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        earningId: existingEarning._id.toString()
      });
    }

    // Create CreatorEarning record if creator exists and share amount > 0
    if (templateCreatorUserId && creatorShareAmount && creatorShareAmount > 0) {
      try {
        const earning = new CreatorEarning({
          creatorUserId: templateCreatorUserId,
          templateId: templateId,
          orderId: `template_${razorpay_order_id}`, // Use a unique order ID for template-only payments
          razorpayPaymentId: razorpay_payment_id,
          amount: creatorShareAmount,
          platformShareAmount: platformShareAmount || 0,
          status: 'pending',
          payoutMethod: 'manual', // Manual payout for now
          notes: `Template payment for template ${templateId}`
        });
        
        await earning.save();
        console.log(`💰 CreatorEarning created: ₹${creatorShareAmount} for creator ${templateCreatorUserId}`);
      } catch (earningError) {
        console.error('❌ Error creating CreatorEarning:', earningError);
        // Don't fail the payment verification if earning creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Template payment verified successfully',
      razorpayPaymentId: razorpay_payment_id,
      pdfUrl: pdfUrl,
      formData: formData
    });

  } catch (error) {
    console.error('❌ Error verifying template payment:', error);
    
    let errorMessage = 'Failed to verify template payment';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('signature')) {
        statusCode = 400;
      }
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

