import connectDB from './mongodb';
import PrintJob from '@/models/PrintJob';
import Printer from '@/models/Printer';

export interface PrintQueueStatus {
  totalJobs: number;
  pendingJobs: number;
  printingJobs: number;
  completedJobs: number;
  failedJobs: number;
  availablePrinters: number;
  busyPrinters: number;
}

export class PrintQueueManager {
  private static instance: PrintQueueManager;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): PrintQueueManager {
    if (!PrintQueueManager.instance) {
      PrintQueueManager.instance = new PrintQueueManager();
    }
    return PrintQueueManager.instance;
  }

  public async startProcessing(intervalMs: number = 5000) {
    if (this.isProcessing) {
      console.log('Print queue processor is already running');
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Starting print queue processor...');

    this.processingInterval = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.error('Error processing print queue:', error);
      }
    }, intervalMs);
  }

  public stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    console.log('⏹️ Print queue processor stopped');
  }

  public async processQueue() {
    try {
      await connectDB();

      // Get pending jobs ordered by priority and creation time
      const pendingJobs = await PrintJob.find({ status: 'pending' })
        .sort({ priority: -1, createdAt: 1 })
        .limit(10);

      if (pendingJobs.length === 0) {
        return; // No pending jobs
      }

      // Get available printers
      const availablePrinters = await Printer.find({
        isActive: true,
        autoPrintEnabled: true,
        status: 'online',
        $or: [
          { currentJob: { $exists: false } },
          { currentJob: null }
        ]
      });

      if (availablePrinters.length === 0) {
        console.log('⚠️ No available printers for auto-printing');
        return;
      }

      // Assign jobs to available printers
      for (let i = 0; i < Math.min(pendingJobs.length, availablePrinters.length); i++) {
        const job = pendingJobs[i];
        const printer = availablePrinters[i];

        // Check if printer can handle this job
        if (this.canPrinterHandleJob(printer, job)) {
          await this.assignJobToPrinter(job, printer);
        }
      }
    } catch (error) {
      console.error('Error in processQueue:', error);
    }
  }

  private canPrinterHandleJob(printer: any, job: any): boolean {
    const { printingOptions } = job;
    const { capabilities } = printer;

    // Check page size support
    if (!capabilities.supportedPageSizes.includes(printingOptions.pageSize)) {
      return false;
    }

    // Check color support
    if (printingOptions.color === 'color' && !capabilities.supportsColor) {
      return false;
    }

    // Check duplex support
    if (printingOptions.sided === 'double' && !capabilities.supportsDuplex) {
      return false;
    }

    // Check file type support
    if (!capabilities.supportedFileTypes.includes(job.fileType)) {
      return false;
    }

    // Check copies limit
    if (printingOptions.copies > capabilities.maxCopies) {
      return false;
    }

    return true;
  }

  private async assignJobToPrinter(job: any, printer: any) {
    try {
      // Update job status
      await PrintJob.findByIdAndUpdate(job._id, {
        status: 'printing',
        printerId: printer._id,
        printerName: printer.name,
        startedAt: new Date()
      });

      // Update printer status
      await Printer.findByIdAndUpdate(printer._id, {
        currentJob: job._id,
        lastUsed: new Date(),
        queueLength: printer.queueLength + 1
      });

      console.log(`🖨️ Assigned job ${job.orderNumber} to printer ${printer.name}`);

      // Start the actual printing process
      await this.startPrinting(job, printer);
    } catch (error) {
      console.error('Error assigning job to printer:', error);
      
      // Mark job as failed
      await PrintJob.findByIdAndUpdate(job._id, {
        status: 'failed',
        errorMessage: 'Failed to assign to printer'
      });
    }
  }

  private async startPrinting(job: any, printer: any) {
    try {
      console.log(`🖨️ Starting print job: ${job.orderNumber} on ${printer.name}`);
      
      // TODO: Implement actual printing logic here
      // This would involve:
      // 1. Downloading the file from Cloudinary
      // 2. Converting to printer-compatible format if needed
      // 3. Sending to printer via appropriate method (CUPS, direct print, etc.)
      // 4. Monitoring print progress
      // 5. Updating job status when complete

      // For now, simulate printing with a timeout
      const estimatedDuration = job.estimatedDuration || 5; // minutes
      const printTime = estimatedDuration * 60 * 1000; // convert to milliseconds

      setTimeout(async () => {
        await this.completePrintJob(job._id);
      }, Math.min(printTime, 30000)); // Cap at 30 seconds for demo

    } catch (error) {
      console.error('Error starting print job:', error);
      await this.failPrintJob(job._id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async completePrintJob(jobId: string) {
    try {
      const job = await PrintJob.findById(jobId);
      if (!job) return;

      const actualDuration = job.startedAt 
        ? Math.round((Date.now() - job.startedAt.getTime()) / (1000 * 60)) // minutes
        : 0;

      // Update job status
      await PrintJob.findByIdAndUpdate(jobId, {
        status: 'completed',
        completedAt: new Date(),
        actualDuration
      });

      // Update printer status
      if (job.printerId) {
        await Printer.findByIdAndUpdate(job.printerId, {
          currentJob: null,
          queueLength: Math.max(0, (await Printer.findById(job.printerId))?.queueLength - 1 || 0),
          totalPagesPrinted: (await Printer.findById(job.printerId))?.totalPagesPrinted + (job.printingOptions.pageCount * job.printingOptions.copies) || 0
        });
      }

      console.log(`✅ Print job completed: ${job.orderNumber}`);
    } catch (error) {
      console.error('Error completing print job:', error);
    }
  }

  private async failPrintJob(jobId: string, errorMessage: string) {
    try {
      const job = await PrintJob.findById(jobId);
      if (!job) return;

      // Update job status
      await PrintJob.findByIdAndUpdate(jobId, {
        status: 'failed',
        errorMessage,
        retryCount: job.retryCount + 1
      });

      // Update printer status
      if (job.printerId) {
        await Printer.findByIdAndUpdate(job.printerId, {
          currentJob: null,
          queueLength: Math.max(0, (await Printer.findById(job.printerId))?.queueLength - 1 || 0)
        });
      }

      console.log(`❌ Print job failed: ${job.orderNumber} - ${errorMessage}`);

      // Retry if under max retries
      if (job.retryCount < job.maxRetries) {
        setTimeout(async () => {
          await PrintJob.findByIdAndUpdate(jobId, {
            status: 'pending',
            printerId: null,
            printerName: null,
            startedAt: null,
            errorMessage: null
          });
          console.log(`🔄 Retrying print job: ${job.orderNumber}`);
        }, 60000); // Retry after 1 minute
      }
    } catch (error) {
      console.error('Error failing print job:', error);
    }
  }

  public async getQueueStatus(): Promise<PrintQueueStatus> {
    try {
      await connectDB();

      const [
        totalJobs,
        pendingJobs,
        printingJobs,
        completedJobs,
        failedJobs,
        availablePrinters,
        busyPrinters
      ] = await Promise.all([
        PrintJob.countDocuments(),
        PrintJob.countDocuments({ status: 'pending' }),
        PrintJob.countDocuments({ status: 'printing' }),
        PrintJob.countDocuments({ status: 'completed' }),
        PrintJob.countDocuments({ status: 'failed' }),
        Printer.countDocuments({ 
          isActive: true, 
          autoPrintEnabled: true, 
          status: 'online',
          $or: [{ currentJob: { $exists: false } }, { currentJob: null }]
        }),
        Printer.countDocuments({ 
          isActive: true, 
          status: 'online',
          currentJob: { $exists: true, $ne: null }
        })
      ]);

      return {
        totalJobs,
        pendingJobs,
        printingJobs,
        completedJobs,
        failedJobs,
        availablePrinters,
        busyPrinters
      };
    } catch (error) {
      console.error('Error getting queue status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const printQueueManager = PrintQueueManager.getInstance();
