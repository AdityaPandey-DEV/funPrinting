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
    let renderServiceUrl = process.env.RENDER_SERVICE_URL;
    const renderApiKey = process.env.RENDER_API_KEY;

    if (!renderServiceUrl) {
      console.error('❌ RENDER_SERVICE_URL not configured');
      return {
        success: false,
        error: 'Render service URL not configured'
      };
    }

    // Normalize URL: remove trailing slashes
    renderServiceUrl = renderServiceUrl.replace(/\/+$/, '');

    console.log(`🔄 Sending DOCX to Render for conversion...`);
    console.log(`  - Render Service URL: ${renderServiceUrl}`);
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
 * Check if Render service is available and has the required endpoints
 * @returns Promise with availability status
 */
export async function checkRenderServiceStatus(): Promise<{
  available: boolean;
  responseTime?: number;
  error?: string;
  hasConvertSync?: boolean;
}> {
  try {
    let renderServiceUrl = process.env.RENDER_SERVICE_URL;
    
    if (!renderServiceUrl) {
      console.error('❌ RENDER_SERVICE_URL not configured');
      return {
        available: false,
        error: 'Render service URL not configured'
      };
    }

    // Normalize URL: remove trailing slashes
    renderServiceUrl = renderServiceUrl.replace(/\/+$/, '');
    console.log(`🔍 Checking Render service status at: ${renderServiceUrl}`);

    const startTime = Date.now();
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      // First check health endpoint
      const healthUrl = `${renderServiceUrl}/health`;
      console.log(`  - Health check URL: ${healthUrl}`);
      
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      console.log(`  - Health check response: ${healthResponse.status} ${healthResponse.statusText}`);

      if (!healthResponse.ok) {
        const errorText = await healthResponse.text().catch(() => 'Unable to read error');
        console.error(`  - Health check failed: ${healthResponse.status} - ${errorText.substring(0, 200)}`);
        return {
          available: false,
          responseTime,
          error: `Health check failed: ${healthResponse.status}`
        };
      }

      let healthResult;
      try {
        healthResult = await healthResponse.json();
        console.log(`  - Health check result:`, JSON.stringify(healthResult));
      } catch (parseError) {
        // If JSON parsing fails, try to get text response
        const textResponse = await healthResponse.text();
        console.log(`  - Health check response (text): ${textResponse.substring(0, 200)}`);
        
        // If service responds with 200 OK, consider it available even if response format is unexpected
        if (healthResponse.status === 200) {
          console.log('  - Service responded with 200 OK, considering it available');
          healthResult = { status: 'ok' }; // Assume ok if we get 200
        } else {
          return {
            available: false,
            responseTime,
            error: 'Health check returned unexpected response format'
          };
        }
      }

      // More lenient check: accept 'ok', 'OK', or any truthy status
      const statusValue = healthResult?.status?.toLowerCase();
      if (statusValue && statusValue !== 'ok' && statusValue !== 'healthy' && statusValue !== 'up') {
        console.warn(`  - Health check returned unexpected status: ${healthResult.status}`);
        // Still consider it available if we got 200 OK response
        if (healthResponse.status === 200) {
          console.log('  - But service responded with 200 OK, considering it available anyway');
        } else {
          return {
            available: false,
            responseTime,
            error: `Health check returned non-ok status: ${healthResult.status}`
          };
        }
      }

      // Check if /api/convert-sync endpoint exists
      // We send a test request that the server will recognize as a health check
      let hasConvertSync = false;
      try {
        const syncCheckController = new AbortController();
        const syncCheckTimeout = setTimeout(() => syncCheckController.abort(), 3000);
        
        const syncCheckUrl = `${renderServiceUrl}/api/convert-sync`;
        console.log(`  - Checking /api/convert-sync endpoint: ${syncCheckUrl}`);
        
        const syncCheckResponse = await fetch(syncCheckUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docxUrl: 'health-check' }), // Use 'health-check' instead of 'test' for clarity
          signal: syncCheckController.signal
        });
        
        clearTimeout(syncCheckTimeout);
        
        console.log(`  - /api/convert-sync response: ${syncCheckResponse.status}`);
        
        // If we get 400 (invalid URL - endpoint exists and handled the request), endpoint exists
        // If we get 404, endpoint doesn't exist
        // If we get 500, endpoint exists but had an error
        hasConvertSync = syncCheckResponse.status !== 404;
        
        if (!hasConvertSync) {
          console.warn('⚠️ /api/convert-sync endpoint not found on Render service. Service may need to be redeployed with latest code.');
        } else {
          console.log(`  - ✅ /api/convert-sync endpoint is available (status: ${syncCheckResponse.status})`);
        }
      } catch (syncCheckError) {
        // If it's not a 404, assume endpoint exists but had other issues
        if (syncCheckError instanceof Error && syncCheckError.name !== 'AbortError') {
          hasConvertSync = true; // Endpoint exists but had an error (expected for test request)
          console.log('  - ✅ /api/convert-sync endpoint exists (got error, but not 404)');
        } else {
          console.warn('  - ⚠️ /api/convert-sync check timed out or aborted');
        }
      }

      console.log(`✅ Render service is AVAILABLE (response time: ${responseTime}ms, hasConvertSync: ${hasConvertSync})`);
      return {
        available: true,
        responseTime,
        hasConvertSync
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`❌ Health check timeout after ${responseTime}ms`);
        return {
          available: false,
          responseTime,
          error: 'Health check timeout (5s)'
        };
      }
      
      console.error(`❌ Health check error:`, fetchError);
      return {
        available: false,
        responseTime,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      };
    }

  } catch (error) {
    console.error('❌ Error checking Render service status:', error);
    if (error instanceof Error) {
      console.error(`   Error details: ${error.message}`);
      console.error(`   Stack: ${error.stack?.substring(0, 200)}`);
    }
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Convert DOCX to PDF in real-time (synchronous)
 * @param docxUrl - URL of the DOCX file to convert
 * @param timeout - Maximum time to wait in milliseconds (default: 60000 = 60 seconds)
 * @returns Promise with PDF buffer or URL
 */
export async function convertDocxToPdfRealtime(
  docxUrl: string,
  timeout: number = 60000
): Promise<{
  success: boolean;
  pdfBuffer?: Buffer;
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

    console.log(`🔄 Starting real-time PDF conversion...`);
    console.log(`  - Render Service URL: ${renderServiceUrl}`);
    console.log(`  - DOCX URL: ${docxUrl}`);
    console.log(`  - Timeout: ${timeout}ms`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (renderApiKey) {
      headers['Authorization'] = `Bearer ${renderApiKey}`;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Use synchronous conversion endpoint
      const convertUrl = `${renderServiceUrl}/api/convert-sync`;
      console.log(`  - Calling: ${convertUrl}`);
      
      const convertResponse = await fetch(convertUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ docxUrl }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!convertResponse.ok) {
        const errorText = await convertResponse.text();
        console.error(`❌ Render service error: ${convertResponse.status}`);
        console.error(`   Error response: ${errorText.substring(0, 200)}`);
        
        // If 404, the endpoint doesn't exist (service not updated yet)
        if (convertResponse.status === 404) {
          console.error('⚠️ /api/convert-sync endpoint not found. Service may need to be redeployed.');
          return {
            success: false,
            error: 'PDF conversion service endpoint not available. Please ensure the Render service is deployed with the latest code. PDF will be sent to your email after order completion.'
          };
        }
        
        // Try to parse as JSON, otherwise use text
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorText;
        } catch {
          // Not JSON, use text as is (limit length)
          errorMessage = errorText.substring(0, 200);
        }
        
        return {
          success: false,
          error: `Conversion failed (${convertResponse.status}): ${errorMessage}`
        };
      }

      const result = await convertResponse.json();

      if (result.success && result.pdfBuffer) {
        // Convert base64 to Buffer
        const pdfBuffer = Buffer.from(result.pdfBuffer, 'base64');
        
        console.log(`✅ PDF conversion completed: ${pdfBuffer.length} bytes`);
        
        return {
          success: true,
          pdfBuffer
        };
      } else {
        return {
          success: false,
          error: result.error || 'Conversion failed'
        };
      }

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return {
          success: false,
          error: `Conversion timeout after ${timeout}ms. PDF will be sent to your email.`
        };
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Error in real-time conversion:', error);
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
    let renderServiceUrl = process.env.RENDER_SERVICE_URL;
    const renderApiKey = process.env.RENDER_API_KEY;

    if (!renderServiceUrl) {
      return {
        success: false,
        error: 'Render service URL not configured'
      };
    }

    // Normalize URL: remove trailing slashes
    renderServiceUrl = renderServiceUrl.replace(/\/+$/, '');

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

