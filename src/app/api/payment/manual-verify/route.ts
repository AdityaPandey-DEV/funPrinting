import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Manual payment verification for order:', orderId);

    // Find the order
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.razorpayOrderId) {
      return NextResponse.json(
        { success: false, error: 'No Razorpay order ID found' },
        { status: 400 }
      );
    }

    // Check if already completed
    if (order.paymentStatus === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Payment already completed',
        order: {
          orderId: order.orderId,
          paymentStatus: order.paymentStatus,
          amount: order.amount
        }
      });
    }

    // For manual verification, we'll update the order status
    // In production, you should verify with Razorpay API
    console.log('⚠️ Manual verification - updating order status');
    
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          paymentStatus: 'completed',
          status: 'paid',
          orderStatus: 'pending',
          printStatus: 'pending', // Ready for printing
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    console.log(`✅ Order ${order.orderId} manually verified and marked as paid`);

    return NextResponse.json({
      success: true,
      message: 'Payment manually verified',
      order: {
        orderId: updatedOrder.orderId,
        paymentStatus: updatedOrder.paymentStatus,
        status: updatedOrder.status,
        amount: updatedOrder.amount
      }
    });

  } catch (error) {
    console.error('Error in manual payment verification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
