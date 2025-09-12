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

    // Check if order is already processed (race condition protection)
    if (order.paymentStatus === 'completed' && order.razorpayPaymentId === razorpay_payment_id) {
      console.log(`ℹ️ Order ${order.orderId} already processed for payment ${razorpay_payment_id}`);
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        order: {
          orderId: order.orderId,
          amount: order.amount,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
        }
      });
    }

    // Update order with payment details using atomic operation
    const updateResult = await Order.findOneAndUpdate(
      { 
        _id: order._id, 
        paymentStatus: { $ne: 'completed' } // Only update if not already completed
      },
      {
        $set: {
          paymentStatus: 'completed',
          razorpayPaymentId: razorpay_payment_id,
          status: 'paid',
          orderStatus: 'pending', // Ready for processing
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updateResult) {
      console.log(`ℹ️ Order ${order.orderId} already processed or not found`);
      return NextResponse.json({
        success: true,
        message: 'Order already processed',
        order: {
          orderId: order.orderId,
          amount: order.amount,
          paymentStatus: 'completed',
          createdAt: order.createdAt,
        }
      });
    }

    console.log(`✅ Order ${order.orderId} marked as paid`);

    // Create print job if this is a file order
    let printJob = null;
    if (updateResult.orderType === 'file' && updateResult.fileURL) {
      try {
        // Check if print job already exists
        const existingPrintJob = await PrintJob.findOne({ orderId: updateResult._id.toString() });
        if (existingPrintJob) {
          console.log(`ℹ️ Print job already exists for order ${updateResult.orderId}`);
          printJob = existingPrintJob;
        } else {
          console.log('🖨️ Creating print job for order:', updateResult.orderId);
          
          // Calculate estimated duration
          const estimatedDuration = Math.ceil(
            (updateResult.printingOptions.pageCount * updateResult.printingOptions.copies * 0.5) + // 0.5 minutes per page
            (updateResult.printingOptions.color === 'color' ? updateResult.printingOptions.pageCount * 0.3 : 0) // Extra time for color
          );

          printJob = new PrintJob({
            orderId: updateResult._id.toString(),
            orderNumber: updateResult.orderId,
            customerName: updateResult.customerInfo.name,
            customerEmail: updateResult.customerInfo.email,
            fileURL: updateResult.fileURL,
            fileName: updateResult.originalFileName || 'document.pdf',
            fileType: updateResult.fileType || 'application/pdf',
            printingOptions: updateResult.printingOptions,
            priority: 'normal',
            estimatedDuration,
            status: 'pending'
          });

          await printJob.save();
          console.log(`✅ Print job created: ${printJob.orderNumber}`);

          // Trigger auto-printing asynchronously (don't wait for response)
          setImmediate(async () => {
            try {
              const autoPrintResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/printing/auto-print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: updateResult._id.toString() })
              });
              
              if (autoPrintResponse.ok) {
                console.log('🔄 Auto-print triggered successfully');
              } else {
                console.error('❌ Auto-print failed:', autoPrintResponse.status);
              }
            } catch (autoPrintError) {
              console.error('Error triggering auto-print:', autoPrintError);
              // Don't fail the order if auto-print fails
            }
          });
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
        orderId: updateResult.orderId,
        amount: updateResult.amount,
        paymentStatus: updateResult.paymentStatus,
        createdAt: updateResult.createdAt,
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
