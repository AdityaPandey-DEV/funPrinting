import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CreatorEarning from '@/models/CreatorEarning';
import { verifyPayment } from '@/lib/razorpay';
import mongoose from 'mongoose';

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
        // Validate and convert templateCreatorUserId to ObjectId
        let creatorUserIdObjectId: mongoose.Types.ObjectId;
        try {
          // Check if it's already a valid ObjectId string
          if (mongoose.Types.ObjectId.isValid(templateCreatorUserId)) {
            creatorUserIdObjectId = new mongoose.Types.ObjectId(templateCreatorUserId);
          } else {
            throw new Error(`Invalid ObjectId format: ${templateCreatorUserId}`);
          }
        } catch (idError) {
          console.error('❌ Invalid creatorUserId format:', {
            templateCreatorUserId,
            error: idError instanceof Error ? idError.message : String(idError)
          });
          throw new Error(`Invalid creator user ID format: ${templateCreatorUserId}`);
        }

        console.log('📝 Creating CreatorEarning with data:', {
          creatorUserId: creatorUserIdObjectId.toString(),
          templateId,
          orderId: `template_${razorpay_order_id}`,
          amount: creatorShareAmount,
          platformShareAmount: platformShareAmount || 0
        });

        const earning = new CreatorEarning({
          creatorUserId: creatorUserIdObjectId,
          templateId: templateId,
          orderId: `template_${razorpay_order_id}`, // Use a unique order ID for template-only payments
          razorpayPaymentId: razorpay_payment_id,
          amount: creatorShareAmount,
          platformShareAmount: platformShareAmount || 0,
          status: 'pending',
          // payoutMethod is optional - will be set when processing payout
          notes: `Template payment for template ${templateId}`
        });
        
        await earning.save();
        console.log(`✅ CreatorEarning created successfully:`, {
          earningId: earning._id.toString(),
          creatorUserId: earning.creatorUserId.toString(),
          amount: earning.amount,
          orderId: earning.orderId,
          status: earning.status
        });
      } catch (earningError) {
        console.error('❌ Error creating CreatorEarning:', {
          error: earningError instanceof Error ? earningError.message : String(earningError),
          stack: earningError instanceof Error ? earningError.stack : undefined,
          templateCreatorUserId,
          creatorShareAmount,
          templateId,
          razorpayPaymentId: razorpay_payment_id
        });
        // Don't fail the payment verification if earning creation fails
        // But log it for admin review
      }
    } else {
      console.log('ℹ️ Skipping CreatorEarning creation:', {
        hasCreatorUserId: !!templateCreatorUserId,
        hasShareAmount: !!creatorShareAmount,
        shareAmount: creatorShareAmount,
        reason: !templateCreatorUserId ? 'No creator user ID' : 
                !creatorShareAmount ? 'No creator share amount' : 
                creatorShareAmount <= 0 ? 'Share amount is zero or negative' : 'Unknown'
      });
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

