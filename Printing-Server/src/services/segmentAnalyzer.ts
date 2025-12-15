/**
 * Segment Analyzer Service
 * Analyzes documents to identify print segments based on color/BW pages
 */

import { IOrder } from '../models/Order';
import { randomUUID } from 'crypto';

export interface PrintSegment {
  segmentId: string;
  pageRange: {
    start: number;
    end: number;
  };
  printMode: 'color' | 'bw';
  copies: number;
  paperSize: 'A4' | 'A3';
  duplex: boolean;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  printJobId?: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Analyze document to identify print segments
 * Returns segments sorted in execution order (last segment first for reverse printing)
 */
export async function analyzeDocumentSegments(order: IOrder): Promise<PrintSegment[]> {
  const segments: PrintSegment[] = [];
  const pageCount = order.printingOptions?.pageCount || 1;
  const copies = order.printingOptions?.copies || 1;
  const paperSize = order.printingOptions?.pageSize || 'A4';
  const duplex = order.printingOptions?.sided === 'double';
  const colorMode = order.printingOptions?.color || 'bw';

  // If not mixed printing, create a single segment
  if (colorMode !== 'mixed') {
    const segment: PrintSegment = {
      segmentId: randomUUID(),
      pageRange: {
        start: 1,
        end: pageCount,
      },
      printMode: colorMode === 'color' ? 'color' : 'bw',
      copies,
      paperSize,
      duplex,
      status: 'pending',
    };
    segments.push(segment);
    return segments;
  }

  // Mixed printing: analyze page colors
  const pageColors = order.printingOptions?.pageColors;
  
  if (!pageColors) {
    // No page color info, create single segment with mixed mode
    const segment: PrintSegment = {
      segmentId: randomUUID(),
      pageRange: {
        start: 1,
        end: pageCount,
      },
      printMode: 'color', // Default to color if mixed but no info
      copies,
      paperSize,
      duplex,
      status: 'pending',
    };
    segments.push(segment);
    return segments;
  }

  // Handle both single object and array format for pageColors
  let colorPages: number[] = [];
  let bwPages: number[] = [];

  if (Array.isArray(pageColors)) {
    // Per-file page colors
    colorPages = pageColors.reduce((acc, pc) => {
      return acc.concat(pc.colorPages || []);
    }, [] as number[]);
    bwPages = pageColors.reduce((acc, pc) => {
      return acc.concat(pc.bwPages || []);
    }, [] as number[]);
  } else {
    // Single object format
    colorPages = pageColors.colorPages || [];
    bwPages = pageColors.bwPages || [];
  }

  // Sort page numbers
  colorPages.sort((a, b) => a - b);
  bwPages.sort((a, b) => a - b);

  // Group consecutive pages into segments
  const colorSegments = groupConsecutivePages(colorPages);
  const bwSegments = groupConsecutivePages(bwPages);

  // Create segments for color pages
  for (const range of colorSegments) {
    segments.push({
      segmentId: randomUUID(),
      pageRange: range,
      printMode: 'color',
      copies,
      paperSize,
      duplex,
      status: 'pending',
    });
  }

  // Create segments for BW pages
  for (const range of bwSegments) {
    segments.push({
      segmentId: randomUUID(),
      pageRange: range,
      printMode: 'bw',
      copies,
      paperSize,
      duplex,
      status: 'pending',
    });
  }

  // Sort segments by page range (ascending) - will be reversed for printing
  segments.sort((a, b) => a.pageRange.start - b.pageRange.start);

  return segments;
}

/**
 * Group consecutive page numbers into ranges
 */
function groupConsecutivePages(pages: number[]): Array<{ start: number; end: number }> {
  if (pages.length === 0) {
    return [];
  }

  const ranges: Array<{ start: number; end: number }> = [];
  let start = pages[0];
  let end = pages[0];

  for (let i = 1; i < pages.length; i++) {
    if (pages[i] === end + 1) {
      // Consecutive page
      end = pages[i];
    } else {
      // Break in sequence
      ranges.push({ start, end });
      start = pages[i];
      end = pages[i];
    }
  }

  // Add the last range
  ranges.push({ start, end });

  return ranges;
}

/**
 * Get segments in reverse execution order
 * Last segment first, so it prints first physically
 */
export function getSegmentsInReverseOrder(segments: PrintSegment[]): PrintSegment[] {
  // Sort by page range descending (last segment first)
  return [...segments].sort((a, b) => {
    // Sort by end page descending, then by start page descending
    if (b.pageRange.end !== a.pageRange.end) {
      return b.pageRange.end - a.pageRange.end;
    }
    return b.pageRange.start - a.pageRange.start;
  });
}

/**
 * Get execution order for segments
 * Returns segments sorted for printing (last segment first)
 */
export function getExecutionOrder(segments: PrintSegment[]): PrintSegment[] {
  return getSegmentsInReverseOrder(segments);
}

