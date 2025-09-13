import { NextRequest, NextResponse } from 'next/server';
import { parseDocx, extractText, getMetadata, extractImages } from '@thasmorato/docx-parser';
import * as mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const { docxBuffer } = await request.json();

    if (!docxBuffer) {
      return NextResponse.json(
        { success: false, error: 'Document buffer is required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(docxBuffer, 'base64');

    let text = '';
    let metadata = {};
    let images = [];

    try {
      // Try to use @thasmorato/docx-parser first
      await parseDocx(buffer);
      text = await extractText(buffer);
      metadata = await getMetadata(buffer) || {};
      const imagesGenerator = await extractImages(buffer);
      images = [];
      for await (const image of imagesGenerator) {
        images.push(image);
      }
    } catch (error: any) {
      console.log('⚠️ @thasmorato/docx-parser failed, falling back to mammoth:', error.message);
      
      // Fallback to mammoth for text extraction
      try {
        const mammothResult = await mammoth.extractRawText({ buffer });
        text = mammothResult.value;
        
        // Basic metadata fallback
        metadata = {
          title: 'Untitled Document',
          creator: 'Unknown',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          subject: null,
          description: null
        };
        
        images = [];
      } catch (mammothError: any) {
        console.error('❌ Both parsers failed:', mammothError.message);
        throw new Error('Failed to parse DOCX document with any available parser');
      }
    }

    // Calculate more accurate page count based on content structure
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = text.length;
    
    // Extract paragraphs from text (split by double newlines)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;
    
    // Count tables (simple heuristic - look for table-like patterns)
    const tableCount = (text.match(/\|.*\|/g) || []).length;
    
    const imageCount = images.length;

    // More sophisticated page estimation based on actual document structure
    let estimatedPages = 1;

    // Method 1: Based on paragraphs (academic documents typically 3-4 paragraphs per page)
    const paragraphsPerPage = 3.5;
    const pagesByParagraphs = Math.max(1, Math.ceil(paragraphCount / paragraphsPerPage));

    // Method 2: Based on word count (academic documents typically 250-300 words per page)
    const wordsPerPage = 275;
    const pagesByWords = Math.max(1, Math.ceil(wordCount / wordsPerPage));

    // Method 3: Based on character count (including formatting)
    const charsPerPage = 1200;
    const pagesByChars = Math.max(1, Math.ceil(charCount / charsPerPage));

    // Method 4: Based on content density (tables and images take more space)
    const contentDensity = (tableCount * 0.5) + (imageCount * 0.3) + 1;
    const pagesByContent = Math.max(1, Math.ceil(paragraphCount / (paragraphsPerPage * contentDensity)));

    // Use the median of all estimates
    const estimates = [pagesByParagraphs, pagesByWords, pagesByChars, pagesByContent];
    estimates.sort((a, b) => a - b);
    const medianIndex = Math.floor(estimates.length / 2);
    estimatedPages = estimates[medianIndex];

    // Extract placeholders from the text
    const placeholderRegex = /@([A-Za-z0-9_]+)/g;
    const placeholders = [...new Set(
      (text.match(placeholderRegex) || [])
        .map(match => match.substring(1))
        .filter(placeholder => placeholder.length > 0)
    )].sort();

    // Get document metadata from the parsed metadata
    const docMetadata = {
      title: (metadata as any).title || 'Untitled Document',
      creator: (metadata as any).creator || 'Unknown',
      created: (metadata as any).created || null,
      modified: (metadata as any).modified || null,
      subject: (metadata as any).subject || null,
      description: (metadata as any).description || null,
    };

    console.log('📄 DOCX Structure Analysis:', {
      wordCount,
      charCount,
      paragraphCount,
      tableCount,
      imageCount,
      estimates: {
        paragraphs: pagesByParagraphs,
        words: pagesByWords,
        chars: pagesByChars,
        content: pagesByContent
      },
      finalEstimate: estimatedPages,
      placeholders: placeholders.length,
      metadata: docMetadata
    });

    return NextResponse.json({
      success: true,
      totalPages: estimatedPages,
      wordCount,
      charCount,
      paragraphCount,
      tableCount,
      imageCount,
      placeholders,
      metadata: docMetadata,
      text: text.substring(0, 2000) + (text.length > 2000 ? '...' : ''), // Preview text
      structure: {
        paragraphs: paragraphCount,
        tables: tableCount,
        images: imageCount,
        footnotes: 0, // Not available in this API
        headers: 0, // Not available in this API
        footers: 0  // Not available in this API
      }
    });

  } catch (error) {
    console.error('Error parsing DOCX structure:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to parse DOCX structure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
