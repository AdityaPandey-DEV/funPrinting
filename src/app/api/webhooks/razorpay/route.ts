import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import PrintJob from '@/models/PrintJob';

// In-memory store to track processed webhook events (prevents duplicate processing)
const processedEvents = new Map<string, number>();
const MAX_EVENT_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max 100 requests per minute per IP

// Clean up old events periodically
setInterval(() => {
  const now = Date.now();
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (now - timestamp > MAX_EVENT_AGE) {
      processedEvents.delete(eventId);
    }
  }
  
  // Clean up rate limit data
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

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
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const now = Date.now();
    const rateLimitData = rateLimitStore.get(clientIP);
    
    if (rateLimitData) {
      if (now > rateLimitData.resetTime) {
        // Reset window
        rateLimitStore.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      } else if (rateLimitData.count >= RATE_LIMIT_MAX_REQUESTS) {
        console.error(`❌ Rate limit exceeded for IP: ${clientIP}`);
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded' },
          { status: 429 }
        );
      } else {
        rateLimitData.count++;
      }
    } else {
      rateLimitStore.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

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

    // Check for duplicate events (idempotency protection)
    const eventId = event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id;
    if (eventId && processedEvents.has(eventId)) {
      console.log(`ℹ️ Duplicate webhook event ignored: ${eventId}`);
      return NextResponse.json({ success: true, message: 'Duplicate event ignored' });
    }

    // Mark event as processed
    if (eventId) {
      processedEvents.set(eventId, Date.now());
    }

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

    // Check if order is already processed (race condition protection)
    if (order.paymentStatus === 'completed' && order.razorpayPaymentId === payment.id) {
      console.log(`ℹ️ Order ${order.orderId} already processed for payment ${payment.id}`);
      return;
    }

    // Validate payment amount matches order amount
    const expectedAmount = Math.round(order.amount * 100); // Convert to paise
    if (payment.amount !== expectedAmount) {
      console.error(`❌ Payment amount mismatch for order ${order.orderId}: expected ${expectedAmount}, got ${payment.amount}`);
      // Log but don't fail - this could be due to rounding differences
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
          razorpayPaymentId: payment.id,
          status: 'paid',
          orderStatus: 'pending', // Ready for processing
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updateResult) {
      console.log(`ℹ️ Order ${order.orderId} already processed or not found`);
      return;
    }

    console.log(`✅ Order ${order.orderId} marked as paid`);

    // Create print job if this is a file order
    if (order.orderType === 'file' && order.fileURL) {
      try {
        // Check if print job already exists
        const existingPrintJob = await PrintJob.findOne({ orderId: order._id.toString() });
        if (existingPrintJob) {
          console.log(`ℹ️ Print job already exists for order ${order.orderId}`);
          return;
        }

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

        // Note: Auto-printing functionality has been removed
        console.log(`✅ Order ${order.orderId} ready for manual processing`);
      } catch (printJobError) {
        console.error('Error creating print job:', printJobError);
        // Don't fail the order if print job creation fails
      }
    }

  } catch (error) {
    console.error('❌ Error handling payment captured:', error);
    // Consider implementing retry logic or dead letter queue for failed webhook processing
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
