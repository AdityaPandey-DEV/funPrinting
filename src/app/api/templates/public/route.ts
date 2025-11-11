import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { generateFormSchema } from '@/lib/docxProcessor';

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    // Fetch all public templates
    const templates = await DynamicTemplate.find({ isPublic: true })
      .select('id name description category placeholders pdfUrl wordUrl formSchema createdByType createdByEmail createdByName createdAt updatedAt')
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
    console.error('Error fetching public templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

