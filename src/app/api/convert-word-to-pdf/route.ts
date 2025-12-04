import { NextRequest, NextResponse } from 'next/server';
import { convertDocxToPdf } from '@/lib/cloudmersive';
import { convertDocxToPdf as libreOfficeDocxToPdf, isLibreOfficeAvailable } from '@/lib/libreoffice';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes('wordprocessingml') && !file.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'Only DOCX files are supported' }, { status: 400 });
    }

    // Check if Cloudmersive API key is available
    const hasCloudmersiveKey = process.env.CLOUDMERSIVE_API_KEY;
    const hasLibreOffice = await isLibreOfficeAvailable();
    
    if (!hasCloudmersiveKey && !hasLibreOffice) {
      return NextResponse.json({
        success: false,
        error: 'No conversion tools available',
        message: 'Please configure CLOUDMERSIVE_API_KEY or install LibreOffice CLI'
      }, { status: 500 });
    }

    // Convert file to buffer
    const docxBuffer = Buffer.from(await file.arrayBuffer());
    
    let pdfBuffer;
    
    if (hasCloudmersiveKey) {
      console.log('🔄 Converting DOCX to PDF using Cloudmersive API...');
      console.log('📄 Processing file:', file.name, 'Size:', file.size, 'bytes');
      
      try {
        pdfBuffer = await convertDocxToPdf(docxBuffer);
        console.log('✅ DOCX to PDF conversion successful using Cloudmersive');
      } catch (cloudmersiveError) {
        console.error('❌ Cloudmersive conversion failed:', cloudmersiveError);
        if (hasLibreOffice) {
          console.log('🔄 Falling back to LibreOffice CLI...');
          pdfBuffer = await libreOfficeDocxToPdf(docxBuffer);
          console.log('✅ DOCX to PDF conversion successful using LibreOffice CLI');
        } else {
          throw cloudmersiveError;
        }
      }
    } else {
      console.log('🔄 Converting DOCX to PDF using LibreOffice CLI...');
      console.log('📄 Processing file:', file.name, 'Size:', file.size, 'bytes');
      
      pdfBuffer = await libreOfficeDocxToPdf(docxBuffer);
      console.log('✅ DOCX to PDF conversion successful using LibreOffice CLI');
    }
    
    console.log('📄 Generated PDF buffer size:', pdfBuffer.length, 'bytes');

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace('.docx', '.pdf')}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Word to PDF conversion error:', error);
    
    // Handle specific Cloudmersive API errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Cloudmersive API key. Please check your configuration.' },
        { status: 401 }
      );
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return NextResponse.json(
        { success: false, error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to convert Word to PDF' },
      { status: 500 }
    );
  }
}
