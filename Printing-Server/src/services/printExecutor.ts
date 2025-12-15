/**
 * Print Executor Service
 * Handles actual printing of documents with order summary and segmented printing
 */

import { print } from 'pdf-to-printer';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { validateFile } from '../utils/fileValidator';
import { generateOrderSummaryPDF } from './orderSummaryGenerator';
import { mergeDocumentWithSummary, mergePDFsInReverseOrder } from '../utils/pdfMerger';
import { PrintSegment, getExecutionOrder } from './segmentAnalyzer';
import { PDFDocument } from 'pdf-lib';
import { IOrder } from '../models/Order';

export interface PrintJobOptions {
  fileURL: string;
  fileName: string;
  printingOptions: {
    pageSize: 'A4' | 'A3';
    color: 'color' | 'bw' | 'mixed';
    sided: 'single' | 'double';
    copies: number;
    pageCount?: number;
    pageColors?: {
      colorPages?: number[];
      bwPages?: number[];
    };
  };
  printerName: string;
  orderId: string;
  printJobId: string; // UUID for idempotency
  order?: IOrder; // Full order object for order summary generation
  segments?: PrintSegment[]; // Print segments for mixed printing
}

/**
 * Download file from URL
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    fs.writeFileSync(outputPath, buffer);
  } catch (error) {
    throw new Error(`Error downloading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert file to PDF if needed
 * For now, we assume files are already PDFs or can be printed directly
 */
async function convertToPrintFormat(filePath: string, options: PrintJobOptions): Promise<string> {
  // For now, we'll assume the file is already in a printable format
  // In the future, you might want to add conversion logic here
  // (e.g., DOCX to PDF, images to PDF, etc.)
  
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') {
    return filePath; // Already PDF
  }

  // For non-PDF files, you would need to add conversion logic here
  // For now, we'll throw an error for unsupported formats
  throw new Error(`Unsupported file format: ${ext}. Only PDF files are supported.`);
}

/**
 * Extract pages from PDF
 */
async function extractPagesFromPDF(pdfBuffer: Buffer, pageRange: { start: number; end: number }): Promise<Buffer> {
  try {
    const sourcePdf = await PDFDocument.load(pdfBuffer);
    const targetPdf = await PDFDocument.create();
    
    // PDF pages are 0-indexed, but our pageRange is 1-indexed
    const startIndex = pageRange.start - 1;
    const endIndex = pageRange.end - 1;
    
    for (let i = startIndex; i <= endIndex && i < sourcePdf.getPageCount(); i++) {
      const [page] = await targetPdf.copyPages(sourcePdf, [i]);
      targetPdf.addPage(page);
    }
    
    const pdfBytes = await targetPdf.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    throw new Error(`Failed to extract pages ${pageRange.start}-${pageRange.end}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute segmented print job with order summary
 * Prints segments in reverse order (last segment first) so final stack is correct
 * Order summary is printed LAST (so it appears FIRST physically on top)
 */
export async function executeSegmentedPrint(
  order: IOrder,
  segments: PrintSegment[],
  documentBuffer: Buffer,
  printerName: string
): Promise<void> {
  const tempDir = os.tmpdir();
  const orderSummaryPath = path.join(tempDir, `summary_${order.orderId}_${Date.now()}.pdf`);
  const segmentPaths: string[] = [];
  const { Order } = await import('../models/Order');
  const { randomUUID } = await import('crypto');

  try {
    console.log(`📋 Executing segmented print for order: ${order.orderId}`);
    console.log(`   Segments: ${segments.length}`);

    // Generate order summary PDF
    console.log(`📄 Generating order summary PDF...`);
    const orderSummaryBuffer = await generateOrderSummaryPDF(order);
    fs.writeFileSync(orderSummaryPath, orderSummaryBuffer);
    console.log(`✅ Order summary generated`);

    // Get segments in reverse execution order (last segment first)
    const executionOrder = getExecutionOrder(segments);
    console.log(`🔄 Printing segments in reverse order (last segment first)`);

    // Print each segment in reverse order
    for (let i = 0; i < executionOrder.length; i++) {
      const segment = executionOrder[i];
      
      console.log(`📄 Printing segment ${i + 1}/${executionOrder.length}: Pages ${segment.pageRange.start}-${segment.pageRange.end} (${segment.printMode})`);

      // Update segment status to 'printing'
      const segmentPrintJobId = randomUUID();
      await Order.findOneAndUpdate(
        { _id: order._id, 'printSegments.segmentId': segment.segmentId },
        {
          $set: {
            'printSegments.$.status': 'printing',
            'printSegments.$.printJobId': segmentPrintJobId,
            'printSegments.$.startedAt': new Date(),
          },
        }
      );

      try {
        // Extract pages for this segment
        const segmentBuffer = await extractPagesFromPDF(documentBuffer, segment.pageRange);
        const segmentPath = path.join(tempDir, `segment_${segment.segmentId}_${Date.now()}.pdf`);
        fs.writeFileSync(segmentPath, segmentBuffer);
        segmentPaths.push(segmentPath);

        // Prepare print options for segment
        const printOptions: any = {
          printer: printerName,
          copies: segment.copies || 1,
        };

        // Set color mode based on segment
        if (segment.printMode === 'color') {
          // Note: pdf-to-printer may need additional options for color mode
          // This depends on your printer driver
        } else {
          // B&W mode
          // Note: pdf-to-printer may need additional options for B&W mode
        }

        // Print segment
        await print(segmentPath, printOptions);
        
        // Update segment status to 'completed'
        await Order.findOneAndUpdate(
          { _id: order._id, 'printSegments.segmentId': segment.segmentId },
          {
            $set: {
              'printSegments.$.status': 'completed',
              'printSegments.$.completedAt': new Date(),
            },
            $unset: {
              'printSegments.$.error': '',
            },
          }
        );
        
        console.log(`✅ Segment ${segment.segmentId} printed`);
      } catch (segmentError) {
        // Update segment status to 'failed'
        const errorMessage = segmentError instanceof Error ? segmentError.message : 'Unknown error';
        await Order.findOneAndUpdate(
          { _id: order._id, 'printSegments.segmentId': segment.segmentId },
          {
            $set: {
              'printSegments.$.status': 'failed',
              'printSegments.$.error': errorMessage,
            },
          }
        );
        console.error(`❌ Segment ${segment.segmentId} failed: ${errorMessage}`);
        throw segmentError; // Re-throw to stop printing
      }
    }

    // Finally, print order summary LAST (so it appears FIRST physically on top)
    console.log(`📄 Printing order summary (will appear on top of stack)...`);
    await print(orderSummaryPath, {
      printer: printerName,
      copies: 1,
    });
    console.log(`✅ Order summary printed`);

    console.log(`✅ Segmented print job completed: ${order.orderId}`);
  } catch (error) {
    console.error(`❌ Error executing segmented print job:`, error);
    throw new Error(`Segmented print execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Cleanup temporary files
    try {
      if (fs.existsSync(orderSummaryPath)) {
        fs.unlinkSync(orderSummaryPath);
      }
      segmentPaths.forEach((segmentPath) => {
        if (fs.existsSync(segmentPath)) {
          fs.unlinkSync(segmentPath);
        }
      });
      console.log(`🗑️  Cleaned up temporary files`);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
  }
}

/**
 * Execute print job with order summary
 * Merges order summary with document in reverse order
 */
export async function executePrint(options: PrintJobOptions): Promise<void> {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `print_${Date.now()}_${options.fileName}`);
  const mergedFilePath = path.join(tempDir, `merged_${Date.now()}_${options.fileName}`);
  
  try {
    console.log(`📥 Downloading file: ${options.fileName}`);
    
    // Download file
    await downloadFile(options.fileURL, tempFilePath);
    
    console.log(`✅ File downloaded: ${tempFilePath}`);

    // Validate file integrity
    const validation = validateFile(tempFilePath);
    if (!validation.valid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }
    console.log(`✅ File validation passed`);

    // Convert to print format if needed
    const printFilePath = await convertToPrintFormat(tempFilePath, options);

    // Generate order summary if order object is provided
    let finalPrintPath = printFilePath;
    if (options.order) {
      console.log(`📄 Generating order summary PDF...`);
      const orderSummaryBuffer = await generateOrderSummaryPDF(options.order);
      const documentBuffer = fs.readFileSync(printFilePath);
      
      // Merge document with order summary (order summary goes LAST in PDF, prints FIRST physically)
      console.log(`🔄 Merging document with order summary (reverse order)...`);
      const mergedBuffer = await mergeDocumentWithSummary(documentBuffer, orderSummaryBuffer);
      fs.writeFileSync(mergedFilePath, mergedBuffer);
      finalPrintPath = mergedFilePath;
      console.log(`✅ Document merged with order summary`);
    }

    // Prepare print options
    const printOptions: any = {
      printer: options.printerName,
      copies: options.printingOptions.copies || 1,
    };

    // Handle segmented printing if segments are provided
    if (options.segments && options.segments.length > 0) {
      const documentBuffer = fs.readFileSync(printFilePath);
      await executeSegmentedPrint(options.order!, options.segments, documentBuffer, options.printerName);
      return; // Segmented print handles its own cleanup
    }

    // Handle page range for color/BW printing (legacy mixed printing)
    if (options.printingOptions.color === 'mixed' && options.printingOptions.pageColors) {
      const colorPages = options.printingOptions.pageColors.colorPages || [];
      const bwPages = options.printingOptions.pageColors.bwPages || [];

      if (colorPages.length > 0) {
        printOptions.pages = colorPages.join(',');
        console.log(`🖨️  Printing color pages: ${colorPages.join(',')}`);
        await print(finalPrintPath, printOptions);
      }

      if (bwPages.length > 0) {
        printOptions.pages = bwPages.join(',');
        console.log(`🖨️  Printing BW pages: ${bwPages.join(',')}`);
        await print(finalPrintPath, printOptions);
      }
    } else {
      // Standard printing
      console.log(`🖨️  Printing to ${options.printerName}...`);
      console.log(`   Options:`, {
        copies: printOptions.copies,
        pageSize: options.printingOptions.pageSize,
        color: options.printingOptions.color,
        sided: options.printingOptions.sided,
      });

      await print(finalPrintPath, printOptions);
    }

    console.log(`✅ Print job completed: ${options.orderId}, printJobId: ${options.printJobId}`);
  } catch (error) {
    console.error(`❌ Error executing print job:`, error);
    throw new Error(`Print execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Cleanup temporary files
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (fs.existsSync(mergedFilePath) && mergedFilePath !== tempFilePath) {
        fs.unlinkSync(mergedFilePath);
      }
      console.log(`🗑️  Cleaned up temporary files`);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
  }
}

