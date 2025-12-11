/**
 * Render Service Client
 * Handles communication with Render service for DOCX to PDF conversion
 */

interface RenderConversionRequest {
  docxUrl: string;
  orderId: string;
  callbackUrl: string;
}

interface RenderConversionResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  error?: string;
}

/**
 * Send DOCX file to Render service for async PDF conversion
 * @param docxUrl - URL of the DOCX file to convert
 * @param orderId - Order ID for tracking
 * @param callbackUrl - Webhook URL to receive the converted PDF
 * @returns Promise with job ID or error
 */
export async function sendDocxToRender(
  docxUrl: string,
  orderId: string,
  callbackUrl: string
): Promise<RenderConversionResponse> {
  try {
    const renderServiceUrl = process.env.RENDER_SERVICE_URL;
    const renderApiKey = process.env.RENDER_API_KEY;

    if (!renderServiceUrl) {
      console.error('❌ RENDER_SERVICE_URL not configured');
      return {
        success: false,
        error: 'Render service URL not configured'
      };
    }

    console.log(`🔄 Sending DOCX to Render for conversion...`);
    console.log(`  - Order ID: ${orderId}`);
    console.log(`  - DOCX URL: ${docxUrl}`);
    console.log(`  - Callback URL: ${callbackUrl}`);

    const requestBody: RenderConversionRequest = {
      docxUrl,
      orderId,
      callbackUrl
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add API key if configured
    if (renderApiKey) {
      headers['Authorization'] = `Bearer ${renderApiKey}`;
    }

    const response = await fetch(`${renderServiceUrl}/api/convert`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Render service error: ${response.status} ${response.statusText}`);
      console.error(`   Error details: ${errorText}`);
      
      return {
        success: false,
        error: `Render service error: ${response.status} ${response.statusText}`
      };
    }

    const result = await response.json();
    
    if (result.success && result.jobId) {
      console.log(`✅ DOCX sent to Render successfully`);
      console.log(`   Job ID: ${result.jobId}`);
      return {
        success: true,
        jobId: result.jobId,
        message: result.message || 'Conversion job created successfully'
      };
    } else {
      console.error(`❌ Render service returned unsuccessful response:`, result);
      return {
        success: false,
        error: result.error || 'Unknown error from Render service'
      };
    }

  } catch (error) {
    console.error('❌ Error sending DOCX to Render:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check conversion status (optional - for polling if needed)
 * @param jobId - Render job ID
 * @returns Promise with status
 */
export async function checkConversionStatus(jobId: string): Promise<{
  success: boolean;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  pdfUrl?: string;
  error?: string;
}> {
  try {
    const renderServiceUrl = process.env.RENDER_SERVICE_URL;
    const renderApiKey = process.env.RENDER_API_KEY;

    if (!renderServiceUrl) {
      return {
        success: false,
        error: 'Render service URL not configured'
      };
    }

    const headers: Record<string, string> = {};
    if (renderApiKey) {
      headers['Authorization'] = `Bearer ${renderApiKey}`;
    }

    const response = await fetch(`${renderServiceUrl}/api/status/${jobId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Status check failed: ${response.status}`
      };
    }

    const result = await response.json();
    return {
      success: true,
      status: result.status,
      pdfUrl: result.pdfUrl,
      error: result.error
    };

  } catch (error) {
    console.error('❌ Error checking conversion status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

