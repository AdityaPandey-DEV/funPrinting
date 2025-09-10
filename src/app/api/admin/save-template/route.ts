import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { extractPlaceholders, generateFormSchema } from '@/lib/docxProcessor';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      category, 
      pdfUrl, 
      docxUrl,
      placeholders: manualPlaceholders,
      formSchema: manualFormSchema
    } = body;

    if (!name || !description || !category || !pdfUrl || !docxUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, description, category, pdfUrl, docxUrl' },
        { status: 400 }
      );
    }

    console.log(`Saving template: ${name}`);

    // Download DOCX from Cloudinary to extract placeholders
    let placeholders: string[] = [];
    let formSchema: any[] = [];
    const normalizedDocxUrl = docxUrl;

    try {
      // Fetch DOCX content from Cloudinary
      const response = await fetch(docxUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch DOCX from Cloudinary');
      }
      
      const docxBuffer = Buffer.from(await response.arrayBuffer());
      
      // Extract placeholders from the DOCX buffer
      placeholders = await extractPlaceholders(docxBuffer);
      
      // If no placeholders found in content, use manual placeholders if provided
      if (placeholders.length === 0 && manualPlaceholders && manualPlaceholders.length > 0) {
        placeholders = manualPlaceholders;
      }
      
      // Generate form schema from placeholders
      if (placeholders.length > 0) {
        const schemaObject = generateFormSchema(placeholders);
        formSchema = Object.entries(schemaObject).map(([key, value]) => ({
          key,
          ...value
        }));
      }
      
    } catch (error) {
      console.error('Error processing DOCX:', error);
      // If we can't process the DOCX, use manual data if provided
      if (manualPlaceholders && manualPlaceholders.length > 0) {
        placeholders = manualPlaceholders;
        if (manualFormSchema) {
          formSchema = manualFormSchema;
        } else {
          const schemaObject = generateFormSchema(placeholders);
          formSchema = Object.entries(schemaObject).map(([key, value]) => ({
            key,
            ...value
          }));
        }
      }
    }

    // Connect to database
    await connectDB();

    // Create template ID
    const templateId = uuidv4();

    // Create template document
    const template = new DynamicTemplate({
      id: templateId,
      name,
      description,
      category,
      pdfUrl,
      wordUrl: normalizedDocxUrl,
      placeholders,
      formSchema, // Store the form schema in MongoDB
      createdBy: 'admin', // In a real app, this would be the actual admin user ID
    });

    // Save template to database
    const savedTemplate = await template.save();

    return NextResponse.json({
      success: true,
      data: {
        template: {
          id: savedTemplate.id,
          name: savedTemplate.name,
          description: savedTemplate.description,
          category: savedTemplate.category,
          pdfUrl: savedTemplate.pdfUrl,
          wordUrl: savedTemplate.wordUrl,
          placeholders: savedTemplate.placeholders,
          formSchema,
          createdAt: savedTemplate.createdAt,
          updatedAt: savedTemplate.updatedAt
        },
        message: 'Template saved successfully'
      }
    });

  } catch (error: any) {
    console.error('Error saving template:', error);
    
    // Handle MongoDB errors
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Template with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to save template' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve template details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const template = await DynamicTemplate.findOne({ id: templateId });
    
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Generate form schema from placeholders
    const formSchema = generateFormSchema(template.placeholders);

    return NextResponse.json({
      success: true,
      data: {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          pdfUrl: template.pdfUrl,
          wordUrl: template.wordUrl,
          placeholders: template.placeholders,
          formSchema,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}
