/**
 * Order Processor Service
 * Handles polling MongoDB for pending orders and processing them
 */

import { Order } from '../models/Order';
import { Printer } from '../models/Printer';
import { claimOrderForPrinting, markOrderAsPrinted, markOrderAsFailed, isPrintJobIdAlreadyPrinted } from '../utils/atomicUpdate';
import { executePrint, executeSegmentedPrint } from './printExecutor';
import { getAvailablePrinter } from './printerHealth';
import { getWorkerId } from '../utils/workerId';
import { validateCapabilities } from '../utils/capabilityValidator';
import { recordPrintEvent, calculatePrintDelay } from './metricsCollector';
import { updateHeartbeat } from './heartbeatService';
import { analyzeDocumentSegments, PrintSegment, getExecutionOrder } from './segmentAnalyzer';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ORDER_POLL_INTERVAL = parseInt(process.env.ORDER_POLL_INTERVAL || '5000', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

let isProcessing = false;

/**
 * Poll MongoDB for pending orders and process them
 */
export async function pollPendingOrders(): Promise<void> {
  if (isProcessing) {
    return; // Skip if already processing
  }

  try {
    isProcessing = true;

    // Get available printer (fail-safe: must be online and auto-print enabled)
    const printer = await getAvailablePrinter();
    if (!printer) {
      console.log('⚠️  No available printer found. Skipping order processing.');
      return;
    }

    // Fail-safe check: Printer must be online and auto-print enabled
    if (printer.status !== 'online' && printer.status !== 'busy') {
      console.log(`⚠️  Printer ${printer.name} is not available (status: ${printer.status}). Skipping order processing.`);
      return;
    }

    if (printer.autoPrintEnabled !== true) {
      console.log(`⚠️  Printer ${printer.name} has auto-print disabled. Skipping order processing.`);
      return;
    }

    // Find pending orders (excluding those that exceeded max attempts)
    const pendingOrders = await Order.find({
      printStatus: 'pending',
      paymentStatus: 'completed',
      $or: [
        { fileURL: { $exists: true, $ne: null } },
        { fileURLs: { $exists: true, $ne: null, $not: { $size: 0 } } },
      ],
      // Exclude orders that exceeded max attempts
      $expr: {
        $lt: [
          { $ifNull: ['$printAttempt', 0] },
          { $ifNull: ['$maxPrintAttempts', 3] }
        ]
      },
    })
      .sort({ createdAt: 1 }) // Process oldest first
      .limit(1); // Process one at a time

    if (pendingOrders.length === 0) {
      return; // No pending orders
    }

    const order = pendingOrders[0];
    console.log(`📋 Processing order: ${order.orderId}`);

    // Validate printer capabilities before claiming
    const capabilityValidation = validateCapabilities(order, printer);
    if (!capabilityValidation.valid) {
      console.log(`⚠️  Order ${order.orderId} does not match printer capabilities: ${capabilityValidation.errors.join(', ')}`);
      // Mark order as failed with capability mismatch
      await markOrderAsFailed(
        order._id.toString(),
        `Printer capability mismatch: ${capabilityValidation.errors.join(', ')}`
      );
      return;
    }

    // Atomically claim the order
    const claimResult = await claimOrderForPrinting(
      order._id.toString(),
      printer._id.toString(),
      printer.name
    );

    if (!claimResult.success) {
      console.log(`⚠️  Failed to claim order ${order.orderId}: ${claimResult.error}`);
      return;
    }

    // Process the order
    await processOrder(claimResult.order!, printer, claimResult.printJobId!);
  } catch (error) {
    console.error('❌ Error in pollPendingOrders:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Process a single order
 */
async function processOrder(order: any, printer: any, printJobId: string): Promise<void> {
  try {
    const workerId = getWorkerId();
    
    // Fail-safe checks before processing
    // 1. Verify ownership
    if (order.printingBy !== workerId) {
      console.warn(`⚠️  Order ${order.orderId} is owned by different worker. Skipping.`);
      return;
    }

    // 2. Check idempotency: has this printJobId already been printed?
    const alreadyPrinted = await isPrintJobIdAlreadyPrinted(printJobId);
    if (alreadyPrinted) {
      console.log(`⏭️  Print job ${printJobId} already printed. Skipping duplicate.`);
      // Mark as printed if it was already printed
      await markOrderAsPrinted(order._id.toString());
      return;
    }

    // 3. Fail-safe: Check print attempt limit (double-check)
    const maxAttempts = order.maxPrintAttempts || 3;
    const currentAttempt = order.printAttempt || 0;
    if (currentAttempt >= maxAttempts) {
      console.log(`⚠️  Order ${order.orderId} exceeded max attempts (${currentAttempt}/${maxAttempts}). Skipping.`);
      return;
    }

    // 4. Fail-safe: Verify printer is still available
    const currentPrinter = await Printer.findById(printer._id);
    if (!currentPrinter || currentPrinter.status === 'error' || currentPrinter.status === 'offline' || currentPrinter.autoPrintEnabled !== true) {
      console.log(`⚠️  Printer ${printer.name} is no longer available. Resetting order.`);
      await markOrderAsFailed(order._id.toString(), 'Printer became unavailable during processing');
      return;
    }

    console.log(`🖨️  Starting print job for order: ${order.orderId}, printJobId: ${printJobId}`);

    // Update heartbeat at start of printing
    await updateHeartbeat(order._id.toString());

    // Determine file URLs
    const fileURLs = order.fileURLs && order.fileURLs.length > 0
      ? order.fileURLs
      : order.fileURL
        ? [order.fileURL]
        : [];

    if (fileURLs.length === 0) {
      throw new Error('No files to print');
    }

    // Determine file names
    const fileNames = order.originalFileNames && order.originalFileNames.length > 0
      ? order.originalFileNames
      : order.originalFileName
        ? [order.originalFileName]
        : fileURLs.map((url: string, index: number) => `file_${index + 1}.pdf`);

    // Analyze segments if mixed printing or if segments not already analyzed
    let segments: PrintSegment[] = [];
    if (order.printingOptions?.color === 'mixed' || (order.printSegments && order.printSegments.length === 0)) {
      console.log(`📊 Analyzing document segments...`);
      segments = await analyzeDocumentSegments(order);
      
      // Store segments in order document
      await Order.findByIdAndUpdate(order._id, {
        $set: {
          printSegments: segments.map(seg => ({
            segmentId: seg.segmentId,
            pageRange: seg.pageRange,
            printMode: seg.printMode,
            copies: seg.copies,
            paperSize: seg.paperSize,
            duplex: seg.duplex,
            status: 'pending',
          })),
        },
      });
      console.log(`✅ Analyzed ${segments.length} segment(s)`);
    } else if (order.printSegments && order.printSegments.length > 0) {
      // Use existing segments, but only process pending/failed ones
      segments = order.printSegments
        .filter((seg: any) => seg.status === 'pending' || seg.status === 'failed')
        .map((seg: any) => ({
          segmentId: seg.segmentId,
          pageRange: seg.pageRange || { start: 1, end: order.printingOptions?.pageCount || 1 },
          printMode: seg.printMode || (order.printingOptions?.color === 'color' ? 'color' : 'bw'),
          copies: seg.copies || order.printingOptions?.copies || 1,
          paperSize: seg.paperSize || order.printingOptions?.pageSize || 'A4',
          duplex: seg.duplex || order.printingOptions?.sided === 'double',
          status: seg.status as 'pending' | 'printing' | 'completed' | 'failed',
          printJobId: seg.printJobId,
          startedAt: seg.startedAt ? new Date(seg.startedAt) : undefined,
          completedAt: seg.completedAt ? new Date(seg.completedAt) : undefined,
          error: seg.error,
        }));
      console.log(`📊 Using existing segments: ${segments.length} pending/failed segment(s) to process`);
    }

    // Execute print for each file
    for (let i = 0; i < fileURLs.length; i++) {
      const fileURL = fileURLs[i];
      const fileName = fileNames[i] || `file_${i + 1}.pdf`;

      console.log(`📄 Printing file ${i + 1}/${fileURLs.length}: ${fileName}`);

      // Get file-specific printing options if available
      const fileOptions = order.printingOptions?.fileOptions?.[i];
      const printingOptions = fileOptions || order.printingOptions;

      // Update heartbeat before printing each file
      await updateHeartbeat(order._id.toString());

      // Check if we should use segmented printing
      if (segments.length > 0 && order.printingOptions?.color === 'mixed') {
        // Download file for segmented printing
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `doc_${order.orderId}_${Date.now()}.pdf`);
        
        try {
          const response = await fetch(fileURL);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
          }
          const buffer = await response.buffer();
          fs.writeFileSync(tempFilePath, buffer);

          // Execute segmented print (status updates handled inside executeSegmentedPrint)
          await executeSegmentedPrint(order, segments, buffer, printer.name);
        } finally {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      } else {
        // Standard printing with order summary
        await executePrint({
          fileURL,
          fileName,
          printingOptions,
          printerName: printer.name,
          orderId: order.orderId,
          printJobId: printJobId,
          order: order, // Pass order for order summary generation
          segments: segments.length > 0 ? segments : undefined,
        });
      }

      // Update heartbeat after printing each file
      await updateHeartbeat(order._id.toString());
    }

    // Mark order as printed
    const success = await markOrderAsPrinted(order._id.toString());
    if (success) {
      console.log(`✅ Order ${order.orderId} printed successfully`);

      // Record successful print event
      const delay = await calculatePrintDelay(order.orderId);
      recordPrintEvent(order.orderId, true, delay);

      // Update printer last successful print time
      await Printer.findByIdAndUpdate(printer._id, {
        $set: {
          last_successful_print_at: new Date(),
        },
      });
    } else {
      throw new Error('Failed to mark order as printed');
    }
  } catch (error) {
    console.error(`❌ Error processing order ${order.orderId}:`, error);

    // Record failed print event
    recordPrintEvent(order.orderId, false);

    // Mark failed segments
    if (order.printSegments && order.printSegments.length > 0) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      for (const segment of order.printSegments) {
        if (segment.status === 'printing') {
          await Order.findOneAndUpdate(
            { _id: order._id, 'printSegments.segmentId': segment.segmentId },
            {
              $set: {
                'printSegments.$.status': 'failed',
                'printSegments.$.error': errorMessage,
              },
            }
          );
        }
      }
    }

    // Mark order as failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await markOrderAsFailed(order._id.toString(), errorMessage);

    // Update printer error status if needed
    if (errorMessage.includes('printer') || errorMessage.includes('offline')) {
      await Printer.findByIdAndUpdate(printer._id, {
        $set: {
          status: 'error',
          error_message: errorMessage,
        },
      });
    }
  }
}

/**
 * Start the order processing loop
 */
export function startOrderProcessing(): void {
  console.log(`🔄 Starting order processing loop (interval: ${ORDER_POLL_INTERVAL}ms)`);
  
  // Process immediately
  pollPendingOrders();

  // Then process at intervals
  setInterval(pollPendingOrders, ORDER_POLL_INTERVAL);
}

/**
 * Check for stuck orders (in 'printing' state for too long)
 * Only resets orders owned by this worker
 */
export async function checkStuckOrders(): Promise<void> {
  try {
    const workerId = getWorkerId();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const stuckOrders = await Order.find({
      printStatus: 'printing',
      printingBy: workerId, // Only check orders owned by this worker
      printStartedAt: { $lt: thirtyMinutesAgo },
    });

    if (stuckOrders.length > 0) {
      console.log(`⚠️  Found ${stuckOrders.length} stuck order(s) owned by this worker`);

      for (const order of stuckOrders) {
        console.log(`🔄 Resetting stuck order: ${order.orderId}`);
        await markOrderAsFailed(
          order._id.toString(),
          'Order stuck in printing state for more than 30 minutes. Auto-reset to pending.'
        );
      }
    }
  } catch (error) {
    console.error('❌ Error checking stuck orders:', error);
  }
}

