import { NextRequest, NextResponse } from 'next/server';
import { isIphoneSafari } from '@/lib/paymentUtils';

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || '';
    
    // Simulate iPhone Safari detection
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isIphone = isIOS && isSafari;
    
    return NextResponse.json({
      success: true,
      message: 'iPhone Safari Payment Test',
      detection: {
        userAgent,
        isIOS,
        isSafari,
        isIphone,
        detected: isIphone
      },
      paymentFlow: {
        retryAttempts: isIphone ? 5 : 3,
        recoveryWindow: isIphone ? '10 minutes' : '5 minutes',
        enhancedLogging: isIphone,
        cacheHeaders: isIphone
      },
      recommendations: isIphone ? [
        'Using enhanced retry logic (5 attempts)',
        'Extended recovery window (10 minutes)',
        'iPhone Safari specific headers',
        'Enhanced logging enabled',
        'Stability delays for recovery'
      ] : [
        'Standard retry logic (3 attempts)',
        'Standard recovery window (5 minutes)',
        'Standard headers',
        'Standard logging'
      ]
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testPaymentData } = body;
    
    // Simulate payment verification test
    const testResults = {
      localStorage: {
        available: typeof window !== 'undefined',
        testData: {
          orderId: 'TEST-123',
          timestamp: Date.now(),
          isIphoneSafari: true
        }
      },
      retryLogic: {
        maxRetries: 5,
        delays: [2000, 4000, 8000, 16000, 32000], // iPhone Safari delays
        totalMaxTime: '62 seconds'
      },
      recovery: {
        window: '10 minutes',
        stabilityDelay: '2 seconds',
        autoRecovery: true
      }
    };
    
    return NextResponse.json({
      success: true,
      message: 'iPhone Safari Payment Flow Test',
      testResults,
      recommendations: [
        'Payment data will be stored in localStorage',
        'Enhanced retry logic with 5 attempts',
        'Extended recovery window for iPhone Safari',
        'Automatic recovery on page load',
        'Stability delays for better reliability'
      ]
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
