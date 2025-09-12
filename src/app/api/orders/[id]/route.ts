import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id: orderId } = await params;
    console.log(`🗑️ Attempting to delete order with ID: ${orderId}`);
    
    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      console.log(`❌ Order not found with ID: ${orderId}`);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log(`📋 Found order: ${order.orderId}, paymentStatus: ${order.paymentStatus}, status: ${order.status}`);

    // Only allow deletion of pending payment orders
    if (order.paymentStatus !== 'pending' || order.status !== 'pending_payment') {
      console.log(`❌ Order ${order.orderId} cannot be cancelled - not in pending payment state`);
      return NextResponse.json(
        { success: false, error: 'Only pending payment orders can be cancelled' },
        { status: 400 }
      );
    }

    // Delete the order
    await Order.findByIdAndDelete(orderId);
    
    console.log(`✅ Order ${order.orderId} cancelled by user`);
    
    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id: orderId } = await params;
    
    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}