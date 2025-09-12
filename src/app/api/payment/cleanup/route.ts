import { NextRequest, NextResponse } from 'next/server';

// In-memory store for temporary order data with automatic cleanup
const tempOrderStore = new Map<string, { data: any; timestamp: number }>();
const MAX_TEMP_ORDER_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old temporary orders periodically
setInterval(() => {
  const now = Date.now();
  for (const [orderId, { timestamp }] of tempOrderStore.entries()) {
    if (now - timestamp > MAX_TEMP_ORDER_AGE) {
      tempOrderStore.delete(orderId);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpay_order_id } = body;

    if (!razorpay_order_id) {
      return NextResponse.json(
        { success: false, error: 'Razorpay order ID is required' },
        { status: 400 }
      );
    }

    // Clean up temporary order data for failed payments
    if (tempOrderStore.has(razorpay_order_id)) {
      tempOrderStore.delete(razorpay_order_id);
      console.log(`🧹 Cleaned up temporary order data for failed payment: ${razorpay_order_id}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Temporary order data cleaned up successfully',
    });
  } catch (error) {
    console.error('Error cleaning up payment data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup payment data' },
      { status: 500 }
    );
  }
}
