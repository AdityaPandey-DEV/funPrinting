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
    
    console.log(`🔄 Admin updating order ${id} status to: ${orderStatus}`);
    
    if (!orderStatus) {
      console.log('❌ No orderStatus provided in request body');
      return NextResponse.json(
        { success: false, error: 'Order status is required' },
        { status: 400 }
      );
    }

    // Get current order to validate state transition
    const currentOrder = await Order.findById(id);
    if (!currentOrder) {
      console.log(`❌ Order ${id} not found`);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    console.log(`📋 Current order status: ${currentOrder.status}, orderStatus: ${currentOrder.orderStatus}`);

    // Validate orderStatus values (different from status field)
    const validOrderStatuses = ['pending', 'printing', 'dispatched', 'delivered'];
    if (!validOrderStatuses.includes(orderStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid orderStatus: ${orderStatus}. Valid values are: ${validOrderStatuses.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Map orderStatus to corresponding status field value
    const statusMapping: Record<string, string> = {
      'pending': 'processing',
      'printing': 'printing', 
      'dispatched': 'dispatched',
      'delivered': 'delivered'
    };
    
    const newStatus = statusMapping[orderStatus] || 'processing';
    
    console.log(`🔄 Mapping orderStatus '${orderStatus}' to status '${newStatus}'`);
    
    // Validate state transition for the status field
    const currentStatus = currentOrder.status as OrderStatus || 'pending_payment';
    const transition = validateOrderStateTransition(currentStatus, newStatus as OrderStatus);
    
    // Allow admin to override certain transitions for flexibility
    const adminOverrideTransitions = [
      'pending_payment -> processing',  // Allow admin to move from payment to processing
      'paid -> processing',             // Allow admin to move from paid to processing
      'processing -> printing',         // Allow admin to move from processing to printing
      'printing -> dispatched',         // Allow admin to move from printing to dispatched
      'dispatched -> delivered'         // Allow admin to move from dispatched to delivered
    ];
    
    const transitionKey = `${currentStatus} -> ${newStatus}`;
    const isAdminOverride = adminOverrideTransitions.includes(transitionKey);
    
    if (!transition.allowed && !isAdminOverride) {
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
    
    if (isAdminOverride) {
      console.log(`🔓 Admin override allowed for transition: ${transitionKey}`);
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
      orderStatus: orderStatus,
      updatedBy: 'admin'
    });

    console.log(`✅ Order ${order.orderId} status updated successfully: ${currentStatus} -> ${newStatus} (orderStatus: ${orderStatus})`);

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
