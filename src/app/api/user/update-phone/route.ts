import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { validatePhoneNumber, needsCountryCode } from '@/lib/phoneValidation';

export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    let { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    phone = phone.trim();

    // Handle legacy phone numbers (10-digit without country code)
    // Auto-add India country code if it's a 10-digit number
    if (needsCountryCode(phone)) {
      phone = `+91${phone}`;
    }

    // Validate phone number format
    const validation = validatePhoneNumber(phone);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Use validated and formatted phone number
    const formattedPhone = validation.formatted || phone;

    await connectDB();

    // Get user by email
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update phone number with validated format
    user.phone = formattedPhone;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Phone number updated successfully',
      phone: user.phone
    });

  } catch (error) {
    console.error('Error updating phone number:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update phone number' },
      { status: 500 }
    );
  }
}

