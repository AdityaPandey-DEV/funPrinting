import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const { docxBuffer, pageRange, processingMode } = await request.json();

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
    let text = result.value;

    // If processing specific page range, extract that portion
    if (processingMode === 'range' && pageRange) {
      const { start, end } = pageRange;
      
      // Split text into paragraphs (rough approximation of pages)
      const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
      const wordsPerPage = Math.max(1, Math.ceil(paragraphs.length / 10)); // Rough estimate, prevent division by zero
      
      const startIndex = Math.max(0, (start - 1) * wordsPerPage);
      const endIndex = Math.min(paragraphs.length, end * wordsPerPage);
      
      const selectedParagraphs = paragraphs.slice(startIndex, endIndex);
      text = selectedParagraphs.join('\n\n');
      
      console.log(`📄 Processing pages ${start}-${end}: ${selectedParagraphs.length} paragraphs`);
    }

    // Find placeholders using regex pattern @placeholder
    const placeholderRegex = /@([A-Za-z0-9_]+)/g;
    const placeholders = [...new Set(
      (text.match(placeholderRegex) || [])
        .map(match => match.substring(1)) // Remove @ symbol
        .filter(placeholder => placeholder.length > 0)
    )];

    // Sort placeholders for better UX
    const sortedPlaceholders = placeholders.sort();

    console.log('📝 Extracted placeholders from range:', {
      placeholders: sortedPlaceholders,
      processingMode,
      pageRange,
      textLength: text.length
    });

    return NextResponse.json({
      success: true,
      placeholders: sortedPlaceholders,
      text: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
      count: sortedPlaceholders.length,
      processingMode,
      pageRange,
      message: `Found ${sortedPlaceholders.length} placeholders in ${processingMode === 'full' ? 'full document' : `pages ${pageRange?.start}-${pageRange?.end}`}`
    });

  } catch (error) {
    console.error('Error extracting placeholders from range:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to extract placeholders from range',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
