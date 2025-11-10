import axios, { AxiosInstance } from 'axios';
import { IOrder } from '@/models/Order';

export interface PrintJobRequest {
  fileUrl: string;
  fileName: string;
  fileType: string;
  printingOptions: {
    pageSize: 'A4' | 'A3';
    color: 'color' | 'bw' | 'mixed';
    sided: 'single' | 'double';
    copies: number;
    pageCount?: number;
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

      const response = await axiosInstance.post<PrintJobResponse>('/api/print', {
        fileUrl: request.fileUrl,
        fileName: request.fileName,
        fileType: request.fileType,
        printingOptions: request.printingOptions,
        printerIndex: request.printerIndex,
        orderId: request.orderId,
        customerInfo: request.customerInfo
      });

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
          const result = await this.sendPrintJob(request);
          if (!result.success) {
            // Add back to queue if still failing
            this.addToRetryQueue(request);
          }
        } catch (error) {
          console.error('Error processing retry queue job:', error);
          // Add back to queue
          this.addToRetryQueue(request);
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
      const response = await axiosInstance.get('/health');
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
 * Format: {LETTER}{YYYYMMDD}{PRINTER_INDEX}
 * This is a simplified version - the actual delivery number is generated by the printer API
 */
export function generateDeliveryNumber(printerIndex: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Start with 'A' for now - actual letter cycling is handled by printer API
  return `A${dateStr}${printerIndex}`;
}

/**
 * Send print job from order
 */
export async function sendPrintJobFromOrder(order: IOrder, printerIndex: number): Promise<PrintJobResponse> {
  if (!order.fileURL) {
    return {
      success: false,
      message: 'Order has no file URL',
      error: 'File URL is required'
    };
  }

  const printJob: PrintJobRequest = {
    fileUrl: order.fileURL,
    fileName: order.originalFileName || 'document.pdf',
    fileType: order.fileType || 'application/pdf',
    printingOptions: {
      pageSize: order.printingOptions.pageSize,
      color: order.printingOptions.color,
      sided: order.printingOptions.sided,
      copies: order.printingOptions.copies,
      pageCount: order.printingOptions.pageCount || 1
    },
    printerIndex,
    orderId: order.orderId,
    customerInfo: order.customerInfo
  };

  return await printerClient.sendPrintJob(printJob);
}

