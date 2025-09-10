import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function POST() {
  try {
    await connectDB();
    console.log('🧹 Starting cleanup of failed orders...');

    // Find orders that are older than 1 hour and have payment status 'pending'
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const failedOrders = await Order.find({
      paymentStatus: 'pending',
      createdAt: { $lt: oneHourAgo }
    });

    console.log(`🔍 Found ${failedOrders.length} failed orders to cleanup`);

    if (failedOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No failed orders found to cleanup',
        removedCount: 0
      });
    }

    // Delete the failed orders
    const deleteResult = await Order.deleteMany({
      paymentStatus: 'pending',
      createdAt: { $lt: oneHourAgo }
    });

    console.log(`✅ Successfully removed ${deleteResult.deletedCount} failed orders`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${deleteResult.deletedCount} failed orders`,
      removedCount: deleteResult.deletedCount,
      removedOrders: failedOrders.map(order => ({
        orderId: order.orderId,
        createdAt: order.createdAt,
        amount: order.amount
      }))
    });

  } catch (error) {
    console.error('❌ Error cleaning up failed orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cleanup failed orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
