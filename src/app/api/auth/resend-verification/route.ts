import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { sendVerificationEmail } from '@/lib/email-verification';

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

    const normalizedEmail = email.toLowerCase().trim();

    // Find the user by email
    const user = await User.findOne({ 
      email: normalizedEmail,
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

    // Generate new verification token and store in MongoDB
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await VerificationToken.deleteMany({ email: normalizedEmail });
    await VerificationToken.create({
      token,
      email: normalizedEmail,
      expiresAt,
    });
    
    // Send verification email
    const emailSent = await sendVerificationEmail(
      normalizedEmail,
      user.name,
      token
    );

    if (!emailSent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully. Please check your inbox.',
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}
