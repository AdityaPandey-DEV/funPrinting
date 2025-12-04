import { NextRequest, NextResponse } from 'next/server';
import { checkPendingOrdersFromRazorpay } from '@/lib/razorpayFallback';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual payment check triggered');
    
    // Run the Razorpay fallback check
    await checkPendingOrdersFromRazorpay();
    
    return NextResponse.json({
      success: true,
      message: 'Manual payment check completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in manual payment check:', error);
    return NextResponse.json(
      { success: false, error: 'Manual payment check failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Manual payment check endpoint',
    usage: 'Send POST request to trigger payment check',
    endpoints: {
      manual: 'POST /api/manual-check-payments',
      test: 'POST /api/test-razorpay-fallback',
      admin: 'POST /api/admin/check-razorpay-order'
    }
  });
}
