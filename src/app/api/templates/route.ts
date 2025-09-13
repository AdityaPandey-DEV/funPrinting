import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { generateFormSchema } from '@/lib/docxProcessor';

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    // Get all dynamic templates
    const templates = await DynamicTemplate.find({})
      .select('id name description category placeholders pdfUrl wordUrl createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Generate form schemas for each template
    const templatesWithSchemas = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      placeholders: template.placeholders,
      formSchema: generateFormSchema(template.placeholders),
      pdfUrl: template.pdfUrl,
      wordUrl: template.wordUrl,
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
