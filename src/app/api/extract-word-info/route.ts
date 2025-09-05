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

    // Estimate page count based on text length
    // For academic documents, use more realistic estimates
    const wordCount = text.split(/\s+/).length;
    const charCount = text.length;
    
    // More sophisticated page estimation for academic documents
    // Consider different factors for better accuracy
    
    // Method 1: Word-based estimation (academic documents typically 200-300 words/page)
    const wordsPerPageAcademic = 250; // Conservative for academic docs
    const estimatedPagesByWords = Math.max(1, Math.ceil(wordCount / wordsPerPageAcademic));
    
    // Method 2: Character-based estimation (including formatting, spacing)
    const charsPerPageAcademic = 1200; // Characters per page for academic docs
    const estimatedPagesByChars = Math.max(1, Math.ceil(charCount / charsPerPageAcademic));
    
    // Method 3: Line-based estimation (assuming ~50 lines per page)
    const lines = text.split('\n').filter(line => line.trim().length > 0).length;
    const linesPerPage = 45; // Academic documents typically have 40-50 lines per page
    const estimatedPagesByLines = Math.max(1, Math.ceil(lines / linesPerPage));
    
    // Method 4: Paragraph-based estimation (assuming ~3-4 paragraphs per page)
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0).length;
    const paragraphsPerPage = 3.5; // Academic documents typically have 3-4 paragraphs per page
    const estimatedPagesByParagraphs = Math.max(1, Math.ceil(paragraphs / paragraphsPerPage));
    
    // Use the median of all estimates for better accuracy
    const estimates = [estimatedPagesByWords, estimatedPagesByChars, estimatedPagesByLines, estimatedPagesByParagraphs];
    estimates.sort((a, b) => a - b);
    const medianIndex = Math.floor(estimates.length / 2);
    const estimatedPages = estimates[medianIndex];

    // Create preview text (first 2000 characters)
    const previewText = text.length > 2000 ? text.substring(0, 2000) + '...' : text;

    console.log('📄 Word document info extracted:', {
      wordCount,
      charCount,
      lines,
      paragraphs,
      estimates: {
        words: estimatedPagesByWords,
        chars: estimatedPagesByChars,
        lines: estimatedPagesByLines,
        paragraphs: estimatedPagesByParagraphs
      },
      finalEstimate: estimatedPages,
      previewLength: previewText.length
    });

    return NextResponse.json({
      success: true,
      previewText,
      totalPages: estimatedPages,
      wordCount,
      fullText: text,
      message: 'Word document info extracted successfully'
    });

  } catch (error) {
    console.error('Error extracting word document info:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to extract word document info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
