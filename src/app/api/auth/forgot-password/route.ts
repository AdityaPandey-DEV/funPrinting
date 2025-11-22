import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { passwordResetStore } from '@/lib/password-reset-store';
import { sendPasswordResetEmail } from '@/lib/email-verification';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase().trim()
    });

    // Always return success to prevent email enumeration
    // But only send email if user exists and has email provider
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Check if user has email provider (can reset password)
    // Google-only users without password cannot use forgot password
    if (user.provider === 'google' && !user.password) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = passwordResetStore.generateToken(email.toLowerCase().trim());
    
    // Send password reset email
    const emailSent = await sendPasswordResetEmail(
      email.toLowerCase().trim(),
      user.name,
      resetToken
    );

    if (!emailSent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send password reset email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: true, message: 'If an account with that email exists, a password reset link has been sent.' },
      { status: 200 }
    );
  }
}

