import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const { docxBuffer } = await request.json();

    if (!docxBuffer) {
      return NextResponse.json(
        { error: 'Document buffer is required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(docxBuffer, 'base64');

    // Extract text from DOCX using mammoth
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    // Find placeholders using regex pattern @placeholder
    const placeholderRegex = /@([A-Za-z0-9_]+)/g;
    const placeholders = [...new Set(
      (text.match(placeholderRegex) || [])
        .map(match => match.substring(1)) // Remove @ symbol
        .filter(placeholder => placeholder.length > 0)
    )];

    // Also convert @placeholder to {placeholder} format in the text for docxtemplater
    let convertedText = text;
    placeholders.forEach(placeholder => {
      const regex = new RegExp(`@${placeholder}`, 'g');
      convertedText = convertedText.replace(regex, `{${placeholder}}`);
    });

    // Sort placeholders for better UX
    const sortedPlaceholders = placeholders.sort();

    console.log('📝 Extracted placeholders:', sortedPlaceholders);

    return NextResponse.json({
      success: true,
      placeholders: sortedPlaceholders,
      text: text.substring(0, 500) + (text.length > 500 ? '...' : ''), // Preview of extracted text
      count: sortedPlaceholders.length
    });

  } catch (error) {
    console.error('Error extracting placeholders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to extract placeholders from document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
