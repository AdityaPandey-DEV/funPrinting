import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET() {
  try {
    await connectDB();
    
    // Get total count of orders
    const totalOrders = await Order.countDocuments();
    
    // Get latest 5 orders
    const latestOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderId createdAt expectedDate printingOptions.serviceOption amount')
      .lean();
    
    console.log('🔍 TEST DB - Total orders:', totalOrders);
    console.log('🔍 TEST DB - Latest orders:', latestOrders);
    
    return NextResponse.json({
      success: true,
      totalOrders,
      latestOrders,
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('❌ TEST DB - Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Database connection failed'
      },
      { status: 500 }
    );
  }
}
