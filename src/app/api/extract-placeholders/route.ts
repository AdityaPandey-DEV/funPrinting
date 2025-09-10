import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const { docxBuffer, fileUrl } = await request.json();

    if (!docxBuffer && !fileUrl) {
      return NextResponse.json(
        { error: 'Document buffer or file URL is required' },
        { status: 400 }
      );
    }

    let buffer: Buffer;

    if (fileUrl) {
      // Fetch file from URL
      console.log('🔄 Fetching file from URL:', fileUrl);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file from URL');
      }
      buffer = Buffer.from(await response.arrayBuffer());
      console.log('📄 Fetched buffer size:', buffer.length, 'bytes');
    } else {
      // Convert base64 to buffer
      buffer = Buffer.from(docxBuffer, 'base64');
    }

    // Extract text from DOCX using mammoth
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    // Find placeholders using regex pattern @placeholder
    const placeholderRegex = /@([A-Za-z0-9_]+)/g;
    const matches = text.match(placeholderRegex) || [];
    console.log('🔍 Found placeholder matches:', matches);
    
    const placeholders = [...new Set(
      matches
        .map(match => match.substring(1)) // Remove @ symbol
        .filter(placeholder => placeholder.length > 0)
    )];
    
    console.log('🔍 Extracted placeholders:', placeholders);

    // Also convert @placeholder to {{placeholder}} format in the text for docxtemplater
    let convertedText = text;
    placeholders.forEach(placeholder => {
      const regex = new RegExp(`@${placeholder}`, 'g');
      convertedText = convertedText.replace(regex, `{{${placeholder}}}`);
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
