import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';

export async function GET() {
  try {
    await connectDB();
    
    // Fetch all dynamic templates, sorted by creation date (newest first)
    const templates = await DynamicTemplate.find({})
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();
    
    return NextResponse.json({
      success: true,
      templates,
      message: 'Templates fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
