import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { sendPrintJobFromOrder, generateDeliveryNumber } from '@/lib/printerClient';

/**
 * POST /api/printer
 * Send print job to printer API
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { orderId, printerIndex } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is paid
    if (order.paymentStatus !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Order payment not completed' },
        { status: 400 }
      );
    }

    // Check if order has file
    if (!order.fileURL) {
      return NextResponse.json(
        { success: false, error: 'Order has no file to print' },
        { status: 400 }
      );
    }

    // Determine printer index
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
    const selectedPrinterIndex = printerIndex || (printerUrls.length > 0 ? 1 : 1);

    // Generate delivery number if not present
    let deliveryNumber = order.deliveryNumber;
    if (!deliveryNumber) {
      deliveryNumber = generateDeliveryNumber(selectedPrinterIndex);
      await Order.findByIdAndUpdate(order._id, {
        $set: { deliveryNumber }
      });
    }

    // Send print job
    console.log(`🖨️ Sending print job for order ${orderId} to printer ${selectedPrinterIndex}`);
    const result = await sendPrintJobFromOrder(order, selectedPrinterIndex);

    if (result.success && result.deliveryNumber) {
      // Update delivery number from printer API response
      await Order.findByIdAndUpdate(order._id, {
        $set: { deliveryNumber: result.deliveryNumber }
      });
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      jobId: result.jobId,
      deliveryNumber: result.deliveryNumber || deliveryNumber,
      error: result.error
    });
  } catch (error) {
    console.error('Error sending print job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send print job' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/printer/status
 * Get printer API status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const printerIndex = parseInt(searchParams.get('printerIndex') || '1', 10);

    const printerClient = (await import('@/lib/printerClient')).printerClient;
    const health = await printerClient.checkHealth(printerIndex);
    const queueStatus = printerClient.getRetryQueueStatus();

    return NextResponse.json({
      success: true,
      printer: health,
      retryQueue: queueStatus
    });
  } catch (error) {
    console.error('Error getting printer status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get printer status' },
      { status: 500 }
    );
  }
}

