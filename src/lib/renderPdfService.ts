/**
 * Render PDF Service Client
 * Handles communication with the Render PDF conversion service at https://render-pdf-service.fly.dev/
 */

const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || 'https://render-pdf-service.fly.dev';

export interface ConversionJob {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  wordUrl?: string;
  pdfUrl?: string;
  error?: string;
  progress?: number;
}

/**
 * Convert DOCX to PDF using Render service (synchronous)
 * @param docxUrl - URL of the DOCX file to convert
 * @param timeout - Timeout in milliseconds (default: 60000 = 60 seconds)
 * @returns Promise with PDF buffer as base64 string
 */
export async function convertDocxToPdfSync(
  docxUrl: string,
  timeout: number = 60000
): Promise<{ success: boolean; pdfBuffer?: string; error?: string }> {
  try {
    const serviceUrl = RENDER_SERVICE_URL.replace(/\/+$/, '');
    const convertUrl = `${serviceUrl}/api/convert-sync`;

    console.log(`🔄 Converting DOCX to PDF (sync): ${docxUrl}`);
    console.log(`📡 Render service URL: ${convertUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(convertUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ docxUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ Conversion failed: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Conversion failed: ${response.status}`,
        };
      }

      const result = await response.json();
      
      if (result.success && result.pdfBuffer) {
        console.log(`✅ PDF conversion successful: ${result.size} bytes`);
        return {
          success: true,
          pdfBuffer: result.pdfBuffer,
        };
      } else {
        console.error('❌ Conversion failed:', result.error || 'Unknown error');
        return {
          success: false,
          error: result.error || 'Conversion failed',
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ Conversion timeout');
        return {
          success: false,
          error: 'Conversion timeout',
        };
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Error in PDF conversion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convert DOCX to PDF using Render service (asynchronous)
 * @param docxUrl - URL of the DOCX file to convert
 * @param callbackUrl - URL to call when conversion is complete
 * @returns Promise with job ID
 */
export async function convertDocxToPdfAsync(
  docxUrl: string,
  callbackUrl?: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const serviceUrl = RENDER_SERVICE_URL.replace(/\/+$/, '');
    const convertUrl = `${serviceUrl}/api/convert`;

    console.log(`🔄 Converting DOCX to PDF (async): ${docxUrl}`);
    console.log(`📡 Render service URL: ${convertUrl}`);

    const response = await fetch(convertUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        docxUrl,
        callbackUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`❌ Conversion request failed: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `Conversion request failed: ${response.status}`,
      };
    }

    const result = await response.json();
    
    if (result.success && result.jobId) {
      console.log(`✅ Conversion job created: ${result.jobId}`);
      return {
        success: true,
        jobId: result.jobId,
      };
    } else {
      console.error('❌ Conversion job creation failed:', result.error || 'Unknown error');
      return {
        success: false,
        error: result.error || 'Conversion job creation failed',
      };
    }
  } catch (error) {
    console.error('❌ Error creating conversion job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check conversion status
 * @param jobId - Job ID from async conversion
 * @returns Promise with conversion status
 */
export async function checkConversionStatus(
  jobId: string
): Promise<ConversionJob> {
  try {
    const serviceUrl = RENDER_SERVICE_URL.replace(/\/+$/, '');
    const statusUrl = `${serviceUrl}/api/status/${jobId}`;

    console.log(`🔍 Checking conversion status: ${jobId}`);

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`❌ Status check failed: ${response.status} - ${errorText}`);
      return {
        jobId,
        status: 'failed',
        error: `Status check failed: ${response.status}`,
      };
    }

    const result = await response.json();
    
    return {
      jobId,
      status: result.status || 'processing',
      pdfUrl: result.pdfUrl,
      error: result.error,
      progress: result.progress,
    };
  } catch (error) {
    console.error('❌ Error checking conversion status:', error);
    return {
      jobId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if Render service is available
 * @returns Promise with availability status
 */
export async function checkServiceHealth(): Promise<{
  available: boolean;
  responseTime?: number;
  error?: string;
}> {
  try {
    const serviceUrl = RENDER_SERVICE_URL.replace(/\/+$/, '');
    const healthUrl = `${serviceUrl}/health`;

    console.log(`🔍 Checking Render service health: ${healthUrl}`);

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          available: false,
          responseTime,
          error: `Health check failed: ${response.status}`,
        };
      }

      const result = await response.json().catch(() => ({ status: 'ok' }));
      const isHealthy = result.status === 'ok' || result.status === 'healthy' || response.status === 200;

      return {
        available: isHealthy,
        responseTime,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return {
          available: false,
          responseTime,
          error: 'Health check timeout',
        };
      }

      return {
        available: false,
        responseTime,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
      };
    }
  } catch (error) {
    console.error('❌ Error checking service health:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

