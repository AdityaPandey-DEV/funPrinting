import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import PrintLog from '@/models/PrintLog';
import { validatePrintTransition } from '@/utils/printStateMachine';

/**
 * Verify admin authentication
 * For now, we'll accept admin email from request header or body
 * In production, you should use proper session/JWT authentication
 */
async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; adminEmail?: string }> {
  try {
    // Get admin email from header or body
    const adminEmail = request.headers.get('x-admin-email') || 
                      (await request.json().catch(() => ({}))).adminEmail;

    if (!adminEmail) {
      return { isAdmin: false };
    }

    // For now, check against environment variable or hardcoded admin email
    const allowedAdminEmail = process.env.ADMIN_EMAIL || 'adityapandey.dev.in@gmail.com';
    
    if (adminEmail.toLowerCase() === allowedAdminEmail.toLowerCase()) {
      return { isAdmin: true, adminEmail: adminEmail.toLowerCase() };
    }

    return { isAdmin: false };
  } catch (error) {
    console.error('Error verifying admin:', error);
    return { isAdmin: false };
  }
}

/**
 * Log admin action
 */
async function logAction(
  action: string,
  orderId: string,
  adminEmail: string,
  previousStatus?: string,
  newStatus?: string,
  reason?: string,
  printJobId?: string
): Promise<void> {
  try {
    await connectDB();
    
    // Get printJobId from order if not provided
    let jobId = printJobId;
    if (!jobId) {
      const order = await Order.findOne({ orderId });
      jobId = order?.printJobId;
    }
    
    const log = new PrintLog({
      action,
      orderId,
      printJobId: jobId,
      adminEmail,
      previousStatus,
      newStatus,
      reason,
      timestamp: new Date(),
    });
    await log.save();
  } catch (error) {
    console.error('Error logging action:', error);
  }
}

/**
 * POST /api/admin/print-actions/reprint
 * Reset order to pending for reprinting
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const previousStatus = order.printStatus;

    // Safety guard: Cannot reprint if currently printing
    if (order.printStatus === 'printing') {
      return NextResponse.json(
        { success: false, error: 'Cannot reprint an order that is currently printing. Reset it first.' },
        { status: 400 }
      );
    }

    // Validate state transition
    const transitionValidation = validatePrintTransition(previousStatus, 'pending', true);
    if (!transitionValidation.allowed) {
      return NextResponse.json(
        { success: false, error: `Invalid state transition: ${transitionValidation.reason}` },
        { status: 400 }
      );
    }

    // Reset to pending
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        printStatus: 'pending',
        printError: undefined,
      },
      $unset: {
        printStartedAt: '',
        printCompletedAt: '',
        printerId: '',
        printerName: '',
        printingBy: '',
        printJobId: '',
        printingHeartbeatAt: '',
      },
    });

    // Log action
    await logAction('reprint', orderId, auth.adminEmail!, previousStatus, 'pending', reason, order.printJobId);

    return NextResponse.json({
      success: true,
      message: 'Order reset to pending for reprinting',
    });
  } catch (error) {
    console.error('Error in reprint action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/print-actions/cancel
 * Cancel a pending order
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.printStatus !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending orders can be cancelled' },
        { status: 400 }
      );
    }

    const previousStatus = order.printStatus;

    // Cancel order
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        printStatus: undefined, // Remove print status
        orderStatus: 'cancelled',
        status: 'cancelled',
      },
    });

    // Log action
    await logAction('cancel', orderId, auth.adminEmail!, previousStatus, 'cancelled', reason, order.printJobId);

    return NextResponse.json({
      success: true,
      message: 'Order cancelled',
    });
  } catch (error) {
    console.error('Error in cancel action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/print-actions/reset
 * Reset order from 'printing' to 'pending' (manual override)
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.printStatus !== 'printing') {
      return NextResponse.json(
        { success: false, error: 'Only printing orders can be reset' },
        { status: 400 }
      );
    }

    const previousStatus = order.printStatus;

    // Validate state transition
    const transitionValidation = validatePrintTransition(previousStatus, 'pending', true);
    if (!transitionValidation.allowed) {
      return NextResponse.json(
        { success: false, error: `Invalid state transition: ${transitionValidation.reason}` },
        { status: 400 }
      );
    }

    // Reset to pending
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        printStatus: 'pending',
        printError: reason || 'Manually reset by admin',
      },
      $unset: {
        printStartedAt: '',
        printerId: '',
        printerName: '',
        printingBy: '',
        printJobId: '',
        printingHeartbeatAt: '',
      },
    });

    // Log action
    await logAction('reset_state', orderId, auth.adminEmail!, previousStatus, 'pending', reason, order.printJobId);

    return NextResponse.json({
      success: true,
      message: 'Order reset to pending',
    });
  } catch (error) {
    console.error('Error in reset action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/print-actions/force-printed
 * Force mark order as printed (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, reason, confirmed } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Safety guard: Require confirmation for force printed
    if (!confirmed) {
      return NextResponse.json(
        { success: false, error: 'Confirmation required for force-printed action. Set confirmed: true.' },
        { status: 400 }
      );
    }

    // Safety guard: Reason is mandatory for force printed
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Reason is required for force-printed action' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const previousStatus = order.printStatus;

    // Validate state transition
    const transitionValidation = validatePrintTransition(previousStatus, 'printed', true);
    if (!transitionValidation.allowed) {
      return NextResponse.json(
        { success: false, error: `Invalid state transition: ${transitionValidation.reason}` },
        { status: 400 }
      );
    }

    // Force mark as printed
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        printStatus: 'printed',
        printCompletedAt: new Date(),
        printError: undefined,
      },
      $unset: {
        printingBy: '',
        printingHeartbeatAt: '',
      },
    });

    // Log action
    await logAction('force_printed', orderId, auth.adminEmail!, previousStatus, 'printed', reason, order.printJobId);

    return NextResponse.json({
      success: true,
      message: 'Order marked as printed',
    });
  } catch (error) {
    console.error('Error in force-printed action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

