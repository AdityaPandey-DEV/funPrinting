import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AdminInfo from '@/models/AdminInfo';

// POST - Initialize admin with default data
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Check if admin already exists
    const existingAdmin = await AdminInfo.findOne({ isActive: true });
    
    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Admin information already exists'
      }, { status: 400 });
    }
    
    // Create default admin data
    const defaultAdmin = new AdminInfo({
      name: 'PrintService',
      email: 'admin@printservice.com',
      phone: '+91 98765 43210',
      address: 'College Campus',
      city: 'Your City',
      state: 'Your State',
      pincode: '123456',
      country: 'India',
      website: 'https://printservice.com',
      socialMedia: {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        youtube: ''
      },
      businessHours: {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 6:00 PM',
        saturday: '10:00 AM - 4:00 PM',
        sunday: 'Closed'
      },
      description: 'Your trusted printing partner for all academic needs. Fast, reliable, and affordable printing services for college students.',
      logo: '',
      favicon: '',
      isActive: true
    });
    
    await defaultAdmin.save();
    
    return NextResponse.json({
      success: true,
      admin: defaultAdmin,
      message: 'Admin information initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing admin:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initialize admin information' },
      { status: 500 }
    );
  }
}
