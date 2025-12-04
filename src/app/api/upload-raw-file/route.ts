import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileBuffer, contentType } = body;

    if (!fileName || !fileBuffer) {
      return NextResponse.json(
        { success: false, error: 'File name and buffer are required' },
        { status: 400 }
      );
    }

    const storageProvider = process.env.STORAGE_PROVIDER || 'cloudinary';
    console.log(`🔄 Uploading raw file to ${storageProvider}...`);
    console.log('📄 File name:', fileName);
    console.log('📄 Content type:', contentType);
    console.log('📄 Buffer size:', fileBuffer.length, 'chars');

    // Convert base64 string back to buffer
    const buffer = Buffer.from(fileBuffer, 'base64');
    console.log('📄 Converted buffer size:', buffer.length, 'bytes');

    // Upload to configured storage provider
    const uploadResult = await uploadFile(
      buffer, 
      'raw-templates', 
      contentType || 'application/octet-stream'
    );

    if (!uploadResult) {
      throw new Error('File upload failed');
    }

    console.log('✅ Raw file upload successful:', uploadResult);

    return NextResponse.json({
      success: true,
      url: uploadResult,
      message: 'File uploaded successfully'
    });

  } catch (error: any) {
    console.error('❌ Error in raw file upload:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
