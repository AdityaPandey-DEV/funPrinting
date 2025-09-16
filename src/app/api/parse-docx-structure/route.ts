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

    // Get ACTUAL page count by converting DOCX to PDF and counting pages
    let actualPageCount = 1;
    
    try {
      console.log('🔄 Converting DOCX to PDF to get accurate page count...');
      
      // Convert DOCX to PDF using LibreOffice headless mode
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      // Create temporary files
      const tempDir = os.tmpdir();
      const inputFile = path.join(tempDir, `input_${Date.now()}.docx`);
      const outputDir = path.join(tempDir, `output_${Date.now()}`);
      
      // Write DOCX buffer to temporary file
      fs.writeFileSync(inputFile, buffer);
      
      // Create output directory
      fs.mkdirSync(outputDir, { recursive: true });
      
      // Convert DOCX to PDF using LibreOffice headless
      const libreOfficeCmd = `libreoffice --headless --convert-to pdf --outdir "${outputDir}" "${inputFile}"`;
      console.log('🔄 Running LibreOffice conversion...');
      
      await execAsync(libreOfficeCmd);
      
      // Find the generated PDF file
      const pdfFiles = fs.readdirSync(outputDir).filter(file => file.endsWith('.pdf'));
      if (pdfFiles.length === 0) {
        throw new Error('No PDF file generated');
      }
      
      const pdfFile = path.join(outputDir, pdfFiles[0]);
      const pdfBuffer = fs.readFileSync(pdfFile);
      
      // Get page count from PDF using pdf-lib
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      actualPageCount = pdfDoc.getPageCount();
      
      console.log(`✅ Actual page count from DOCX: ${actualPageCount} pages`);
      
      // Clean up temporary files
      try {
        fs.unlinkSync(inputFile);
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary files:', cleanupError);
      }
      
    } catch (conversionError) {
      console.error('❌ Failed to convert DOCX to PDF with LibreOffice:', conversionError);
      console.log('🔄 Trying Cloudmersive API as fallback...');
      
      try {
        // Try Cloudmersive API as fallback
        const { convertDocxToPdf } = await import('@/lib/cloudmersive');
        const pdfBuffer = await convertDocxToPdf(buffer);
        
        // Get page count from PDF using pdf-lib
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        actualPageCount = pdfDoc.getPageCount();
        
        console.log(`✅ Actual page count from DOCX (Cloudmersive): ${actualPageCount} pages`);
        
      } catch (cloudmersiveError) {
        console.error('❌ Failed to convert DOCX to PDF with Cloudmersive:', cloudmersiveError);
        console.log('🔄 Falling back to estimation method...');
        
        // Fallback to estimation if conversion fails
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        const charCount = text.length;
        
        // Extract paragraphs from text (split by double newlines)
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const paragraphCount = paragraphs.length;
        
        // Count tables (simple heuristic - look for table-like patterns)
        const tableCount = (text.match(/\|.*\|/g) || []).length;
        
        const imageCount = images.length;

        // More sophisticated page estimation based on actual document structure

        // Method 1: Based on paragraphs (academic documents typically 2-3 paragraphs per page)
        const paragraphsPerPage = 2.5;
        const pagesByParagraphs = Math.max(1, Math.ceil(paragraphCount / paragraphsPerPage));

        // Method 2: Based on word count (academic documents typically 200-250 words per page)
        const wordsPerPage = 225;
        const pagesByWords = Math.max(1, Math.ceil(wordCount / wordsPerPage));

        // Method 3: Based on character count (including formatting, academic docs are denser)
        const charsPerPage = 900;
        const pagesByChars = Math.max(1, Math.ceil(charCount / charsPerPage));

        // Method 4: Based on content density (tables and images take more space)
        const contentDensity = (tableCount * 0.5) + (imageCount * 0.3) + 1;
        const pagesByContent = Math.max(1, Math.ceil(paragraphCount / (paragraphsPerPage * contentDensity)));

        // Use the median of all estimates
        const estimates = [pagesByParagraphs, pagesByWords, pagesByChars, pagesByContent];
        estimates.sort((a, b) => a - b);
        const medianIndex = Math.floor(estimates.length / 2);
        actualPageCount = estimates[medianIndex];
        
        console.log(`📊 Fallback estimation: ${actualPageCount} pages (methods: ${estimates.join(', ')})`);
      }
    }

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
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      charCount: text.length,
      paragraphCount: text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length,
      tableCount: (text.match(/\|.*\|/g) || []).length,
      imageCount: images.length,
      actualPageCount,
      placeholders: placeholders.length,
      metadata: docMetadata
    });

    return NextResponse.json({
      success: true,
      totalPages: actualPageCount,
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      charCount: text.length,
      paragraphCount: text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length,
      tableCount: (text.match(/\|.*\|/g) || []).length,
      imageCount: images.length,
      placeholders,
      metadata: docMetadata,
      text: text.substring(0, 2000) + (text.length > 2000 ? '...' : ''), // Preview text
      structure: {
        paragraphs: text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length,
        tables: (text.match(/\|.*\|/g) || []).length,
        images: images.length,
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
