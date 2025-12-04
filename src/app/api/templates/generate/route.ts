import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage';
import {
  generateAssignmentCover,
  generateResume,
  generateLabReport,
  generateCertificate,
  generateCSLabManual,
  generateElectronicsLabManual,
  generateMechanicalLabManual,
  generatePhysicsLabManual,
  TemplateData,
} from '@/lib/pdfGenerator';

export async function POST(request: NextRequest) {
  try {
    const { templateType, formData } = await request.json();
    console.log('Received request:', { templateType, formData });

    let pdfBuffer: Uint8Array;

    // Generate PDF
    try {
      switch (templateType) {
        case 'assignment-cover':
          console.log('Generating assignment cover...');
          pdfBuffer = await generateAssignmentCover(formData as TemplateData);
          break;
        case 'resume':
          console.log('Generating resume...');
          pdfBuffer = await generateResume(formData as TemplateData);
          break;
        case 'lab-report':
          console.log('Generating lab report...');
          pdfBuffer = await generateLabReport(formData as TemplateData);
          break;
        case 'certificate':
          console.log('Generating certificate...');
          pdfBuffer = await generateCertificate(formData as TemplateData);
          break;
        case 'lab-manual-cs':
          console.log('Generating CS lab manual...');
          pdfBuffer = await generateCSLabManual(formData as TemplateData);
          break;
        case 'lab-manual-electronics':
          console.log('Generating Electronics lab manual...');
          pdfBuffer = await generateElectronicsLabManual(formData as TemplateData);
          break;
        case 'lab-manual-mechanical':
          console.log('Generating Mechanical lab manual...');
          pdfBuffer = await generateMechanicalLabManual(formData as TemplateData);
          break;
        case 'lab-manual-physics':
          console.log('Generating Physics lab manual...');
          pdfBuffer = await generatePhysicsLabManual(formData as TemplateData);
          break;
        default:
          return NextResponse.json(
            { success: false, error: 'Invalid template type' },
            { status: 400 }
          );
      }
      console.log('PDF generated successfully, size:', pdfBuffer.length);
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      return NextResponse.json(
        { success: false, error: `PDF generation failed: ${pdfError}` },
        { status: 500 }
      );
    }

    // Convert Uint8Array to Buffer
    const buffer = Buffer.from(pdfBuffer);
    console.log('Buffer created, size:', buffer.length);
    
    // Upload to storage
    try {
      const storageProvider = process.env.STORAGE_PROVIDER || 'cloudinary';
      console.log(`Uploading to ${storageProvider}...`);
      const pdfURL = await uploadFile(buffer, 'templates', 'application/pdf');
      console.log('Upload successful:', pdfURL);

      return NextResponse.json({
        success: true,
        pdfURL,
      });
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      
      // For development, return the PDF as base64 if Cloudinary fails
      if (process.env.NODE_ENV === 'development') {
        const base64PDF = buffer.toString('base64');
        console.log('Returning base64 PDF for development');
        
        return NextResponse.json({
          success: true,
          pdfURL: `data:application/pdf;base64,${base64PDF}`,
          isBase64: true,
        });
      }
      
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { success: false, error: `Failed to generate template: ${error}` },
      { status: 500 }
    );
  }
}
