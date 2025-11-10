import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import PrintJob from '@/models/PrintJob';
import { verifyPayment } from '@/lib/razorpay';
import { sendPrintJobFromOrder, generateDeliveryNumber } from '@/lib/printerClient';
import { sendInvoiceEmail } from '@/lib/invoiceEmail';

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

    // Generate delivery number and send print job
    let deliveryNumber = updateResult.deliveryNumber;
    let printJobResult = null;
    
    // Determine printer index from PRINTER_API_URLS array
    let printerUrls: string[] = [];
    const urlsEnv = process.env.PRINTER_API_URLS;
    if (urlsEnv) {
      const trimmed = urlsEnv.trim();
      // Check if it looks like a JSON array (starts with [ and ends with ])
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          printerUrls = JSON.parse(trimmed);
          // Ensure it's an array
          if (!Array.isArray(printerUrls)) {
            printerUrls = [];
          }
        } catch {
          // Invalid JSON array format like [https://...] - extract URL from brackets
          const urlMatch = trimmed.match(/\[(.*?)\]/);
          if (urlMatch && urlMatch[1]) {
            printerUrls = [urlMatch[1].trim()];
          } else {
            printerUrls = [];
          }
        }
      } else {
        // Not a JSON array - treat as comma-separated string or single URL
        printerUrls = trimmed.split(',').map(url => url.trim()).filter(url => url.length > 0);
        // If no commas, treat as single URL
        if (printerUrls.length === 0 && trimmed.length > 0) {
          printerUrls = [trimmed];
        }
      }
    }
    const printerIndex = printerUrls.length > 0 ? 1 : 1; // Default to 1, or use first available

    // Generate delivery number if not present
    if (!deliveryNumber) {
      deliveryNumber = generateDeliveryNumber(printerIndex);
      // Update order with delivery number
      await Order.findByIdAndUpdate(updateResult._id, {
        $set: { deliveryNumber }
      });
      console.log(`✅ Delivery number generated: ${deliveryNumber}`);
    }

    // Send print job to printer API if this is a file order
    if (updateResult.orderType === 'file' && updateResult.fileURL) {
      try {
        console.log(`🖨️ Sending print job to printer API for order: ${updateResult.orderId}`);
        printJobResult = await sendPrintJobFromOrder(updateResult, printerIndex);
        
        if (printJobResult.success && printJobResult.deliveryNumber) {
          // Update delivery number from printer API response
          deliveryNumber = printJobResult.deliveryNumber;
          await Order.findByIdAndUpdate(updateResult._id, {
            $set: { deliveryNumber }
          });
          console.log(`✅ Print job sent successfully. Delivery number: ${deliveryNumber}`);
        } else {
          console.warn(`⚠️ Print job queued but may have failed: ${printJobResult.message}`);
          // Job is in retry queue, will be processed later
        }
      } catch (printJobError) {
        console.error('❌ Error sending print job:', printJobError);
        // Don't fail the order if print job fails - it will be retried
      }
    }

    // Send invoice email immediately after payment verification
    try {
      console.log(`📧 Sending invoice email for order: ${updateResult.orderId}`);
      const invoiceSent = await sendInvoiceEmail(updateResult, deliveryNumber);
      
      if (invoiceSent) {
        console.log(`✅ Invoice email sent successfully to ${updateResult.customerInfo.email}`);
      } else {
        console.warn(`⚠️ Failed to send invoice email, will retry later`);
        // Invoice email failure doesn't block the order
      }
    } catch (invoiceError) {
      console.error('❌ Error sending invoice email:', invoiceError);
      // Invoice email failure doesn't block the order
    }

    // Create print job record in database for tracking
    let printJob = null;
    if (updateResult.orderType === 'file' && updateResult.fileURL) {
      try {
        // Check if print job already exists
        const existingPrintJob = await PrintJob.findOne({ orderId: updateResult._id.toString() });
        if (existingPrintJob) {
          console.log(`ℹ️ Print job already exists for order ${updateResult.orderId}`);
          printJob = existingPrintJob;
        } else {
          console.log('🖨️ Creating print job record for order:', updateResult.orderId);
          
          // Calculate estimated duration
          const estimatedDuration = Math.ceil(
            ((updateResult.printingOptions.pageCount || 1) * updateResult.printingOptions.copies * 0.5) + // 0.5 minutes per page
            (updateResult.printingOptions.color === 'color' ? (updateResult.printingOptions.pageCount || 1) * 0.3 : 0) // Extra time for color
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
            status: printJobResult?.success ? 'printing' : 'pending'
          });

          await printJob.save();
          console.log(`✅ Print job record created: ${printJob.orderNumber}`);
        }
      } catch (printJobError) {
        console.error('Error creating print job record:', printJobError);
        // Don't fail the order if print job record creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order created successfully',
      order: {
        orderId: updateResult.orderId,
        amount: updateResult.amount,
        paymentStatus: updateResult.paymentStatus,
        deliveryNumber: deliveryNumber,
        createdAt: updateResult.createdAt,
      },
      printJob: printJob ? {
        id: printJob._id,
        status: printJob.status,
        estimatedDuration: printJob.estimatedDuration
      } : null,
      invoiceSent: true,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment and create order' },
      { status: 500 }
    );
  }
}
