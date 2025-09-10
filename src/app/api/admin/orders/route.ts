import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET() {
  try {
    await connectDB();
    
    const orders = await Order.find({}).sort({ createdAt: -1, expectedDate: 1 });
    
    console.log(`🔍 ADMIN API - Fetched ${orders.length} orders from database at ${new Date().toISOString()}`);
    console.log('🔍 ADMIN API - Latest orders:', orders.slice(0, 5).map(o => ({
      orderId: o.orderId,
      createdAt: o.createdAt,
      serviceOption: o.printingOptions?.serviceOption,
      expectedDate: o.expectedDate,
      amount: o.amount
    })));
    
    // Check if ORD000027 exists in the results
    const order027 = orders.find(o => o.orderId === 'ORD000027');
    if (order027) {
      console.log('🔍 ADMIN API - Found ORD000027:', {
        orderId: order027.orderId,
        createdAt: order027.createdAt,
        serviceOption: order027.printingOptions?.serviceOption,
        expectedDate: order027.expectedDate,
        amount: order027.amount
      });
    } else {
      console.log('❌ ADMIN API - ORD000027 NOT FOUND in results');
    }

    return NextResponse.json({
      success: true,
      orders,
      timestamp: new Date().toISOString(),
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
