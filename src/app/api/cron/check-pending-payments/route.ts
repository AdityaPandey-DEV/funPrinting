import { NextRequest, NextResponse } from 'next/server';
import { checkPendingOrdersFromRazorpay } from '@/lib/razorpayFallback';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret) {
      console.error('❌ CRON_SECRET not configured');
      return NextResponse.json(
        { success: false, error: 'Cron secret not configured' },
        { status: 500 }
      );
    }
    
    if (cronSecret !== expectedSecret) {
      console.error('❌ Invalid cron secret');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Cron job triggered: Checking pending payments from Razorpay');
    
    // Run the Razorpay fallback check
    await checkPendingOrdersFromRazorpay();
    
    return NextResponse.json({
      success: true,
      message: 'Pending payments check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in cron job:', error);
    return NextResponse.json(
      { success: false, error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

// Allow manual trigger for testing
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Manual trigger: Checking pending payments from Razorpay');
    
    // Run the Razorpay fallback check
    await checkPendingOrdersFromRazorpay();
    
    return NextResponse.json({
      success: true,
      message: 'Manual pending payments check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in manual check:', error);
    return NextResponse.json(
      { success: false, error: 'Manual check failed' },
      { status: 500 }
    );
  }
}
