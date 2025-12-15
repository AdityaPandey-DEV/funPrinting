/**
 * PDF Merger Utility
 * Merges PDFs in reverse order to ensure correct physical print stack
 * 
 * IMPORTANT: Most printers print in REVERSE ORDER (last page first)
 * Therefore, to get Order Summary on TOP physically:
 * - Order Summary must be LAST in the PDF file
 * - Document pages come FIRST in the PDF file
 * 
 * Physical output (top to bottom):
 *   Order Summary (top)
 *   Document Page 1
 *   Document Page 2
 *   ...
 *   Document Page N
 */

import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';

/**
 * Merge PDFs in reverse order
 * @param documentBuffers - Array of PDF buffers for document pages (will be first in PDF)
 * @param orderSummaryBuffer - Order summary PDF buffer (will be last in PDF, prints first)
 * @returns Merged PDF buffer
 */
export async function mergePDFsInReverseOrder(
  documentBuffers: Buffer[],
  orderSummaryBuffer: Buffer
): Promise<Buffer> {
  try {
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // First, add all document pages (these will be in the middle/end of physical stack)
    for (const docBuffer of documentBuffers) {
      try {
        const sourcePdf = await PDFDocument.load(docBuffer);
        const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      } catch (error) {
        console.error('Error merging document PDF:', error);
        throw new Error(`Failed to merge document PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Finally, add order summary page (this will be LAST in PDF, so it prints FIRST physically)
    try {
      const summaryPdf = await PDFDocument.load(orderSummaryBuffer);
      const summaryPages = await mergedPdf.copyPages(summaryPdf, summaryPdf.getPageIndices());
      summaryPages.forEach((page) => mergedPdf.addPage(page));
    } catch (error) {
      console.error('Error merging order summary PDF:', error);
      throw new Error(`Failed to merge order summary PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Save the merged PDF
    const pdfBytes = await mergedPdf.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw new Error(`PDF merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Merge a single document PDF with order summary
 * @param documentBuffer - Single document PDF buffer
 * @param orderSummaryBuffer - Order summary PDF buffer
 * @returns Merged PDF buffer
 */
export async function mergeDocumentWithSummary(
  documentBuffer: Buffer,
  orderSummaryBuffer: Buffer
): Promise<Buffer> {
  return mergePDFsInReverseOrder([documentBuffer], orderSummaryBuffer);
}

/**
 * Save merged PDF to file (for debugging/testing)
 */
export async function saveMergedPDFToFile(
  mergedBuffer: Buffer,
  outputPath: string
): Promise<void> {
  try {
    fs.writeFileSync(outputPath, mergedBuffer);
    console.log(`✅ Saved merged PDF to: ${outputPath}`);
  } catch (error) {
    console.error('Error saving merged PDF:', error);
    throw new Error(`Failed to save merged PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

