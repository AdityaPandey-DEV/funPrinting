import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp-store';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();
    
    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Get stored OTP data
    const storedData = otpStore.get(email);
    console.log(`🔍 Looking for OTP for ${email}`);
    console.log(`📊 Current OTP store size: ${otpStore.getStoreSize()}`);
    console.log(`🔐 Stored data:`, storedData);
    
    if (!storedData) {
      return NextResponse.json(
        { success: false, error: 'OTP expired or not found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if OTP is expired (10 minutes)
    if (otpStore.isExpired(storedData.timestamp)) {
      otpStore.delete(email);
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP. Please check and try again.' },
        { status: 400 }
      );
    }

    // OTP is valid - remove it from store
    otpStore.delete(email);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
