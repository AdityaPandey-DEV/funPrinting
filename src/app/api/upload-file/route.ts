import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

// Configure the API route to handle larger files
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Increase file size limit to 50MB
    },
  },
  maxDuration: 60, // Increase timeout to 60 seconds
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: `File size too large. Maximum allowed size is 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB` 
      }, { status: 413 });
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Only PDF and Word documents are allowed.' 
      }, { status: 400 });
    }

    console.log(`Uploading file: ${file.name}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB, type: ${file.type}`);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const fileURL = await uploadToCloudinary(buffer, 'print-service', file.type);
    
    console.log(`File uploaded successfully: ${fileURL}`);
    
    return NextResponse.json({
      success: true,
      fileURL,
      fileType: file.type,
      originalFileName: file.name,
      fileSize: file.size
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
        return NextResponse.json({ 
          success: false, 
          error: 'File size too large. Please try a smaller file.' 
        }, { status: 413 });
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to upload file. Please try again.' 
    }, { status: 500 });
  }
}
