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
  notes: {
    amount?: string;
    customerName?: string;
    orderType?: string;
    pageCount?: string;
  };
  created_at: number;
  captured: boolean;
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
  notes: {
    amount?: string;
    customerName?: string;
    orderType?: string;
    pageCount?: string;
  };
}

// Fetch payment details from Razorpay API
async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment | null> {
  try {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    
    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch payment ${paymentId}: ${response.status}`);
      return null;
    }

    const payment = await response.json();
    return payment;
  } catch (error) {
    console.error(`❌ Error fetching payment ${paymentId}:`, error);
    return null;
  }
}

// Fetch order details from Razorpay API
async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrder | null> {
  try {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    
    const response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch order ${orderId}: ${response.status}`);
      return null;
    }

    const order = await response.json();
    return order;
  } catch (error) {
    console.error(`❌ Error fetching order ${orderId}:`, error);
    return null;
  }
}

// Get all payments for a specific order from Razorpay
async function fetchOrderPayments(orderId: string): Promise<RazorpayPayment[]> {
  try {
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

// Check if payment is successful based on Razorpay data
function isPaymentSuccessful(payment: RazorpayPayment): boolean {
  return payment.status === 'captured' && payment.captured === true;
}

// Extract order ID from Razorpay description
function extractOrderIdFromDescription(description: string): string | null {
  const match = description.match(/Order #(\w+)/);
  return match ? match[1] : null;
}

// Update order status in database
async function updateOrderStatus(orderId: string, paymentId: string, amount: number): Promise<boolean> {
  try {
    await connectDB();
    
    const order = await Order.findOne({ orderId });
    if (!order) {
      console.error(`❌ Order not found: ${orderId}`);
      return false;
    }

    // Check if already processed
    if (order.paymentStatus === 'completed' && order.razorpayPaymentId === paymentId) {
      console.log(`ℹ️ Order ${orderId} already processed for payment ${paymentId}`);
      return true;
    }

    // Update order with payment details
    const updateResult = await Order.findOneAndUpdate(
      { 
        _id: order._id, 
        paymentStatus: { $ne: 'completed' } // Only update if not already completed
      },
      {
        $set: {
          paymentStatus: 'completed',
          razorpayPaymentId: paymentId,
          status: 'paid',
          orderStatus: 'pending', // Ready for processing
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updateResult) {
      console.log(`ℹ️ Order ${orderId} already processed or not found`);
      return true; // Consider this success since order is already processed
    }

    console.log(`✅ Order ${orderId} updated to paid status via Razorpay fallback`);

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
          (updateResult.printingOptions.pageCount * updateResult.printingOptions.copies * 0.5) + // 0.5 minutes per page
          (updateResult.printingOptions.color === 'color' ? updateResult.printingOptions.pageCount * 0.3 : 0) // Extra time for color
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
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Error updating order ${orderId}:`, error);
    return false;
  }
}

// Main function to check and update pending orders
export async function checkPendingOrdersFromRazorpay(): Promise<void> {
  try {
    console.log('🔄 Starting Razorpay fallback check for pending orders...');
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('❌ Razorpay credentials not configured');
      return;
    }

    await connectDB();
    
    // Find all pending payment orders
    const pendingOrders = await Order.find({
      paymentStatus: 'pending',
      status: 'pending_payment',
      razorpayOrderId: { $exists: true, $ne: null }
    });

    console.log(`📋 Found ${pendingOrders.length} pending orders to check`);

    let updatedCount = 0;

    for (const order of pendingOrders) {
      try {
        console.log(`🔍 Checking order: ${order.orderId} (Razorpay: ${order.razorpayOrderId})`);
        
        // Get all payments for this order
        const payments = await fetchOrderPayments(order.razorpayOrderId);
        
        if (payments.length === 0) {
          console.log(`ℹ️ No payments found for order ${order.orderId}`);
          continue;
        }

        // Check each payment
        for (const payment of payments) {
          if (isPaymentSuccessful(payment)) {
            console.log(`✅ Found successful payment ${payment.id} for order ${order.orderId}`);
            
            // Verify the payment amount matches
            const expectedAmount = Math.round(order.amount * 100); // Convert to paise
            if (payment.amount !== expectedAmount) {
              console.warn(`⚠️ Payment amount mismatch for order ${order.orderId}: expected ${expectedAmount}, got ${payment.amount}`);
              // Continue anyway as this could be due to rounding differences
            }

            // Update order status
            const success = await updateOrderStatus(order.orderId, payment.id, payment.amount);
            if (success) {
              updatedCount++;
              console.log(`✅ Successfully updated order ${order.orderId} via Razorpay fallback`);
            }
            break; // Found successful payment, no need to check others
          }
        }
      } catch (error) {
        console.error(`❌ Error checking order ${order.orderId}:`, error);
      }
    }

    console.log(`🎉 Razorpay fallback check completed. Updated ${updatedCount} orders.`);
  } catch (error) {
    console.error('❌ Error in Razorpay fallback check:', error);
  }
}

// Function to check a specific order by Razorpay order ID
export async function checkSpecificOrderFromRazorpay(razorpayOrderId: string): Promise<boolean> {
  try {
    console.log(`🔍 Checking specific order from Razorpay: ${razorpayOrderId}`);
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('❌ Razorpay credentials not configured');
      return false;
    }

    // Get all payments for this order
    const payments = await fetchOrderPayments(razorpayOrderId);
    
    if (payments.length === 0) {
      console.log(`ℹ️ No payments found for Razorpay order ${razorpayOrderId}`);
      return false;
    }

    // Check each payment
    for (const payment of payments) {
      if (isPaymentSuccessful(payment)) {
        console.log(`✅ Found successful payment ${payment.id} for Razorpay order ${razorpayOrderId}`);
        
        // Extract order ID from description
        const orderId = extractOrderIdFromDescription(payment.description);
        if (!orderId) {
          console.error(`❌ Could not extract order ID from payment description: ${payment.description}`);
          continue;
        }

        // Update order status
        const success = await updateOrderStatus(orderId, payment.id, payment.amount);
        if (success) {
          console.log(`✅ Successfully updated order ${orderId} via Razorpay fallback`);
          return true;
        }
        break; // Found successful payment, no need to check others
      }
    }

    return false;
  } catch (error) {
    console.error(`❌ Error checking specific order ${razorpayOrderId}:`, error);
    return false;
  }
}
