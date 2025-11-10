import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import PrintJob from '@/models/PrintJob';
import { sendPrintJobFromOrder, generateDeliveryNumber } from '@/lib/printerClient';

/**
 * Helper function to process orders with completed payment but pending status
 */
async function processCompletedPaymentOrders() {
  try {
    // Find orders with completed payment but pending order status
    const pendingOrders = await Order.find({
      paymentStatus: 'completed',
      orderStatus: 'pending',
      orderType: 'file',
      fileURL: { $exists: true, $ne: null, $nin: [null, ''] }
    }).sort({ createdAt: -1 });

    console.log(`🔍 Checking for orders with completed payment...`);
    console.log(`📊 Found ${pendingOrders.length} orders matching criteria`);

    if (pendingOrders.length === 0) {
      // Log why no orders were found
      const totalCompleted = await Order.countDocuments({ paymentStatus: 'completed' });
      const totalPending = await Order.countDocuments({ orderStatus: 'pending' });
      const totalFileOrders = await Order.countDocuments({ orderType: 'file' });
      console.log(`📊 Stats: ${totalCompleted} completed payments, ${totalPending} pending orders, ${totalFileOrders} file orders`);
      return { processed: 0, skipped: 0, failed: 0 };
    }

    console.log(`🔄 Found ${pendingOrders.length} orders with completed payment but pending status`);
    console.log(`📋 Order IDs: ${pendingOrders.map(o => o.orderId).join(', ')}`);

    // Determine printer index
    let printerUrls: string[] = [];
    const urlsEnv = process.env.PRINTER_API_URLS;
    if (urlsEnv) {
      const trimmed = urlsEnv.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          printerUrls = JSON.parse(trimmed);
          if (!Array.isArray(printerUrls)) printerUrls = [];
        } catch {
          const urlMatch = trimmed.match(/\[(.*?)\]/);
          if (urlMatch && urlMatch[1]) {
            printerUrls = [urlMatch[1].trim()];
          }
        }
      } else {
        printerUrls = trimmed.split(',').map(url => url.trim()).filter(url => url.length > 0);
        if (printerUrls.length === 0 && trimmed.length > 0) {
          printerUrls = [trimmed];
        }
      }
      printerUrls = printerUrls.map(url => url.replace(/\/+$/, ''));
    }
    const printerIndex = printerUrls.length > 0 ? 1 : 1;

    let processed = 0;
    let skipped = 0;
    let failed = 0;
    const failedOrders: Array<{ orderId: string; error: string }> = [];

    for (const order of pendingOrders) {
      try {
        // Check if print job already exists
        const existingPrintJob = await PrintJob.findOne({ orderId: order._id.toString() });
        
        if (existingPrintJob && existingPrintJob.status !== 'pending') {
          // Print job exists and is not pending, just update order status
          await Order.findByIdAndUpdate(order._id, {
            $set: { 
              orderStatus: 'processing',
              status: 'processing'
            }
          });
          skipped++;
          console.log(`⏭️ Skipped order ${order.orderId} - print job already exists`);
          continue;
        }

        // Generate delivery number if not present
        let deliveryNumber = order.deliveryNumber;
        if (!deliveryNumber) {
          deliveryNumber = generateDeliveryNumber(printerIndex);
        }

        // Send print job to printer API
        console.log(`🖨️ Sending print job for order: ${order.orderId}`);
        console.log(`📄 File URL: ${order.fileURL}`);
        console.log(`🖨️ Printer URL: ${printerUrls[printerIndex - 1] || 'Not configured'}`);
        
        const printJobResult = await sendPrintJobFromOrder(order, printerIndex);
        
        console.log(`📊 Print job result for ${order.orderId}:`, {
          success: printJobResult.success,
          message: printJobResult.message,
          error: printJobResult.error,
          jobId: printJobResult.jobId,
          deliveryNumber: printJobResult.deliveryNumber
        });

        // Update delivery number from printer API response if provided
        if (printJobResult.deliveryNumber) {
          deliveryNumber = printJobResult.deliveryNumber;
        }

        // Only update order status if print job was successfully sent
        // If it failed, keep it as pending so it can be retried
        if (printJobResult.success) {
          await Order.findByIdAndUpdate(order._id, {
            $set: { 
              orderStatus: 'processing',
              status: 'processing',
              deliveryNumber
            }
          });
        } else {
          // Keep order as pending if print job failed
          const errorMessage = printJobResult.error || printJobResult.message || 'Unknown error';
          console.warn(`⚠️ Print job failed for order ${order.orderId}, keeping status as pending for retry`);
          console.warn(`⚠️ Error: ${errorMessage}`);
          failedOrders.push({
            orderId: order.orderId,
            error: errorMessage
          });
        }

        // Create or update print job record
        if (!existingPrintJob) {
          const estimatedDuration = Math.ceil(
            ((order.printingOptions.pageCount || 1) * order.printingOptions.copies * 0.5) +
            (order.printingOptions.color === 'color' ? (order.printingOptions.pageCount || 1) * 0.3 : 0)
          );

          const newPrintJob = new PrintJob({
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
            status: printJobResult.success ? 'printing' : 'pending'
          });

          await newPrintJob.save();
        } else {
          // Update existing print job
          await PrintJob.findByIdAndUpdate(existingPrintJob._id, {
            $set: {
              status: printJobResult.success ? 'printing' : 'pending'
            }
          });
        }

        if (printJobResult.success) {
          processed++;
          console.log(`✅ Processed order ${order.orderId} - Status: processing, Delivery: ${deliveryNumber}`);
        } else {
          failed++;
          console.error(`❌ Failed to send print job for order ${order.orderId}: ${printJobResult.error || printJobResult.message}`);
        }
      } catch (error: any) {
        failed++;
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
        console.error(`❌ Error processing order ${order.orderId}:`, error);
        failedOrders.push({
          orderId: order.orderId,
          error: errorMessage
        });
      }
    }

    return { processed, skipped, failed, failedOrders };
  } catch (error) {
    console.error('Error in processCompletedPaymentOrders:', error);
    return { processed: 0, skipped: 0, failed: 0, failedOrders: [] };
  }
}

export async function GET() {
  try {
    await connectDB();
    
    console.log(`🔄 ADMIN API - Starting auto-processing at ${new Date().toISOString()}`);
    
    // Automatically process orders with completed payment but pending status
    const processResult = await processCompletedPaymentOrders();
    
    console.log(`🔄 Auto-processed orders: ${processResult.processed} processed, ${processResult.skipped} skipped, ${processResult.failed} failed`);
    
    if (processResult.processed > 0) {
      console.log(`✅ Successfully processed ${processResult.processed} orders - they should now be in the print queue`);
    }
    
    const orders = await Order.find({}).sort({ createdAt: -1 });
    
    console.log(`🔍 ADMIN API - Fetched ${orders.length} orders from database at ${new Date().toISOString()}`);
    console.log('🔍 ADMIN API - Latest orders:', orders.slice(0, 3).map(o => ({
      orderId: o.orderId,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      createdAt: o.createdAt,
      serviceOption: o.printingOptions?.serviceOption,
      expectedDate: o.expectedDate,
      amount: o.amount
    })));

    let message = 'No orders needed processing';
    if (processResult.processed > 0) {
      message = `✅ Auto-processed ${processResult.processed} orders - they are now in the print queue`;
    } else if (processResult.skipped > 0) {
      message = `⏭️ Skipped ${processResult.skipped} orders (already processed)`;
    } else if (processResult.failed > 0) {
      const failedDetails = processResult.failedOrders?.map(f => `Order ${f.orderId}: ${f.error}`).join('; ') || 'Unknown error';
      message = `⚠️ Failed to process ${processResult.failed} order(s). ${failedDetails}`;
    }

    return NextResponse.json({
      success: true,
      orders,
      timestamp: new Date().toISOString(),
      count: orders.length,
      autoProcessed: processResult,
      message
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
