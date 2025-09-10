import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET() {
  try {
    await connectDB();
    
    const orders = await Order.find({}).sort({ expectedDate: 1, createdAt: -1 });
    
    console.log(`🔍 ADMIN API - Fetched ${orders.length} orders from database`);
    console.log('🔍 ADMIN API - Latest orders:', orders.slice(0, 3).map(o => ({
      orderId: o.orderId,
      createdAt: o.createdAt,
      serviceOption: o.printingOptions?.serviceOption,
      expectedDate: o.expectedDate,
      amount: o.amount
    })));

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
