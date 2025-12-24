import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      favoriteTemplateIds: user.favoriteTemplateIds || []
    });

  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Initialize favoriteTemplateIds if it doesn't exist
    if (!user.favoriteTemplateIds) {
      user.favoriteTemplateIds = [];
    }

    // Add template ID if not already in favorites
    if (!user.favoriteTemplateIds.includes(templateId)) {
      user.favoriteTemplateIds.push(templateId);
      await user.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Template added to favorites',
      favoriteTemplateIds: user.favoriteTemplateIds
    });

  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Initialize favoriteTemplateIds if it doesn't exist
    if (!user.favoriteTemplateIds) {
      user.favoriteTemplateIds = [];
    }

    // Remove template ID from favorites
    user.favoriteTemplateIds = user.favoriteTemplateIds.filter((id: string) => id !== templateId);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Template removed from favorites',
      favoriteTemplateIds: user.favoriteTemplateIds
    });

  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}

