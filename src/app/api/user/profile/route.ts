import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import PickupLocation from '@/models/PickupLocation';
import { validatePhoneNumber, needsCountryCode } from '@/lib/phoneValidation';
import { sendVerificationEmail } from '@/lib/email-verification';
import VerificationToken from '@/models/VerificationToken';
import crypto from 'crypto';

export async function GET(_request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user by email
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get default location if user has one set
    let defaultLocation = null;
    if (user.defaultLocationId) {
      defaultLocation = await PickupLocation.findById(user.defaultLocationId);
    }

    return NextResponse.json({
      success: true,
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        profilePicture: user.profilePicture || null,
        emailVerified: user.emailVerified,
        provider: user.provider,
        defaultLocationId: user.defaultLocationId || null,
        defaultLocation: defaultLocation ? {
          _id: defaultLocation._id.toString(),
          name: defaultLocation.name,
          address: defaultLocation.address,
          lat: defaultLocation.lat,
          lng: defaultLocation.lng,
          contactPerson: defaultLocation.contactPerson,
          contactPhone: defaultLocation.contactPhone,
          operatingHours: defaultLocation.operatingHours,
          gmapLink: defaultLocation.gmapLink
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { name, email, phone, defaultLocationId } = body;

    await connectDB();

    // Get user by email
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    let emailChanged = false;
    let emailVerificationToken = null;

    // Update name if provided
    if (name !== undefined && name !== null && name.trim() !== '') {
      user.name = name.trim();
    }

    // Update email if provided and different
    if (email !== undefined && email !== null && email.toLowerCase() !== user.email.toLowerCase()) {
      const newEmail = email.toLowerCase().trim();
      
      // Check if email is already taken
      const existingUser = await User.findOne({ email: newEmail });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return NextResponse.json(
          { success: false, error: 'Email is already in use' },
          { status: 400 }
        );
      }

      // Generate verification token for new email
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

      // Delete any existing verification tokens for this email
      await VerificationToken.deleteMany({ email: newEmail });

      // Create new verification token
      await VerificationToken.create({
        token,
        email: newEmail,
        expiresAt,
      });

      // Update user email and mark as unverified
      user.email = newEmail;
      user.emailVerified = false;
      emailChanged = true;
      emailVerificationToken = token;

      // Send verification email
      await sendVerificationEmail(newEmail, user.name, token);
    }

    // Update phone if provided
    if (phone !== undefined && phone !== null) {
      let phoneNumber = phone.trim();
      
      // Handle legacy phone numbers (10-digit without country code)
      if (needsCountryCode(phoneNumber)) {
        phoneNumber = `+91${phoneNumber}`;
      }

      // Validate phone number format
      const validation = validatePhoneNumber(phoneNumber);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error || 'Invalid phone number format' },
          { status: 400 }
        );
      }

      user.phone = validation.formatted || phoneNumber;
    }

    // Update default location if provided
    if (defaultLocationId !== undefined) {
      if (defaultLocationId === null || defaultLocationId === '') {
        // Clear default location
        user.defaultLocationId = undefined;
      } else {
        // Verify location exists
        const location = await PickupLocation.findById(defaultLocationId);
        if (!location) {
          return NextResponse.json(
            { success: false, error: 'Location not found' },
            { status: 404 }
          );
        }
        user.defaultLocationId = defaultLocationId;
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: emailChanged 
        ? 'Profile updated successfully. Please check your email to verify the new email address.'
        : 'Profile updated successfully',
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        emailVerified: user.emailVerified,
        defaultLocationId: user.defaultLocationId || null
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

