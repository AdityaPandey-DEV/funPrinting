import { NextRequest, NextResponse } from 'next/server';
import { createReport } from 'docx-templates';

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

    // Create report using docx-templates
    // This preserves the original formatting and only replaces placeholders
    const report = await createReport({
      template: buffer,
      data: formData,
      cmdDelimiter: ['@', '@'], // Use @placeholder@ format
      processLineBreaks: true,
      noSandbox: false,
      additionalJsContext: {
        // Add any additional JavaScript context if needed
        formatDate: (date: string) => {
          return new Date(date).toLocaleDateString();
        },
        formatCurrency: (amount: number) => {
          return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
          }).format(amount);
        }
      }
    });

    // Convert the result to buffer
    const resultBuffer = await report;

    console.log('📝 DOCX template processed successfully:', {
      originalSize: buffer.length,
      resultSize: resultBuffer.length,
      placeholders: Object.keys(formData),
      filename: filename || 'edited-document.docx'
    });

    return new NextResponse(Buffer.from(resultBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename || 'edited-document.docx'}"`,
        'Content-Length': resultBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error editing DOCX template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to edit DOCX template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
