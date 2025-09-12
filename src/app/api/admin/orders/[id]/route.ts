import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { validateOrderStateTransition, logOrderEvent, OrderStatus } from '@/lib/orderUtils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await context.params;
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await context.params;
    const body = await request.json();
    const { orderStatus } = body;
    
    if (!orderStatus) {
      return NextResponse.json(
        { success: false, error: 'Order status is required' },
        { status: 400 }
      );
    }

    // Get current order to validate state transition
    const currentOrder = await Order.findById(id);
    if (!currentOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Validate state transition
    const currentStatus = currentOrder.status as OrderStatus || 'pending_payment';
    const newStatus = orderStatus as OrderStatus;
    
    const transition = validateOrderStateTransition(currentStatus, newStatus);
    if (!transition.allowed) {
      logOrderEvent('invalid_state_transition', currentOrder.orderId, {
        from: currentStatus,
        to: newStatus,
        reason: transition.reason
      }, 'warn');
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid status transition: ${transition.reason}` 
        },
        { status: 400 }
      );
    }

    // Update order status
    const order = await Order.findByIdAndUpdate(
      id,
      { 
        orderStatus,
        status: newStatus, // Also update the unified status field
        updatedAt: new Date()
      },
      { new: true }
    );

    logOrderEvent('status_updated', order.orderId, {
      from: currentStatus,
      to: newStatus,
      updatedBy: 'admin'
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await context.params;
    
    const order = await Order.findByIdAndDelete(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    console.log(`Order ${order.orderId} deleted successfully`);
    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
      orderId: order.orderId,
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
