import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';
import * as docx from 'docx';

export async function POST(request: NextRequest) {
  try {
    const { docxBuffer, formData, filename } = await request.json();

    if (!docxBuffer || !formData) {
      return NextResponse.json(
        { error: 'Document buffer and form data are required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(docxBuffer, 'base64');

    // Extract text from DOCX
    const result = await mammoth.extractRawText({ buffer });
    let text = result.value;

    // Replace placeholders with form data
    Object.entries(formData).forEach(([placeholder, value]) => {
      const regex = new RegExp(`@${placeholder}`, 'g');
      text = text.replace(regex, value || '');
    });

    // Split text into paragraphs and create document
    const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
    
    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: paragraphs.map(paragraph => 
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: paragraph,
                size: 24, // 12pt font size
              }),
            ],
          })
        ),
      }],
    });

    // Generate the document buffer
    const docBuffer = await docx.Packer.toBuffer(doc);

    // Return the document as a downloadable file
    return new NextResponse(docBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename || 'personalized-document.docx'}"`,
        'Content-Length': docBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating personalized document:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate personalized document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
