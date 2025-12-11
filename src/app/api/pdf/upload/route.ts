import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage';

/**
 * Upload PDF file to storage
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const url = await uploadFile(
      buffer,
      'orders/template-pdf',
      'application/pdf'
    );

    console.log(`✅ PDF uploaded: ${url}`);

    return NextResponse.json({
      success: true,
      url: url
    });

  } catch (error) {
    console.error('❌ Error uploading PDF:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
