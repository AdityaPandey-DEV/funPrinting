import { NextRequest, NextResponse } from 'next/server';
import { checkRenderServiceStatus, convertDocxToPdfRealtime } from '@/lib/renderService';

/**
 * Check Render service status (client-callable)
 */
export async function GET(request: NextRequest) {
  try {
    const status = await checkRenderServiceStatus();
    
    return NextResponse.json({
      success: true,
      available: status.available,
      responseTime: status.responseTime,
      error: status.error
    });
  } catch (error) {
    console.error('❌ Error checking Render status:', error);
    return NextResponse.json({
      success: false,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Convert DOCX to PDF in real-time (client-callable)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { docxUrl, timeout } = body;

    if (!docxUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing docxUrl' },
        { status: 400 }
      );
    }

    const conversionTimeout = timeout || 60000; // Default 60 seconds
    
    console.log(`🔄 Real-time conversion requested for: ${docxUrl}`);
    console.log(`   Timeout: ${conversionTimeout}ms`);

    const result = await convertDocxToPdfRealtime(docxUrl, conversionTimeout);

    if (result.success && result.pdfBuffer) {
      // Return PDF as base64 for client to download
      const base64Pdf = result.pdfBuffer.toString('base64');
      
      return NextResponse.json({
        success: true,
        pdfBuffer: base64Pdf,
        pdfUrl: result.pdfUrl
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Conversion failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error in real-time conversion API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

