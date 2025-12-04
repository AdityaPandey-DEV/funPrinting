import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { getCurrentUser } from '@/lib/templateAuth';
import User from '@/models/User';
import { generateFormSchema } from '@/lib/docxProcessor';

export async function GET(_request: NextRequest) {
  try {
    // Get current user from session
    const session = await getCurrentUser();
    if (!session || !session.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user details
    const user = await User.findOne({ email: session.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch user's own templates
    const templates = await DynamicTemplate.find({
      $or: [
        { createdByUserId: user._id },
        { createdByEmail: user.email.toLowerCase() }
      ]
    })
      .select('id name description category placeholders pdfUrl wordUrl formSchema isPublic createdByType createdByEmail createdByName isPaid price allowFreeDownload createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Generate form schemas for each template
    const templatesWithSchemas = templates.map(template => ({
      id: template.id,
      _id: template._id.toString(),
      name: template.name,
      description: template.description,
      category: template.category,
      placeholders: template.placeholders,
      formSchema: template.formSchema || generateFormSchema(template.placeholders),
      pdfUrl: template.pdfUrl,
      wordUrl: template.wordUrl,
      isPublic: template.isPublic,
      createdByType: template.createdByType,
      createdByEmail: template.createdByEmail,
      createdByName: template.createdByName,
      isPaid: template.isPaid || false,
      price: template.price || 0,
      allowFreeDownload: template.allowFreeDownload !== false,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));

    return NextResponse.json({
      success: true,
      templates: templatesWithSchemas
    });

  } catch (error) {
    console.error('Error fetching user templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

