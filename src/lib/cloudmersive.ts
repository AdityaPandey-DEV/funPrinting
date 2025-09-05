// Custom Cloudmersive API client for Next.js compatibility
const CLOUDMERSIVE_BASE_URL = 'https://api.cloudmersive.com';

/**
 * Make authenticated request to Cloudmersive API
 */
async function makeCloudmersiveRequest(endpoint: string, buffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.CLOUDMERSIVE_API_KEY;
  
  if (!apiKey) {
    throw new Error('CLOUDMERSIVE_API_KEY not configured');
  }

  const response = await fetch(`${CLOUDMERSIVE_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Apikey': apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cloudmersive API error:', response.status, errorText);
    console.error('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 401) {
      throw new Error('Invalid Cloudmersive API key');
    } else if (response.status === 429) {
      throw new Error('Cloudmersive API quota exceeded');
    } else if (response.status === 500) {
      console.error('Cloudmersive 500 error details:', errorText);
      throw new Error(`Cloudmersive API error: ${response.status} ${errorText}`);
    } else {
      throw new Error(`Cloudmersive API error: ${response.status} ${errorText}`);
    }
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Convert PDF to DOCX using Cloudmersive API
 * @param pdfBuffer - PDF file as Buffer
 * @returns Promise<Buffer> - DOCX file as Buffer
 */
export async function convertPdfToDocx(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    console.log('Converting PDF to DOCX using Cloudmersive...');
    console.log('PDF buffer size:', pdfBuffer.length, 'bytes');
    
    // Validate PDF buffer
    if (pdfBuffer.length < 100) {
      throw new Error('PDF file is too small or corrupted');
    }
    
    // Check if it's a valid PDF by looking for PDF header
    const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
    if (pdfHeader !== '%PDF') {
      throw new Error('File is not a valid PDF (missing PDF header)');
    }
    
    // Check PDF version
    const pdfVersion = pdfBuffer.toString('ascii', 0, 8);
    console.log('PDF version detected:', pdfVersion);
    
    // Check for common PDF issues
    const pdfContent = pdfBuffer.toString('ascii', 0, Math.min(1000, pdfBuffer.length));
    console.log('PDF content preview:', pdfContent.substring(0, 200));
    
    // Check if PDF contains text streams
    const hasTextStreams = pdfContent.includes('/Contents') || pdfContent.includes('stream');
    console.log('PDF contains text streams:', hasTextStreams);
    
    // Check if PDF might be image-only
    const hasImages = pdfContent.includes('/Image') || pdfContent.includes('/XObject');
    console.log('PDF contains images:', hasImages);
    
    // Check for FlateDecode compression
    const hasFlateDecode = pdfContent.includes('/FlateDecode');
    console.log('PDF uses FlateDecode compression:', hasFlateDecode);
    
    // Try to preprocess PDF if it has compression issues
    const processedPdfBuffer = pdfBuffer;
    if (hasFlateDecode) {
      console.log('⚠️ PDF uses FlateDecode compression - this may cause conversion issues');
      console.log('💡 Consider using a different PDF or converting to a simpler format');
    }
    
    try {
      const result = await makeCloudmersiveRequest('/convert/pdf/to/docx', processedPdfBuffer);
      console.log('PDF to DOCX conversion successful');
      console.log('DOCX buffer size:', result.length, 'bytes');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (hasFlateDecode && errorMessage.includes('500')) {
        console.log('🔄 FlateDecode PDF failed, trying alternative approach...');
        throw new Error(`PDF conversion failed: This PDF uses FlateDecode compression which Cloudmersive cannot process. Please try with a simpler PDF or convert it to a different format first.`);
      } else if (errorMessage.includes('Unable to process input document')) {
        console.log('🔄 PDF processing failed - checking for common issues...');
        if (hasFlateDecode) {
          throw new Error(`PDF conversion failed: This PDF uses FlateDecode compression which Cloudmersive cannot process. Please try with a simpler PDF or convert it to a different format first.`);
        } else {
          throw new Error(`PDF conversion failed: This PDF cannot be processed by Cloudmersive. It may be password-protected, contain only images, or be in an unsupported format. Please try with a different PDF.`);
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error converting PDF to DOCX:', error);
    throw error;
  }
}

/**
 * Convert DOCX to PDF using Cloudmersive API
 * @param docxBuffer - DOCX file as Buffer
 * @returns Promise<Buffer> - PDF file as Buffer
 */
export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  try {
    console.log('Converting DOCX to PDF using Cloudmersive...');
    console.log('DOCX buffer size:', docxBuffer.length, 'bytes');
    
    const result = await makeCloudmersiveRequest('/convert/docx/to/pdf', docxBuffer);
    
    console.log('DOCX to PDF conversion successful');
    console.log('PDF buffer size:', result.length, 'bytes');
    return result;
  } catch (error) {
    console.error('Error converting DOCX to PDF:', error);
    throw error;
  }
}

/**
 * Extract text from PDF using Cloudmersive API
 * @param pdfBuffer - PDF file as Buffer
 * @returns Promise<string> - Extracted text
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log('Extracting text from PDF using Cloudmersive...');
    
    const result = await makeCloudmersiveRequest('/convert/pdf/to/txt', pdfBuffer);
    
    console.log('Text extraction successful');
    return result.toString('utf-8');
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * Get API usage information
 * @returns Promise<any> - API usage stats
 */
export async function getApiUsage(): Promise<any> {
  try {
    const apiKey = process.env.CLOUDMERSIVE_API_KEY;
    
    if (!apiKey) {
      throw new Error('CLOUDMERSIVE_API_KEY not configured');
    }

    const response = await fetch(`${CLOUDMERSIVE_BASE_URL}/convert/validate/get-api-usage`, {
      method: 'POST',
      headers: {
        'Apikey': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get API usage: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting API usage:', error);
    throw error;
  }
}
