import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PickupLocation from '@/models/PickupLocation';

// GET - Fetch active pickup locations (public route for order page)
export async function GET() {
  try {
    await connectDB();
    
    // Get default location first, then other active locations
    const locations = await PickupLocation.find({ isActive: true })
      .sort({ isDefault: -1, createdAt: -1 });
    
    // Find default location
    const defaultLocation = locations.find(loc => loc.isDefault);
    
    return NextResponse.json({
      success: true,
      locations,
      defaultLocation,
    });
  } catch (error) {
    console.error('Error fetching pickup locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pickup locations' },
      { status: 500 }
    );
  }
}
