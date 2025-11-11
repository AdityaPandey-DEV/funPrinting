import axios, { AxiosInstance } from 'axios';
import { IOrder } from '@/models/Order';

export interface PrintJobRequest {
  // Legacy: single file (for backward compatibility)
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  // Multiple files support
  fileURLs?: string[];
  originalFileNames?: string[];
  fileTypes?: string[];
  printingOptions: {
    pageSize: 'A4' | 'A3';
    color: 'color' | 'bw' | 'mixed';
    sided: 'single' | 'double';
    copies: number;
    pageCount?: number;
    pageColors?: {
      colorPages: number[];
      bwPages: number[];
    };
  };
  printerIndex: number;
  orderId?: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface PrintJobResponse {
  success: boolean;
  message: string;
  jobId?: string;
  deliveryNumber?: string;
  error?: string;
}

/**
 * Printer API Client with infinite retry logic
 */
export class PrinterClient {
  private apiUrls: string[];
  private apiKey: string;
  private timeout: number;
  private retryQueue: Array<{ request: PrintJobRequest; timestamp: Date }> = [];
  private isProcessingQueue = false;

  constructor() {
    // Parse PRINTER_API_URLS from environment
    const urlsEnv = process.env.PRINTER_API_URLS;
    if (!urlsEnv) {
      console.warn('PRINTER_API_URLS not configured');
      this.apiUrls = [];
    } else {
      const trimmed = urlsEnv.trim();
      // Check if it looks like a JSON array (starts with [ and ends with ])
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          this.apiUrls = JSON.parse(trimmed);
          // Ensure it's an array
          if (!Array.isArray(this.apiUrls)) {
            this.apiUrls = [];
          }
        } catch {
          // Invalid JSON array format like [https://...] - extract URL from brackets
          const urlMatch = trimmed.match(/\[(.*?)\]/);
          if (urlMatch && urlMatch[1]) {
            this.apiUrls = [urlMatch[1].trim()];
          } else {
            this.apiUrls = [];
          }
        }
      } else {
        // Not a JSON array - treat as comma-separated string or single URL
        this.apiUrls = trimmed.split(',').map(url => url.trim()).filter(url => url.length > 0);
        // If no commas, treat as single URL
        if (this.apiUrls.length === 0 && trimmed.length > 0) {
          this.apiUrls = [trimmed];
        }
      }
      
      // Normalize all URLs: remove trailing slashes
      this.apiUrls = this.apiUrls.map(url => url.replace(/\/+$/, ''));
    }

    this.apiKey = process.env.PRINTER_API_KEY || '';
    this.timeout = parseInt(process.env.PRINTER_API_TIMEOUT || '5000', 10);

    // Start processing retry queue
    this.startRetryQueueProcessor();
  }

  /**
   * Create axios instance for a printer API URL
   */
  private createAxiosInstance(baseURL: string): AxiosInstance {
    // Ensure baseURL doesn't have trailing slash to avoid double slashes
    const normalizedBaseURL = baseURL.replace(/\/+$/, '');
    return axios.create({
      baseURL: normalizedBaseURL,
      timeout: this.timeout,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Extract error message from axios error
   */
  private extractErrorMessage(error: any): string {
    // Check if it's an axios error with response
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const responseData = error.response.data;
      
      // Try to extract error message from response data
      let errorMessage = '';
      if (responseData) {
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }
      }
      
      // Build comprehensive error message
      if (errorMessage) {
        return `${status} ${statusText}: ${errorMessage}`;
      } else {
        return `${status} ${statusText}`;
      }
    }
    
    // Fall back to error message or default
    return error.message || 'Unknown error';
  }

  /**
   * Select printer API URL based on printer index
   */
  private getPrinterUrl(printerIndex: number): string | null {
    if (this.apiUrls.length === 0) {
      return null;
    }
    // Use modulo to cycle through available printers
    const index = (printerIndex - 1) % this.apiUrls.length;
    return this.apiUrls[index];
  }

  /**
   * Send print job to printer API
   */
  async sendPrintJob(request: PrintJobRequest): Promise<PrintJobResponse> {
    const printerUrl = this.getPrinterUrl(request.printerIndex);

    if (!printerUrl) {
      console.error('No printer API URL available');
      // Add to retry queue
      this.addToRetryQueue(request);
      return {
        success: false,
        message: 'No printer API available',
        error: 'PRINTER_API_URLS not configured'
      };
    }

    try {
      console.log(`🖨️ Sending print job to printer API: ${printerUrl}`);
      const axiosInstance = this.createAxiosInstance(printerUrl);

      // Prepare request body - support both single file and multiple files
      const requestBody: any = {
        printingOptions: request.printingOptions,
        printerIndex: request.printerIndex,
        orderId: request.orderId,
        customerInfo: request.customerInfo
      };

      // If multiple files exist, send arrays
      if (request.fileURLs && request.fileURLs.length > 0) {
        requestBody.fileURLs = request.fileURLs;
        requestBody.originalFileNames = request.originalFileNames || request.fileURLs.map((_, idx) => `File ${idx + 1}`);
        requestBody.fileTypes = request.fileTypes || request.fileURLs.map(() => 'application/octet-stream');
        console.log(`📦 Sending ${request.fileURLs.length} files to printer:`, {
          fileURLs: request.fileURLs,
          originalFileNames: requestBody.originalFileNames,
          fileTypes: requestBody.fileTypes
        });
      } else if (request.fileUrl) {
        // Legacy: single file format
        requestBody.fileUrl = request.fileUrl;
        requestBody.fileName = request.fileName || 'document.pdf';
        requestBody.fileType = request.fileType || 'application/pdf';
        console.log(`📄 Sending single file to printer: ${requestBody.fileName}`);
      } else {
        return {
          success: false,
          message: 'No file URL provided',
          error: 'Either fileUrl or fileURLs must be provided'
        };
      }

      const response = await axiosInstance.post<PrintJobResponse>('/api/print', requestBody);

      // Validate response - check if success is actually true
      if (!response.data || response.data.success !== true) {
        const errorMessage = response.data?.error || response.data?.message || 'Printer API returned unsuccessful response';
        console.error(`❌ Printer API returned unsuccessful response:`, {
          success: response.data?.success,
          message: response.data?.message,
          error: response.data?.error,
          data: response.data
        });
        
        // Add to retry queue
        this.addToRetryQueue(request);
        
        return {
          success: false,
          message: 'Printer API returned unsuccessful response',
          error: errorMessage
        };
      }

      console.log(`✅ Print job sent successfully: ${response.data.jobId}, Delivery: ${response.data.deliveryNumber || 'N/A'}`);
      return response.data;
    } catch (error: any) {
      // Extract full error details from axios error
      const errorMessage = this.extractErrorMessage(error);
      const statusCode = error.response?.status;
      const statusText = error.response?.statusText;
      const responseData = error.response?.data;
      
      // Log full error details
      console.error(`❌ Error sending print job to ${printerUrl}:`, {
        message: errorMessage,
        status: statusCode,
        statusText: statusText,
        responseData: responseData,
        error: error.message
      });
      
      // Add to retry queue (infinite retry)
      this.addToRetryQueue(request);

      return {
        success: false,
        message: 'Failed to send print job, added to retry queue',
        error: errorMessage
      };
    }
  }

  /**
   * Add request to retry queue
   */
  private addToRetryQueue(request: PrintJobRequest): void {
    this.retryQueue.push({
      request,
      timestamp: new Date()
    });
    console.log(`📋 Added print job to retry queue (Total: ${this.retryQueue.length})`);
  }

  /**
   * Start processing retry queue
   */
  private startRetryQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessingQueue || this.retryQueue.length === 0) {
        return;
      }

      this.isProcessingQueue = true;
      console.log(`🔄 Processing retry queue (${this.retryQueue.length} jobs)...`);

      const jobs = [...this.retryQueue];
      this.retryQueue = [];

      for (const { request } of jobs) {
        try {
          // Check if job was already successfully sent (prevent duplicates)
          // If orderId exists, we can check if it's already in the printer queue
          const result = await this.sendPrintJob(request);
          if (result.success) {
            // Job sent successfully, don't add back to retry queue
            console.log(`✅ Retry successful for job: ${request.orderId || 'unknown'}`);
          } else {
            // Only add back to queue if it's a genuine failure
            // Check if error indicates job is already in queue
            const errorMsg = result.error?.toLowerCase() || '';
            if (!errorMsg.includes('duplicate') && !errorMsg.includes('already')) {
              this.addToRetryQueue(request);
            } else {
              console.log(`⏭️ Skipping duplicate job in retry queue: ${request.orderId || 'unknown'}`);
            }
          }
        } catch (error) {
          console.error('Error processing retry queue job:', error);
          // Only add back if it's not a duplicate error
          const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
          if (!errorMsg.includes('duplicate') && !errorMsg.includes('already')) {
            this.addToRetryQueue(request);
          }
        }

        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.isProcessingQueue = false;
    }, 30000); // Process queue every 30 seconds
  }

  /**
   * Check printer API health
   */
  async checkHealth(printerIndex: number): Promise<{ available: boolean; message: string }> {
    const printerUrl = this.getPrinterUrl(printerIndex);

    if (!printerUrl) {
      return { available: false, message: 'No printer API URL configured' };
    }

    try {
      const axiosInstance = this.createAxiosInstance(printerUrl);
      await axiosInstance.get('/health');
      return { available: true, message: 'Printer API is healthy' };
    } catch (error: any) {
      return { available: false, message: error.message || 'Health check failed' };
    }
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus(): { total: number; jobs: Array<{ timestamp: Date }> } {
    return {
      total: this.retryQueue.length,
      jobs: this.retryQueue.map(item => ({ timestamp: item.timestamp }))
    };
  }
}

// Export singleton instance
export const printerClient = new PrinterClient();

/**
 * Generate delivery number based on printer index
 * Format: {LETTER}{YYYYMMDD}{PRINTER_INDEX}{FILE_NUMBER}
 * This is a simplified version - the actual delivery number is generated by the printer API
 * The printer API will add the file number (1-10) at the end
 */
export function generateDeliveryNumber(printerIndex: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Start with 'A' for now - actual letter cycling and file number are handled by printer API
  // The printer API will generate the full delivery number with file number
  return `A${dateStr}${printerIndex}0`; // Placeholder - printer API will replace with actual file number
}

// Helper function to detect file type from URL or filename
function getFileTypeFromURL(url: string, fileName: string): string {
  // Try to get extension from filename first
  const fileNameLower = fileName.toLowerCase();
  const urlLower = url.toLowerCase();
  
  // Extract extension from filename
  const fileNameMatch = fileNameLower.match(/\.([a-z0-9]+)$/);
  if (fileNameMatch) {
    const ext = fileNameMatch[1];
    const mimeTypes: Record<string, string> = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text
      'txt': 'text/plain',
      'rtf': 'application/rtf',
    };
    
    if (mimeTypes[ext]) {
      return mimeTypes[ext];
    }
  }
  
  // Try to get extension from URL
  const urlMatch = urlLower.match(/\.([a-z0-9]+)(\?|$)/);
  if (urlMatch) {
    const ext = urlMatch[1];
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    
    if (mimeTypes[ext]) {
      return mimeTypes[ext];
    }
  }
  
  // Default fallback
  return 'application/octet-stream';
}

/**
 * Send print job from order
 */
export async function sendPrintJobFromOrder(order: IOrder, printerIndex: number): Promise<PrintJobResponse> {
  // Check for multiple files first, then fall back to single file
  const hasMultipleFiles = order.fileURLs && order.fileURLs.length > 0;
  const hasSingleFile = order.fileURL && !hasMultipleFiles;
  
  if (!hasMultipleFiles && !hasSingleFile) {
    return {
      success: false,
      message: 'Order has no file URL',
      error: 'File URL is required'
    };
  }

  // If multiple files exist, send them as arrays
  if (hasMultipleFiles) {
    const fileURLs = order.fileURLs!;
    const originalFileNames = order.originalFileNames || fileURLs.map((_, idx) => `File ${idx + 1}`);
    
    console.log(`📋 Preparing print job for ${fileURLs.length} files:`, {
      fileURLs,
      originalFileNames,
      orderId: order.orderId
    });
    
    // Detect file types for each file
    const fileTypes = fileURLs.map((url, idx) => {
      const fileName = originalFileNames[idx] || `File ${idx + 1}`;
      return getFileTypeFromURL(url, fileName);
    });

    const printJob: PrintJobRequest = {
      fileURLs,
      originalFileNames,
      fileTypes,
      printingOptions: {
        pageSize: order.printingOptions.pageSize,
        color: order.printingOptions.color,
        sided: order.printingOptions.sided,
        copies: order.printingOptions.copies,
        pageCount: order.printingOptions.pageCount || 1,
        pageColors: order.printingOptions.pageColors
      },
      printerIndex,
      orderId: order.orderId,
      customerInfo: order.customerInfo
    };

    console.log(`✅ Print job request prepared with ${fileURLs.length} files`);
    return await printerClient.sendPrintJob(printJob);
  }

  // Legacy: single file format (backward compatibility)
  const printJob: PrintJobRequest = {
    fileUrl: order.fileURL!,
    fileName: order.originalFileName || 'document.pdf',
    fileType: order.fileType || getFileTypeFromURL(order.fileURL!, order.originalFileName || 'document.pdf'),
    printingOptions: {
      pageSize: order.printingOptions.pageSize,
      color: order.printingOptions.color,
      sided: order.printingOptions.sided,
      copies: order.printingOptions.copies,
      pageCount: order.printingOptions.pageCount || 1,
      pageColors: order.printingOptions.pageColors
    },
    printerIndex,
    orderId: order.orderId,
    customerInfo: order.customerInfo
  };

  return await printerClient.sendPrintJob(printJob);
}

