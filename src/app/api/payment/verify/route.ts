import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import PrintJob from '@/models/PrintJob';
import { verifyPayment } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    console.log('🔍 Payment verification started for order:', razorpay_order_id);

    // Verify payment signature
    const isValid = verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.error('❌ Invalid payment signature');
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    console.log('✅ Payment signature verified successfully');

    // Find the existing pending order
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    
    if (!order) {
      console.error('❌ Order not found for Razorpay order ID:', razorpay_order_id);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log(`📋 Found pending order: ${order.orderId}`);

    // Update order with payment details
    order.paymentStatus = 'completed';
    order.razorpayPaymentId = razorpay_payment_id;
    order.status = 'paid';
    order.orderStatus = 'pending'; // Ready for processing
    
    try {
      await order.save();
      console.log(`✅ Order ${order.orderId} marked as paid`);
    } catch (saveError) {
      console.error('❌ Error updating order:', saveError);
      throw saveError;
    }

    // Create print job if this is a file order
    let printJob = null;
    if (order.orderType === 'file' && order.fileURL) {
      try {
        console.log('🖨️ Creating print job for order:', order.orderId);
        
        // Calculate estimated duration
        const estimatedDuration = Math.ceil(
          (order.printingOptions.pageCount * order.printingOptions.copies * 0.5) + // 0.5 minutes per page
          (order.printingOptions.color === 'color' ? order.printingOptions.pageCount * 0.3 : 0) // Extra time for color
        );

        printJob = new PrintJob({
          orderId: order._id.toString(),
          orderNumber: order.orderId,
          customerName: order.customerInfo.name,
          customerEmail: order.customerInfo.email,
          fileURL: order.fileURL,
          fileName: order.originalFileName || 'document.pdf',
          fileType: order.fileType || 'application/pdf',
          printingOptions: order.printingOptions,
          priority: 'normal',
          estimatedDuration,
          status: 'pending'
        });

        await printJob.save();
        console.log(`✅ Print job created: ${printJob.orderNumber}`);

        // Trigger auto-printing
        try {
          const autoPrintResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/printing/auto-print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order._id.toString() })
          });
          
          if (autoPrintResponse.ok) {
            console.log('🔄 Auto-print triggered successfully');
          }
        } catch (autoPrintError) {
          console.error('Error triggering auto-print:', autoPrintError);
          // Don't fail the order if auto-print fails
        }
      } catch (printJobError) {
        console.error('Error creating print job:', printJobError);
        // Don't fail the order if print job creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order created successfully',
      order: {
        orderId: order.orderId,
        amount: order.amount,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
      printJob: printJob ? {
        id: printJob._id,
        status: printJob.status,
        estimatedDuration: printJob.estimatedDuration
      } : null,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment and create order' },
      { status: 500 }
    );
  }
}
