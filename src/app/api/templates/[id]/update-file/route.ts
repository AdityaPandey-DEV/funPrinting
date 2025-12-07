import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import User from '@/models/User';
import { getCurrentUser, canEditTemplate, isAdminUser } from '@/lib/templateAuth';
import { uploadFile } from '@/lib/storage';
import { extractPlaceholders } from '@/lib/docxProcessor';
import { generateFormSchema } from '@/lib/docxProcessor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    const session = await getCurrentUser();
    
    if (!session || !session.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: session.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();
    const isAdmin = await isAdminUser();

    // Check if user can edit this template
    const canEdit = await canEditTemplate(templateId, userId, isAdmin);
    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have permission to edit this template' },
        { status: 403 }
      );
    }

    // Get the template
    const template = await DynamicTemplate.findOne({ id: templateId });
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.docx')) {
      return NextResponse.json(
        { success: false, error: 'Only DOCX files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    console.log(`📤 Uploading new template file for template ${templateId}`);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const docxBuffer = Buffer.from(bytes);

    // Extract placeholders from new file
    console.log('🔍 Extracting placeholders from new file...');
    const placeholders = await extractPlaceholders(docxBuffer);
    console.log(`✅ Extracted ${placeholders.length} placeholders:`, placeholders);

    // Generate form schema from placeholders
    const formSchema = generateFormSchema(placeholders);

    // Upload new file to cloud storage
    console.log('☁️ Uploading file to cloud storage...');
    const wordUrl = await uploadFile(
      docxBuffer,
      `templates/word/${templateId}`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    console.log('✅ File uploaded successfully:', wordUrl);

    // Update template with new file and placeholders
    template.wordUrl = wordUrl;
    template.placeholders = placeholders;
    template.formSchema = formSchema;
    template.updatedAt = new Date();

    await template.save();

    console.log(`✅ Template ${templateId} file updated successfully`);

    return NextResponse.json({
      success: true,
      message: 'Template file updated successfully',
      wordUrl,
      placeholders,
      formSchema
    });

  } catch (error) {
    console.error('❌ Error updating template file:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update template file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

