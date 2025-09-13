import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function POST(_request: NextRequest) {
  try {
    await connectDB();
    
    // Find orders that are pending payment for more than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pendingOrders = await Order.find({
      paymentStatus: 'pending',
      status: 'pending_payment',
      createdAt: { $lt: twentyFourHoursAgo }
    });

    console.log(`🧹 Found ${pendingOrders.length} pending orders to cleanup`);

    let cleanedCount = 0;
    for (const order of pendingOrders) {
      try {
        // Update order status to cancelled
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.orderStatus = 'pending';
        
        await order.save();
        cleanedCount++;
        
        console.log(`❌ Cancelled pending order: ${order.orderId} (created: ${order.createdAt})`);
      } catch (error) {
        console.error(`❌ Error cancelling order ${order.orderId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedCount} pending orders`,
      cleanedCount,
      totalFound: pendingOrders.length
    });

  } catch (error) {
    console.error('❌ Error cleaning up pending orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup pending orders' },
      { status: 500 }
    );
  }
}

// GET endpoint to check pending orders status
export async function GET(_request: NextRequest) {
  try {
    await connectDB();
    
    // Find orders that are pending payment for more than 20 hours (to show upcoming cancellations)
    const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
    
    const pendingOrders = await Order.find({
      paymentStatus: 'pending',
      status: 'pending_payment',
      createdAt: { $lt: twentyHoursAgo }
    }).select('orderId createdAt customerInfo.name amount razorpayOrderId');

    return NextResponse.json({
      success: true,
      pendingOrders: pendingOrders.map(order => ({
        orderId: order.orderId,
        customerName: order.customerInfo.name,
        amount: order.amount,
        createdAt: order.createdAt,
        razorpayOrderId: order.razorpayOrderId,
        pendingMinutes: Math.floor((Date.now() - order.createdAt.getTime()) / (1000 * 60))
      })),
      count: pendingOrders.length
    });

  } catch (error) {
    console.error('❌ Error fetching pending orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending orders' },
      { status: 500 }
    );
  }
}
