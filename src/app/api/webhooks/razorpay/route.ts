import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import PrintJob from '@/models/PrintJob';

// Verify Razorpay webhook signature
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    
    if (!signature) {
      console.error('❌ Missing Razorpay signature');
      return NextResponse.json(
        { success: false, error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ Razorpay webhook secret not configured');
      return NextResponse.json(
        { success: false, error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const isValidSignature = verifyWebhookSignature(body, signature, webhookSecret);
    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    console.log('🔔 Razorpay webhook received:', event.event);

    await connectDB();

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      
      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;
      
      default:
        console.log(`ℹ️ Unhandled webhook event: ${event.event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(payment: any) {
  try {
    console.log('💰 Payment captured:', payment.id);
    
    // Find the order by Razorpay order ID
    const order = await Order.findOne({ razorpayOrderId: payment.order_id });
    
    if (!order) {
      console.error('❌ Order not found for payment:', payment.order_id);
      return;
    }

    // Update order with payment details
    order.paymentStatus = 'completed';
    order.razorpayPaymentId = payment.id;
    order.status = 'paid';
    order.orderStatus = 'pending'; // Ready for processing
    
    await order.save();
    console.log(`✅ Order ${order.orderId} marked as paid`);

    // Create print job if this is a file order
    if (order.orderType === 'file' && order.fileURL) {
      try {
        console.log('🖨️ Creating print job for order:', order.orderId);
        
        // Calculate estimated duration
        const estimatedDuration = Math.ceil(
          (order.printingOptions.pageCount * order.printingOptions.copies * 0.5) + // 0.5 minutes per page
          (order.printingOptions.color === 'color' ? order.printingOptions.pageCount * 0.3 : 0) // Extra time for color
        );

        const printJob = new PrintJob({
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

  } catch (error) {
    console.error('❌ Error handling payment captured:', error);
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    console.log('❌ Payment failed:', payment.id);
    
    // Find the order by Razorpay order ID
    const order = await Order.findOne({ razorpayOrderId: payment.order_id });
    
    if (!order) {
      console.error('❌ Order not found for failed payment:', payment.order_id);
      return;
    }

    // Update order status
    order.paymentStatus = 'failed';
    order.status = 'cancelled';
    order.orderStatus = 'pending'; // Keep as pending since payment failed
    
    await order.save();
    console.log(`❌ Order ${order.orderId} marked as failed`);

  } catch (error) {
    console.error('❌ Error handling payment failed:', error);
  }
}

async function handleOrderPaid(order: any) {
  try {
    console.log('✅ Order paid:', order.id);
    
    // Find the order by Razorpay order ID
    const dbOrder = await Order.findOne({ razorpayOrderId: order.id });
    
    if (!dbOrder) {
      console.error('❌ Order not found for paid order:', order.id);
      return;
    }

    // Update order status
    dbOrder.paymentStatus = 'completed';
    dbOrder.status = 'paid';
    dbOrder.orderStatus = 'pending'; // Ready for processing
    
    await dbOrder.save();
    console.log(`✅ Order ${dbOrder.orderId} marked as paid via order.paid event`);

  } catch (error) {
    console.error('❌ Error handling order paid:', error);
  }
}
