import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import PrintJob from '@/models/PrintJob';
import { sendPaymentNotification } from '@/lib/notificationService';

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
    const receivedAt = Date.now();
    const eventTimestamp = event.created_at ? event.created_at * 1000 : receivedAt; // Convert seconds to milliseconds
    
    // Calculate webhook delay (if event is old, it might be a replay)
    const delay = receivedAt - eventTimestamp;
    const isDelayed = delay > 5 * 60 * 1000; // More than 5 minutes old
    
    console.log('🔔 Razorpay webhook received:', event.event);
    console.log(`📅 Event timestamp: ${new Date(eventTimestamp).toISOString()}`);
    console.log(`⏱️ Webhook delay: ${Math.round(delay / 1000)}s${isDelayed ? ' (DELAYED - possible replay)' : ''}`);

    // Check for duplicate events (idempotency protection)
    const eventId = event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id;
    if (eventId && processedEvents.has(eventId)) {
      const processedAt = processedEvents.get(eventId)!;
      const timeSinceProcessed = receivedAt - processedAt;
      console.log(`ℹ️ Duplicate webhook event ignored: ${eventId} (processed ${Math.round(timeSinceProcessed / 1000)}s ago)`);
      return NextResponse.json({ success: true, message: 'Duplicate event ignored' });
    }

    // Mark event as processed (even if we haven't processed it yet, to prevent race conditions)
    // We'll remove it if processing fails
    if (eventId) {
      processedEvents.set(eventId, receivedAt);
    }

    await connectDB();

    let processingSuccess = true;
    
    switch (event.event) {
      case 'payment.captured':
        processingSuccess = await handlePaymentCaptured(event.payload.payment.entity);
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
    
    // If processing failed, remove from processed events so it can be retried
    if (!processingSuccess && eventId) {
      console.warn(`⚠️ Webhook processing failed for ${eventId}, removing from processed events for retry`);
      processedEvents.delete(eventId);
    }
    
    // Always return success to Razorpay to prevent retries from their side
    // We handle retries internally
    return NextResponse.json({ 
      success: true, 
      message: processingSuccess ? 'Webhook processed successfully' : 'Webhook processing failed but will retry'
    });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(payment: any, retryCount: number = 0): Promise<boolean> {
  const MAX_RETRIES = 3;
  
  try {
    console.log(`💰 Payment captured: ${payment.id}${retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ''}`);
    console.log(`📋 Payment details: order_id=${payment.order_id}, amount=${payment.amount}, status=${payment.status}, captured=${payment.captured}`);
    
    // Find the order by Razorpay order ID
    const order = await Order.findOne({ razorpayOrderId: payment.order_id });
    
    if (!order) {
      console.error('❌ Order not found for payment:', payment.order_id);
      // Don't retry if order doesn't exist - this is a permanent failure
      return false;
    }

    // Check if order is already processed (race condition protection)
    if (order.paymentStatus === 'completed' && order.razorpayPaymentId === payment.id) {
      console.log(`ℹ️ Order ${order.orderId} already processed for payment ${payment.id}`);
      return true; // Success (already processed)
    }
    
    // If order is already completed with a different payment ID, log warning
    if (order.paymentStatus === 'completed' && order.razorpayPaymentId !== payment.id) {
      console.warn(`⚠️ Order ${order.orderId} already completed with different payment: ${order.razorpayPaymentId} (new: ${payment.id})`);
      return true; // Consider this success to avoid duplicate processing
    }

    // If order update result is null, it means order was already processed
    // This is handled below after the update attempt

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
      return true; // Consider this success (already processed)
    }

    console.log(`✅ Order ${order.orderId} marked as paid`);

    // Send payment completion notification to admin
    try {
      await sendPaymentNotification({
        orderId: updateResult.orderId,
        customerName: updateResult.customerInfo.name,
        customerEmail: updateResult.customerInfo.email,
        customerPhone: updateResult.customerInfo.phone,
        orderType: updateResult.orderType,
        amount: updateResult.amount,
        pageCount: updateResult.printingOptions.pageCount,
        printingOptions: updateResult.printingOptions,
        deliveryOption: updateResult.deliveryOption,
        createdAt: updateResult.createdAt,
        paymentStatus: updateResult.paymentStatus,
        orderStatus: updateResult.orderStatus,
        templateName: updateResult.templateName,
        fileName: updateResult.originalFileName
      }, 'completed');
    } catch (notificationError) {
      console.error('❌ Failed to send payment completion notification:', notificationError);
      // Don't fail the payment processing if notification fails
    }

    // Create print job if this is a file order
    if (order.orderType === 'file' && order.fileURL) {
      try {
        // Check if print job already exists
        const existingPrintJob = await PrintJob.findOne({ orderId: order._id.toString() });
        if (existingPrintJob) {
          console.log(`ℹ️ Print job already exists for order ${order.orderId}`);
          return true; // Success (print job already exists)
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

    return true; // Success
    
  } catch (error) {
    console.error(`❌ Error handling payment captured (attempt ${retryCount + 1}):`, error);
    
    // Retry logic for transient errors
    if (retryCount < MAX_RETRIES) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Only retry on transient errors (network, database connection, etc.)
      const isTransientError = errorMessage.includes('ECONNRESET') ||
                              errorMessage.includes('ETIMEDOUT') ||
                              errorMessage.includes('ENOTFOUND') ||
                              errorMessage.includes('connection') ||
                              errorMessage.includes('timeout') ||
                              errorMessage.includes('MongoError') ||
                              errorMessage.includes('MongooseError');
      
      if (isTransientError) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`🔄 Retrying payment captured handler in ${retryDelay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return await handlePaymentCaptured(payment, retryCount + 1);
      }
    }
    
    // If we exhausted retries or it's a permanent error, log and return false
    console.error(`❌ Failed to handle payment captured after ${retryCount + 1} attempts`);
    return false; // Failure
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

    // Send payment failure notification to admin
    try {
      await sendPaymentNotification({
        orderId: order.orderId,
        customerName: order.customerInfo.name,
        customerEmail: order.customerInfo.email,
        customerPhone: order.customerInfo.phone,
        orderType: order.orderType,
        amount: order.amount,
        pageCount: order.printingOptions.pageCount,
        printingOptions: order.printingOptions,
        deliveryOption: order.deliveryOption,
        createdAt: order.createdAt,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        templateName: order.templateName,
        fileName: order.originalFileName
      }, 'failed');
    } catch (notificationError) {
      console.error('❌ Failed to send payment failure notification:', notificationError);
      // Don't fail the payment processing if notification fails
    }

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
