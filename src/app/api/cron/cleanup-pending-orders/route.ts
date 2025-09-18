import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { checkPendingOrdersFromRazorpay } from '@/lib/razorpayFallback';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you can add authentication here)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Find orders that are pending payment for more than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pendingOrders = await Order.find({
      paymentStatus: 'pending',
      status: 'pending_payment',
      createdAt: { $lt: twentyFourHoursAgo }
    });

    console.log(`🕐 Cron job: Found ${pendingOrders.length} pending orders to cleanup`);

    // 🔄 FIRST: Check Razorpay for successful payments before cleanup
    console.log('🔄 Checking Razorpay for successful payments...');
    try {
      await checkPendingOrdersFromRazorpay();
      console.log('✅ Razorpay payment check completed');
    } catch (error) {
      console.error('❌ Error checking Razorpay payments:', error);
    }

    let cleanedCount = 0;
    for (const order of pendingOrders) {
      try {
        // Update order status to cancelled
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.orderStatus = 'pending';
        
        await order.save();
        cleanedCount++;
        
        console.log(`❌ Cron job: Cancelled pending order: ${order.orderId} (created: ${order.createdAt})`);
      } catch (error) {
        console.error(`❌ Cron job: Error cancelling order ${order.orderId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron job cleaned up ${cleanedCount} pending orders`,
      cleanedCount,
      totalFound: pendingOrders.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      { success: false, error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
