import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import PickupLocation from '@/models/PickupLocation';

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
    const { defaultLocationId } = body;

    await connectDB();

    // Get user by email
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
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
      await user.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      defaultLocationId: user.defaultLocationId || null
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

