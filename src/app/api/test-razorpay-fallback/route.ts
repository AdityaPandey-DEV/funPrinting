import { NextRequest, NextResponse } from 'next/server';
import { checkPendingOrdersFromRazorpay, checkSpecificOrderFromRazorpay } from '@/lib/razorpayFallback';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const razorpayOrderId = searchParams.get('razorpayOrderId');
    
    if (razorpayOrderId) {
      // Test specific order
      console.log(`🧪 Testing specific Razorpay order: ${razorpayOrderId}`);
      const success = await checkSpecificOrderFromRazorpay(razorpayOrderId);
      
      return NextResponse.json({
        success: true,
        message: 'Specific order test completed',
        razorpayOrderId,
        orderUpdated: success,
        timestamp: new Date().toISOString()
      });
    } else {
      // Test all pending orders
      console.log('🧪 Testing all pending orders from Razorpay');
      await checkPendingOrdersFromRazorpay();
      
      return NextResponse.json({
        success: true,
        message: 'All pending orders test completed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error in Razorpay fallback test:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType, razorpayOrderId } = body;
    
    switch (testType) {
      case 'specific':
        if (!razorpayOrderId) {
          return NextResponse.json(
            { success: false, error: 'razorpayOrderId is required for specific test' },
            { status: 400 }
          );
        }
        
        console.log(`🧪 Testing specific Razorpay order: ${razorpayOrderId}`);
        const success = await checkSpecificOrderFromRazorpay(razorpayOrderId);
        
        return NextResponse.json({
          success: true,
          message: 'Specific order test completed',
          razorpayOrderId,
          orderUpdated: success,
          timestamp: new Date().toISOString()
        });
        
      case 'all':
        console.log('🧪 Testing all pending orders from Razorpay');
        await checkPendingOrdersFromRazorpay();
        
        return NextResponse.json({
          success: true,
          message: 'All pending orders test completed',
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid test type. Use "specific" or "all"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ Error in Razorpay fallback test:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
