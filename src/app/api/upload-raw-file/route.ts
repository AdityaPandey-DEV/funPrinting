import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

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

    console.log('🔄 Uploading raw file to Cloudinary...');
    console.log('📄 File name:', fileName);
    console.log('📄 Content type:', contentType);
    console.log('📄 Buffer size:', fileBuffer.length, 'chars');

    // Convert base64 string back to buffer
    const buffer = Buffer.from(fileBuffer, 'base64');
    console.log('📄 Converted buffer size:', buffer.length, 'bytes');

    // Upload to Cloudinary with raw file type
    const uploadResult = await uploadToCloudinary(
      buffer, 
      'raw-templates', 
      contentType || 'application/octet-stream'
    );

    if (!uploadResult) {
      throw new Error('Cloudinary upload failed');
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
