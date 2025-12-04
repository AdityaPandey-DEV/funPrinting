import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { generateFormSchema } from '@/lib/docxProcessor';
import { getCurrentUser } from '@/lib/templateAuth';
import User from '@/models/User';

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    // Get current user from session
    const session = await getCurrentUser();
    let userId = null;
    let userEmail = null;

    if (session?.email) {
      const user = await User.findOne({ email: session.email.toLowerCase() });
      if (user) {
        userId = user._id.toString();
        userEmail = user.email.toLowerCase();
      }
    }

    // Build query: public templates OR user's own templates
    const query: any = {
      $or: [
        { isPublic: true }
      ]
    };

    // Add user's own templates if authenticated
    if (userId || userEmail) {
      const userQuery: any[] = [];
      if (userId) {
        userQuery.push({ createdByUserId: userId });
      }
      if (userEmail) {
        userQuery.push({ createdByEmail: userEmail });
      }
      if (userQuery.length > 0) {
        query.$or.push({ $or: userQuery });
      }
    }

    // Get templates matching the query
    const templates = await DynamicTemplate.find(query)
      .select('id name description category placeholders pdfUrl wordUrl formSchema isPublic createdByType createdByEmail createdByName createdAt updatedAt')
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
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));

    return NextResponse.json({
      success: true,
      templates: templatesWithSchemas
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
