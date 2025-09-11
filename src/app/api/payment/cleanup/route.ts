import { NextRequest, NextResponse } from 'next/server';

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
    const tempOrderStore = (global as any).tempOrderStore;
    if (tempOrderStore && tempOrderStore.has(razorpay_order_id)) {
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
