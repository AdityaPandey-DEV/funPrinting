import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import PrintJob from '@/models/PrintJob';
import { sendPaymentNotification } from '@/lib/notificationService';

// Razorpay API configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

interface RazorpayPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  description: string;
  captured: boolean;
  created_at: number;
}

// Fetch all payments for a Razorpay order
async function fetchOrderPayments(orderId: string): Promise<RazorpayPayment[]> {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('❌ Razorpay credentials not configured');
      return [];
    }

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    
    const response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch payments for order ${orderId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`❌ Error fetching payments for order ${orderId}:`, error);
    return [];
  }
}

// Check if payment is successful
function isPaymentSuccessful(payment: RazorpayPayment): boolean {
  return payment.status === 'captured' && payment.captured === true;
}

// Update order status if payment is successful
async function updateOrderIfPaymentSuccess(
  order: any,
  payment: RazorpayPayment
): Promise<boolean> {
  try {
    // Check if already processed
    if (order.paymentStatus === 'completed' && order.razorpayPaymentId === payment.id) {
      console.log(`ℹ️ Order ${order.orderId} already processed for payment ${payment.id}`);
      return true;
    }

    // Validate payment amount matches order amount (convert to paise for comparison)
    const expectedAmount = Math.round(order.amount * 100);
    if (payment.amount !== expectedAmount) {
      console.warn(`⚠️ Payment amount mismatch for order ${order.orderId}: expected ${expectedAmount} paise, got ${payment.amount} paise`);
      // Continue anyway as this could be due to rounding differences
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
      return false;
    }

    console.log(`✅ Order ${order.orderId} updated to paid status via payment status check`);

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
      // Don't fail the order update if notification fails
    }

    // Create print job if this is a file order
    if (updateResult.orderType === 'file' && updateResult.fileURL) {
      try {
        // Check if print job already exists
        const existingPrintJob = await PrintJob.findOne({ orderId: updateResult._id.toString() });
        if (existingPrintJob) {
          console.log(`ℹ️ Print job already exists for order ${updateResult.orderId}`);
          return true;
        }

        console.log('🖨️ Creating print job for order:', updateResult.orderId);
        
        // Calculate estimated duration
        const estimatedDuration = Math.ceil(
          ((updateResult.printingOptions.pageCount || 1) * updateResult.printingOptions.copies * 0.5) + // 0.5 minutes per page
          (updateResult.printingOptions.color === 'color' ? (updateResult.printingOptions.pageCount || 1) * 0.3 : 0) // Extra time for color
        );

        const printJob = new PrintJob({
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
      } catch (printJobError) {
        console.error('Error creating print job:', printJobError);
        // Don't fail the order update if print job creation fails
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Error updating order ${order.orderId}:`, error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpay_order_id } = body;

    if (!razorpay_order_id) {
      return NextResponse.json(
        { success: false, error: 'razorpay_order_id is required' },
        { status: 400 }
      );
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('❌ Razorpay credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Payment gateway not configured' },
        { status: 500 }
      );
    }

    await connectDB();

    // Find order by Razorpay order ID
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!order) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Order not found',
          payment_status: 'unknown'
        },
        { status: 404 }
      );
    }

    // If order is already completed, return early
    if (order.paymentStatus === 'completed') {
      return NextResponse.json({
        success: true,
        payment_status: 'completed',
        order_updated: false,
        message: 'Payment already completed',
        order: {
          orderId: order.orderId,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus
        }
      });
    }

    // Fetch payments from Razorpay API
    console.log(`🔍 Checking payment status for Razorpay order: ${razorpay_order_id}`);
    const payments = await fetchOrderPayments(razorpay_order_id);

    if (payments.length === 0) {
      return NextResponse.json({
        success: true,
        payment_status: 'pending',
        order_updated: false,
        message: 'No payments found for this order'
      });
    }

    // Check for successful payments
    let paymentStatus = 'pending';
    let orderUpdated = false;

    for (const payment of payments) {
      if (isPaymentSuccessful(payment)) {
        paymentStatus = 'completed';
        console.log(`✅ Found successful payment ${payment.id} for order ${order.orderId}`);
        
        // Update order if payment is successful
        orderUpdated = await updateOrderIfPaymentSuccess(order, payment);
        break; // Found successful payment, no need to check others
      } else if (payment.status === 'failed') {
        paymentStatus = 'failed';
        console.log(`❌ Payment ${payment.id} failed for order ${order.orderId}`);
        // Don't break, continue checking for successful payments
      }
    }

    return NextResponse.json({
      success: true,
      payment_status: paymentStatus,
      order_updated: orderUpdated,
      message: paymentStatus === 'completed' 
        ? 'Payment completed successfully' 
        : paymentStatus === 'failed'
        ? 'Payment failed'
        : 'Payment is still pending',
      order: orderUpdated ? {
        orderId: order.orderId,
        paymentStatus: 'completed',
        orderStatus: 'pending'
      } : {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus
      }
    });

  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check payment status',
        payment_status: 'unknown'
      },
      { status: 500 }
    );
  }
}
