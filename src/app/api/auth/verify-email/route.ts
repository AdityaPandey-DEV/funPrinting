import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const tokenDoc = await VerificationToken.findOne({ token });

    if (!tokenDoc) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    if (tokenDoc.expiresAt < new Date()) {
      await VerificationToken.deleteOne({ _id: tokenDoc._id });
      return NextResponse.json(
        { success: false, error: 'Verification token has expired' },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await User.findOne({ 
      email: tokenDoc.email,
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
    await VerificationToken.deleteOne({ _id: tokenDoc._id });

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

    await connectDB();

    const tokenDoc = await VerificationToken.findOne({ token });

    if (!tokenDoc) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    if (tokenDoc.expiresAt < new Date()) {
      await VerificationToken.deleteOne({ _id: tokenDoc._id });
      return NextResponse.json(
        { success: false, error: 'Verification token has expired' },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await User.findOne({ 
      email: tokenDoc.email,
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
    await VerificationToken.deleteOne({ _id: tokenDoc._id });

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
