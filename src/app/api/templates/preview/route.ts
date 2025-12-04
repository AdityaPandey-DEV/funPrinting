import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { fillDocxTemplate, validateFormData } from '@/lib/docxProcessor';
import { convertDocxToPdf } from '@/lib/cloudmersive';
import { uploadFile } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      templateId, 
      formData,
      previewType = 'docx' // 'docx' or 'pdf'
    } = body;

    if (!templateId || !formData) {
      return NextResponse.json(
        { success: false, error: 'Template ID and form data are required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Generating ${previewType.toUpperCase()} preview for template: ${templateId}`);

    // Connect to database
    await connectDB();

    // Fetch template from database
    const template = await DynamicTemplate.findOne({ id: templateId });
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Generate form schema and validate form data
    const formSchema = template.placeholders.map((placeholder: string) => ({
      key: placeholder,
      type: 'text',
      required: true
    }));

    const validation = validateFormData(formData, formSchema);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid form data', details: validation.errors },
        { status: 400 }
      );
    }

    // Download DOCX template from Cloudinary
    console.log('📥 Downloading DOCX template from Cloudinary...');
    const docxResponse = await fetch(template.wordUrl);
    if (!docxResponse.ok) {
      throw new Error('Failed to fetch DOCX template from Cloudinary');
    }
    const docxBuffer = Buffer.from(await docxResponse.arrayBuffer());

    // Fill DOCX template with form data
    console.log('✏️ Filling DOCX template with form data...');
    const filledDocxBuffer = await fillDocxTemplate(docxBuffer, formData);

    let previewUrl: string;
    let contentType: string;
    let fileName: string;

    if (previewType === 'pdf') {
      // Convert filled DOCX to PDF
      console.log('🔄 Converting filled DOCX to PDF...');
      const pdfBuffer = await convertDocxToPdf(filledDocxBuffer);
      
      // Upload PDF to storage
      previewUrl = await uploadFile(
        pdfBuffer, 
        'previews/pdf', 
        'application/pdf'
      );
      contentType = 'application/pdf';
      fileName = 'preview-document.pdf';
    } else {
      // Upload filled DOCX to storage
      previewUrl = await uploadFile(
        filledDocxBuffer, 
        'previews/docx', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fileName = 'preview-document.docx';
    }

    console.log(`✅ Preview generated successfully: ${previewUrl}`);

    return NextResponse.json({
      success: true,
      previewUrl,
      contentType,
      fileName,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error generating preview:', error);
    
    // Handle specific Cloudmersive API errors
    if (error.message.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Cloudmersive API key. Please check your configuration.' },
        { status: 401 }
      );
    }
    
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return NextResponse.json(
        { success: false, error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Template preview API is running',
    timestamp: new Date().toISOString()
  });
}
