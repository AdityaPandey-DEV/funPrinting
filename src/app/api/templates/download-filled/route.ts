import { NextRequest, NextResponse } from 'next/server';
import { fillDocxTemplate } from '@/lib/docxProcessor';
import { uploadFile } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { docxBuffer, fileUrl, formData, placeholders } = body;

    console.log('🔄 Download API - Generating filled document...');
    console.log('📄 DocxBuffer length:', docxBuffer?.length || 'null');
    console.log('📄 File URL:', fileUrl || 'null');
    console.log('📝 Form data:', formData);
    console.log('📝 Placeholders:', placeholders);

    if (!docxBuffer && !fileUrl) {
      return NextResponse.json({ error: 'No document buffer or file URL provided' }, { status: 400 });
    }

    if (!formData || Object.keys(formData).length === 0) {
      return NextResponse.json({ error: 'No form data provided' }, { status: 400 });
    }

    let buffer: Buffer;

    if (fileUrl) {
      // Fetch file from URL
      console.log('🔄 Fetching file from URL:', fileUrl);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file from URL');
      }
      buffer = Buffer.from(await response.arrayBuffer());
      console.log('📄 Fetched buffer size:', buffer.length, 'bytes');
    } else {
      // Convert base64 to buffer
      buffer = Buffer.from(docxBuffer, 'base64');
      console.log('📄 Converted buffer size:', buffer.length, 'bytes');
    }

    // Fill the DOCX template
    console.log('🔄 Filling DOCX template with data:', formData);
    const filledBuffer = await fillDocxTemplate(buffer, formData);
    console.log('✅ DOCX template filled successfully, size:', filledBuffer.length, 'bytes');

    // Upload to storage
    const storageProvider = process.env.STORAGE_PROVIDER || 'cloudinary';
    console.log(`📤 Uploading filled document to ${storageProvider}...`);
    const uploadResult = await uploadFile(filledBuffer, 'filled-documents', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    console.log(`✅ ${storageProvider} upload successful:`, uploadResult);

    return NextResponse.json({
      success: true,
      downloadUrl: uploadResult,
      message: 'Document generated successfully'
    });

  } catch (error: any) {
    console.error('❌ Error in download API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate document', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}
