import { NextRequest, NextResponse } from 'next/server';
import { convertPdfToDocx } from '@/lib/cloudmersive';
import { convertPdfToDocx as libreOfficePdfToDocx, isLibreOfficeAvailable } from '@/lib/libreoffice';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const hasCloudmersiveKey = process.env.CLOUDMERSIVE_API_KEY;

    let conversionResult;
    
    if (hasCloudmersiveKey) {
      // Use Cloudmersive as primary conversion method
      console.log('🔄 Using Cloudmersive API for PDF to DOCX conversion...');
      try {
        conversionResult = await cloudmersiveConversion(buffer);
      } catch (cloudmersiveError) {
        console.error('❌ Cloudmersive conversion failed:', cloudmersiveError);
        console.log('❌ No fallback available - LibreOffice cannot convert PDF to DOCX');
        
        // Check if it's a FlateDecode compression issue
        const errorMessage = cloudmersiveError instanceof Error ? cloudmersiveError.message : String(cloudmersiveError);
        if (errorMessage.includes('FlateDecode compression')) {
          throw new Error(`PDF conversion failed: This PDF uses FlateDecode compression which Cloudmersive cannot process. Please try with a simpler PDF or convert it to a different format first.`);
        } else if (errorMessage.includes('Unable to process input document')) {
          // Check if PDF has FlateDecode compression
          const pdfContent = buffer.toString('ascii', 0, Math.min(1000, buffer.length));
          const hasFlateDecode = pdfContent.includes('/FlateDecode');
          
          if (hasFlateDecode) {
            throw new Error(`PDF conversion failed: This PDF uses FlateDecode compression which Cloudmersive cannot process. Please try with a simpler PDF or convert it to a different format first.`);
          } else {
            throw new Error(`PDF conversion failed: This PDF cannot be processed by Cloudmersive. It may be password-protected, contain only images, or be in an unsupported format. Please try with a different PDF.`);
          }
        } else {
          throw new Error(`PDF conversion failed: ${errorMessage}. Please ensure the PDF is valid and contains text.`);
        }
      }
    } else {
      // No conversion tools available
      console.log('❌ No conversion tools available');
      throw new Error('No PDF conversion tools available. Please configure CLOUDMERSIVE_API_KEY.');
    }
    
    return NextResponse.json(conversionResult);

  } catch (error) {
    console.error('PDF to Word conversion error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide specific error messages based on the error type
    let userMessage = 'PDF conversion failed. ';
    if (errorMessage.includes('PDF file is too small')) {
      userMessage += 'The PDF file appears to be corrupted or empty.';
    } else if (errorMessage.includes('not a valid PDF')) {
      userMessage += 'The file is not a valid PDF format.';
    } else if (errorMessage.includes('Unable to process input document')) {
      userMessage += 'The PDF cannot be processed. It may be password-protected, contain only images, use FlateDecode compression, or be in an unsupported format.';
    } else if (errorMessage.includes('FlateDecode compression')) {
      userMessage += 'This PDF uses FlateDecode compression which Cloudmersive cannot process. Please try with a simpler PDF or convert it to a different format first.';
    } else if (errorMessage.includes('This PDF uses FlateDecode compression')) {
      userMessage += 'This PDF uses FlateDecode compression which Cloudmersive cannot process. Please try with a simpler PDF or convert it to a different format first.';
    } else if (errorMessage.includes('API key')) {
      userMessage += 'Invalid Cloudmersive API key. Please check your configuration.';
    } else if (errorMessage.includes('quota')) {
      userMessage += 'API quota exceeded. Please try again later.';
    } else if (errorMessage.includes('DOCX text extraction not implemented')) {
      userMessage += 'The DOCX file was converted, but its content could not be extracted for preview. This feature requires a specialized library.';
    } else {
      userMessage += 'Please ensure the PDF is valid and contains text.';
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to convert PDF to Word',
        details: errorMessage,
        message: userMessage
      },
      { status: 500 }
    );
  }
}

async function cloudmersiveConversion(pdfBuffer: Buffer) {
  try {
    console.log('🚀 Using Cloudmersive API for PDF to DOCX conversion...');
    console.log('📄 Processing PDF buffer of size:', pdfBuffer.length, 'bytes');
    
    // First, try to extract text directly from PDF (more reliable)
    console.log('📖 Extracting text directly from PDF...');
    const { extractTextFromPdf } = await import('@/lib/cloudmersive');
    const pdfTextResponse = await extractTextFromPdf(pdfBuffer);
    console.log('📄 PDF text extraction response:', pdfTextResponse.substring(0, 500));
    
    // Parse the JSON response to get the actual text
    let pdfText = '';
    try {
      const parsedResponse = JSON.parse(pdfTextResponse);
      if (parsedResponse.Successful && parsedResponse.TextResult) {
        pdfText = parsedResponse.TextResult;
        console.log('📄 Parsed PDF text successfully, length:', pdfText.length);
        console.log('📄 PDF text preview:', pdfText.substring(0, 500));
    } else {
        console.log('⚠️ PDF text extraction response indicates failure');
        pdfText = pdfTextResponse; // Fallback to raw response
      }
    } catch {
      console.log('⚠️ Could not parse PDF text as JSON, using raw response');
      pdfText = pdfTextResponse; // Fallback to raw response
    }
    
    // Also convert PDF to DOCX for download purposes
    const docxBuffer = await convertPdfToDocx(pdfBuffer);
    console.log('✅ DOCX conversion successful for download');
    console.log('📄 Generated DOCX buffer size:', docxBuffer.length, 'bytes');
    
    if (pdfText.length > 0) {
      // Use PDF text as the primary content source
      console.log('✅ Using PDF text as primary content source');
      
      // Extract placeholders from PDF text
      const placeholderRegex = /@([A-Za-z0-9_]+)/g;
      const placeholders = [...new Set(
        (pdfText.match(placeholderRegex) || [])
          .map(match => match.substring(1))
      )];
      
      console.log('📝 Extracted placeholders from PDF text:', placeholders);
      
      // Split content into paragraphs
      const lines = pdfText.split('\n').filter(line => line.trim().length > 0);
  const paragraphs = lines.map((line, index) => {
    const trimmedLine = line.trim();
    const placeholderMatch = trimmedLine.match(/@(\w+)/);
    const isPlaceholder = !!placeholderMatch;
    const placeholderName = isPlaceholder ? placeholderMatch[1] : '';
    
    let style = 'normal';
    let level = 1;
    
        // Detect headings (short lines, all caps, or ending with colon)
        if (trimmedLine.length < 100 && (trimmedLine.toUpperCase() === trimmedLine || trimmedLine.endsWith(':')) && !isPlaceholder) {
      style = 'heading';
      level = trimmedLine.includes(':') ? 3 : (trimmedLine.length < 50 ? 1 : 2);
    } else if (trimmedLine.match(/^\d+\./)) {
      style = 'list';
    }
    
    return {
          id: (index + 1).toString(),
      text: trimmedLine,
      style: style,
      level: level,
      isPlaceholder: isPlaceholder,
      placeholderName: placeholderName
    };
  });
  
      // Create response with PDF text content
      return {
        success: true,
        wordContent: {
          paragraphs: paragraphs,
          tables: [],
          totalParagraphs: paragraphs.length,
          placeholders: placeholders,
          conversionMethod: 'cloudmersive-pdf-text',
          docxBuffer: docxBuffer.toString('base64'),
          fullHtml: `<div class="prose"><p>${pdfText.replace(/\n/g, '</p><p>')}</p></div>`
        },
        message: 'PDF text extracted successfully using Cloudmersive API',
        conversionMethod: 'cloudmersive-pdf-text'
      };
    }
    
    // Fallback: Create a simple placeholder for direct Word usage
    console.log('📖 Creating placeholder for direct Word usage...');
    
    const paragraphs = [{
      id: '1',
      text: 'Word document ready. Use Microsoft Word to add placeholders like @name, @date, etc.',
      style: 'normal' as const,
        level: 1,
      isPlaceholder: false,
      placeholderName: ''
    }];
    
    // Create response with placeholder content
    return {
      success: true,
      wordContent: {
        paragraphs: paragraphs,
        tables: [],
        totalParagraphs: paragraphs.length,
        placeholders: [],
        conversionMethod: 'microsoft-word',
        docxBuffer: docxBuffer.toString('base64'),
        fullHtml: '<p>Word document ready. Use Microsoft Word to add placeholders like @name, @date, etc.</p>'
      },
      message: 'Word document ready for Microsoft Word editing',
      conversionMethod: 'microsoft-word'
    };
    
  } catch (error) {
    console.error('❌ Cloudmersive conversion error:', error);
    throw error;
  }
}

// LibreOffice conversion (kept for DOCX to PDF, but not used for PDF to DOCX)
async function libreOfficeConversion(_pdfBuffer: Buffer) {
  // This function is no longer used for PDF to DOCX conversion
  // but is kept for completeness if needed for DOCX to PDF or other purposes.
  // It would need to be updated if PDF to DOCX capability is added to LibreOffice.
  console.log('🚀 Using LibreOffice CLI for PDF to DOCX conversion (this path should not be taken for PDF to DOCX)...');
  throw new Error('LibreOffice CLI cannot convert PDF to DOCX.');
}