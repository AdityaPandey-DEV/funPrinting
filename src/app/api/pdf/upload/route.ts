import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('🔄 Uploading PDF via HTTPS API...');
    console.log('📄 File size:', file.size, 'bytes');
    console.log('📄 File type:', file.type);

    // Validate PDF file
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Validate PDF header
    const pdfHeader = buffer.toString('ascii', 0, 4);
    if (pdfHeader !== '%PDF') {
      return NextResponse.json(
        { success: false, error: 'Invalid PDF file format' },
        { status: 400 }
      );
    }

    // Upload to cloud storage
    let pdfUrl: string;
    try {
      const folder = metadata ? JSON.parse(metadata).folder || 'uploads' : 'uploads';
      pdfUrl = await uploadToCloudinary(buffer, folder);
      console.log('✅ PDF uploaded to cloud storage:', pdfUrl);
    } catch (error) {
      console.error('❌ Error uploading PDF:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to upload PDF' },
        { status: 500 }
      );
    }

    // Generate unique file ID
    const fileId = uuidv4();

    // Return success response with file information
    return NextResponse.json({
      success: true,
      fileId: fileId,
      pdfUrl: pdfUrl,
      fileName: file.name,
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      message: 'PDF uploaded successfully via HTTPS API'
    });

  } catch (error) {
    console.error('❌ PDF upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}
