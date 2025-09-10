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

    console.log('📝 Processing DOCX template with docx-templates:', {
      placeholders: Object.keys(formData),
      filename: filename || 'personalized-document.docx'
    });

    // Use docx-templates to replace placeholders while preserving formatting
    const report = await createReport({
      template: buffer,
      data: formData,
      additionalJsContext: {
        // Add utility functions for formatters
        formatDate: (date: string) => {
          if (!date) return new Date().toLocaleDateString();
          return new Date(date).toLocaleDateString();
        },
        formatCurrency: (amount: number) => {
          if (!amount) return '$0.00';
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(amount);
        },
        formatNumber: (num: number) => {
          if (!num) return '0';
          return new Intl.NumberFormat('en-US').format(num);
        },
        upperCase: (str: string) => {
          return str ? str.toUpperCase() : '';
        },
        lowerCase: (str: string) => {
          return str ? str.toLowerCase() : '';
        },
        capitalize: (str: string) => {
          return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
        }
      }
    });

    // Convert the result to buffer
    const resultBuffer = await report;

    console.log('✅ DOCX template processed successfully:', {
      originalSize: buffer.length,
      resultSize: resultBuffer.length,
      placeholdersProcessed: Object.keys(formData).length
    });

    // Return the document as a downloadable file
    return new NextResponse(Buffer.from(resultBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename || 'personalized-document.docx'}"`,
        'Content-Length': resultBuffer.length.toString(),
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