import { NextRequest, NextResponse } from 'next/server';
import { convertPdfToDocx } from '@/lib/cloudmersive';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!name || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, description, category' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    console.log(`Processing PDF upload: ${file.name} (${file.size} bytes)`);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(bytes);

    // Convert PDF to DOCX using Cloudmersive
    console.log('Converting PDF to DOCX...');
    const docxBuffer = await convertPdfToDocx(pdfBuffer);

    // Upload original PDF to Cloudinary
    console.log('Uploading PDF to Cloudinary...');
    const pdfUrl = await uploadToCloudinary(pdfBuffer, 'templates/pdf', 'application/pdf');

    // Upload converted DOCX to Cloudinary
    console.log('Uploading DOCX to Cloudinary...');
    const docxUrl = await uploadToCloudinary(docxBuffer, 'templates/docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    return NextResponse.json({
      success: true,
      data: {
        name,
        description,
        category,
        originalFileName: file.name,
        fileSize: file.size,
        pdfUrl,
        docxUrl,
        message: 'PDF uploaded and converted to DOCX successfully'
      }
    });

  } catch (error: any) {
    console.error('Error in PDF upload:', error);
    
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
      { success: false, error: 'Failed to process PDF upload' },
      { status: 500 }
    );
  }
}
