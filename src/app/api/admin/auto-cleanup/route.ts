import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET() {
  try {
    await connectDB();
    console.log('🤖 Auto-cleanup: Starting automatic cleanup of failed orders...');

    // Find orders that are older than 2 hours and have payment status 'pending'
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const failedOrders = await Order.find({
      paymentStatus: 'pending',
      createdAt: { $lt: twoHoursAgo }
    });

    console.log(`🔍 Auto-cleanup: Found ${failedOrders.length} failed orders to cleanup`);

    if (failedOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Auto-cleanup: No failed orders found to cleanup',
        removedCount: 0
      });
    }

    // Delete the failed orders
    const deleteResult = await Order.deleteMany({
      paymentStatus: 'pending',
      createdAt: { $lt: twoHoursAgo }
    });

    console.log(`✅ Auto-cleanup: Successfully removed ${deleteResult.deletedCount} failed orders`);

    return NextResponse.json({
      success: true,
      message: `Auto-cleanup: Successfully cleaned up ${deleteResult.deletedCount} failed orders`,
      removedCount: deleteResult.deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Auto-cleanup: Error cleaning up failed orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Auto-cleanup: Failed to cleanup failed orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
