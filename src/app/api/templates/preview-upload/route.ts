import { NextRequest, NextResponse } from 'next/server';
import { fillDocxTemplate } from '@/lib/docxProcessor';
import { uploadFile } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      docxBuffer,
      formData,
      placeholders
    } = body;

    if (!docxBuffer || !formData) {
      return NextResponse.json(
        { success: false, error: 'Document buffer and form data are required' },
        { status: 400 }
      );
    }

    console.log('🔄 Generating upload preview with placeholders:', placeholders);
    console.log('📄 Original docxBuffer length:', docxBuffer.length);
    console.log('📄 First 100 chars of base64:', docxBuffer.substring(0, 100));
    console.log('📝 Received form data:', formData);
    console.log('📝 Form data keys:', Object.keys(formData));
    console.log('📝 Form data values:', Object.values(formData));
    console.log('📝 Form data entries:', Object.entries(formData));
    
    // Check if form data matches placeholders
    placeholders.forEach((placeholder: string) => {
      if (formData[placeholder]) {
        console.log(`✅ Form data has ${placeholder}: ${formData[placeholder]}`);
      } else {
        console.warn(`⚠️ Form data missing ${placeholder}`);
      }
    });

    // Convert base64 string to buffer
    const buffer = Buffer.from(docxBuffer, 'base64');
    console.log('📄 Converted buffer size:', buffer.length, 'bytes');
    console.log('📄 Buffer first 4 bytes:', Array.from(buffer.slice(0, 4)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    
    // Fill the DOCX template with form data
    const filledBuffer = await fillDocxTemplate(buffer, formData);
    
    if (!filledBuffer) {
      return NextResponse.json(
        { success: false, error: 'Failed to fill template' },
        { status: 500 }
      );
    }

    // Try to upload the filled document to storage
    let previewUrl: string;
    try {
      const storageProvider = process.env.STORAGE_PROVIDER || 'cloudinary';
      previewUrl = await uploadFile(filledBuffer, 'preview-documents', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      console.log(`🎉 Upload preview generated successfully (${storageProvider}):`, previewUrl);
    } catch (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      
      // Fallback: Create a data URL for immediate preview
      const base64Data = filledBuffer.toString('base64');
      previewUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64Data}`;
      console.log('🔄 Using data URL fallback for preview');
    }

    return NextResponse.json({
      success: true,
      previewUrl: previewUrl,
      fileName: `preview-${Date.now()}.docx`,
      placeholders: placeholders,
      filledData: formData
    });

  } catch (error) {
    console.error('❌ Error generating upload preview:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate preview' 
      },
      { status: 500 }
    );
  }
}
