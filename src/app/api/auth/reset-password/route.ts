import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { passwordResetStore } from '@/lib/password-reset-store';

// Password validation function
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*)' };
  }
  
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const { token, password, confirmPassword } = await request.json();

    if (!token || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Token, password, and confirm password are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Verify reset token
    const tokenVerification = passwordResetStore.verifyToken(token);
    if (!tokenVerification.valid || !tokenVerification.email) {
      return NextResponse.json(
        { success: false, error: tokenVerification.error || 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by email
    const user = await User.findOne({ 
      email: tokenVerification.email.toLowerCase().trim()
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
    });

    // Delete token (single-use)
    passwordResetStore.deleteToken(token);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}

