import { NextRequest, NextResponse } from 'next/server';
import { sendNewOrderNotification, testEmailConnection } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing email notification service...');
    
    // Test data
    const testOrderData = {
      orderId: 'TEST-' + Date.now(),
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '+91 9876543210',
      orderType: 'file' as const,
      amount: 50,
      pageCount: 5,
      printingOptions: {
        pageSize: 'A4',
        color: 'bw',
        copies: 2
      },
      deliveryOption: {
        type: 'pickup',
        pickupLocation: 'Test Location'
      },
      createdAt: new Date(),
      paymentStatus: 'pending',
      orderStatus: 'pending_payment',
      fileName: 'test-document.pdf'
    };

    // Test email connection first
    console.log('🧪 Testing email connection...');
    const connectionTest = await testEmailConnection();
    
    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        message: 'Email connection test failed',
        orderId: testOrderData.orderId
      }, { status: 500 });
    }

    console.log('🧪 Sending test notification...');
    const result = await sendNewOrderNotification(testOrderData);
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        orderId: testOrderData.orderId,
        adminEmail: process.env.ADMIN_EMAIL
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test email',
        orderId: testOrderData.orderId
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Test email error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        adminEmail: process.env.ADMIN_EMAIL,
        emailHost: process.env.EMAIL_HOST,
        emailUser: process.env.EMAIL_HOST_USER,
        emailPasswordConfigured: !!process.env.EMAIL_HOST_PASSWORD
      }
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Email test endpoint - use POST to test email notifications',
    environment: {
      adminEmail: process.env.ADMIN_EMAIL,
      emailHost: process.env.EMAIL_HOST,
      emailUser: process.env.EMAIL_HOST_USER,
      emailPasswordConfigured: !!process.env.EMAIL_HOST_PASSWORD,
      emailPort: process.env.EMAIL_PORT
    }
  });
}
