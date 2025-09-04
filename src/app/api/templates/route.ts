import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get all dynamic templates
    const templates = await DynamicTemplate.find({})
      .select('id name description category placeholders createdAt updatedAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      templates: templates
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
