import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { emailVerificationStore } from '@/lib/email-verification';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Verify the token
    const verificationResult = emailVerificationStore.verifyToken(token);
    
    if (!verificationResult.valid) {
      return NextResponse.json(
        { success: false, error: verificationResult.error },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the user by email
    const user = await User.findOne({ 
      email: verificationResult.email,
      provider: 'email'
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email is already verified',
        alreadyVerified: true,
      });
    }

    // Update user's email verification status
    await User.findByIdAndUpdate(user._id, { 
      emailVerified: true 
    });

    // Remove the verification token
    emailVerificationStore.deleteToken(token);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now sign in to your account.',
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}

// Handle GET requests for direct link verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Verify the token
    const verificationResult = emailVerificationStore.verifyToken(token);
    
    if (!verificationResult.valid) {
      return NextResponse.json(
        { success: false, error: verificationResult.error },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the user by email
    const user = await User.findOne({ 
      email: verificationResult.email,
      provider: 'email'
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email is already verified',
        alreadyVerified: true,
      });
    }

    // Update user's email verification status
    await User.findByIdAndUpdate(user._id, { 
      emailVerified: true 
    });

    // Remove the verification token
    emailVerificationStore.deleteToken(token);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now sign in to your account.',
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}
