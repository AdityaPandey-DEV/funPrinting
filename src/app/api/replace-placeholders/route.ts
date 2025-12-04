import { NextRequest, NextResponse } from 'next/server';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export async function POST(request: NextRequest) {
  try {
    const { wordFile, placeholders } = await request.json();

    if (!wordFile || !placeholders) {
      return NextResponse.json(
        { success: false, error: 'Word file and placeholders are required' },
        { status: 400 }
      );
    }

    console.log('🔄 Replacing placeholders in Word document...');
    console.log('📄 Placeholders to replace:', Object.keys(placeholders));

    // Convert base64 Word file to buffer
    const wordBuffer = Buffer.from(wordFile, 'base64');
    
    try {
      // Load the Word document using PizZip
      const zip = new PizZip(wordBuffer);
      
      // Create docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{{',
          end: '}}'
        }
      });

      // Set the data to replace placeholders
      doc.setData(placeholders);

      // Render the document (replace all placeholders)
      doc.render();

      // Get the output buffer
      const outputBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });

      console.log('✅ Placeholders replaced successfully');

      // Convert to base64 for response
      const base64Word = outputBuffer.toString('base64');

      return NextResponse.json({
        success: true,
        wordFile: base64Word,
        message: 'Placeholders replaced successfully'
      });

    } catch (renderError: unknown) {
      console.error('❌ Docxtemplater render error:', renderError);
      
      // Handle docxtemplater specific errors
      if (renderError && typeof renderError === 'object' && 'properties' in renderError) {
        const docxError = renderError as { properties?: { errors?: unknown[] } };
        if (docxError.properties?.errors) {
          console.error('Template errors:', docxError.properties.errors);
        }
      }
      
      throw renderError;
    }

  } catch (error) {
    console.error('❌ Placeholder replacement error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to replace placeholders' },
      { status: 500 }
    );
  }
}
