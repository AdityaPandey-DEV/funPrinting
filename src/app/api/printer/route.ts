import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import PrintLog from '@/models/PrintLog';
import { validatePrintTransition } from '@/utils/printStateMachine';

/**
 * POST /api/printer
 * Add order to printing queue by setting printStatus to 'pending'
 * The printing server will automatically pick it up from MongoDB
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { orderId } = body;

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

    // Check if order has file(s) - support both single file and multiple files
    const hasMultipleFiles = order.fileURLs && order.fileURLs.length > 0;
    const hasSingleFile = order.fileURL && !hasMultipleFiles;
    
    if (!hasMultipleFiles && !hasSingleFile) {
      return NextResponse.json(
        { success: false, error: 'Order has no file to print' },
        { status: 400 }
      );
    }

    // Validate state transition
    const currentStatus = order.printStatus || 'pending';
    const transitionValidation = validatePrintTransition(currentStatus, 'pending');
    
    if (!transitionValidation.allowed && currentStatus !== 'pending') {
      // If already printing or printed, allow reset to pending (reprint)
      if (currentStatus === 'printing' || currentStatus === 'printed') {
        // Allow reset to pending for reprint
      } else {
        return NextResponse.json(
          { success: false, error: `Cannot set print status: ${transitionValidation.reason}` },
          { status: 400 }
        );
      }
    }

    // Set printStatus to 'pending' - printing server will pick it up automatically
    const updateResult = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          printStatus: 'pending',
          printError: undefined, // Clear any previous errors
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updateResult) {
      return NextResponse.json(
        { success: false, error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Log the action
    try {
      await PrintLog.create({
        action: 'admin_print_request',
        orderId: order.orderId,
        previousStatus: currentStatus,
        newStatus: 'pending',
        reason: 'Admin manually triggered print via print button',
        timestamp: new Date(),
        metadata: { source: 'admin_dashboard' }
      });
    } catch (logError) {
      console.error('Error logging print action:', logError);
      // Don't fail the request if logging fails
    }

    console.log(`✅ Order ${orderId} added to printing queue (printStatus: 'pending')`);

    return NextResponse.json({
      success: true,
      message: 'Order added to printing queue. Printing server will process it automatically.',
      orderId: order.orderId,
      printStatus: 'pending'
    });
  } catch (error) {
    console.error('Error adding order to print queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add order to print queue' },
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

