/**
 * Metrics Collector Service
 * Tracks and stores system metrics for monitoring
 */

import { Metrics } from '../models/Metrics';
import { Order } from '../models/Order';
import { Printer } from '../models/Printer';
import { getWorkerId } from '../utils/workerId';

const METRICS_STORAGE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const METRICS_RETENTION_DAYS = 7;

interface PrintEvent {
  timestamp: Date;
  orderId: string;
  success: boolean;
  delay?: number; // seconds from pending to printing
}

interface PrinterOfflineEvent {
  startTime: Date;
  endTime?: Date;
}

// In-memory tracking
const printEvents: PrintEvent[] = [];
const printerOfflineEvents: PrinterOfflineEvent[] = [];
let lastPrinterOfflineTime: Date | null = null;

/**
 * Record a print event
 */
export function recordPrintEvent(orderId: string, success: boolean, delay?: number): void {
  printEvents.push({
    timestamp: new Date(),
    orderId,
    success,
    delay,
  });

  // Keep only last hour of events
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  while (printEvents.length > 0 && printEvents[0].timestamp < oneHourAgo) {
    printEvents.shift();
  }
}

/**
 * Record printer offline event
 */
export function recordPrinterOffline(): void {
  if (!lastPrinterOfflineTime) {
    lastPrinterOfflineTime = new Date();
  }
}

/**
 * Record printer online event
 */
export function recordPrinterOnline(): void {
  if (lastPrinterOfflineTime) {
    printerOfflineEvents.push({
      startTime: lastPrinterOfflineTime,
      endTime: new Date(),
    });
    lastPrinterOfflineTime = null;

    // Keep only last 24 hours of events
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    while (printerOfflineEvents.length > 0 && printerOfflineEvents[0].startTime < oneDayAgo) {
      printerOfflineEvents.shift();
    }
  }
}

/**
 * Calculate metrics from tracked events
 */
async function calculateMetrics(): Promise<{
  prints_per_hour: number;
  failures_per_hour: number;
  average_print_start_delay: number;
  printer_offline_duration: number;
}> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Calculate prints per hour
  const recentPrints = printEvents.filter(e => e.timestamp >= oneHourAgo);
  const prints_per_hour = recentPrints.length;

  // Calculate failures per hour
  const recentFailures = recentPrints.filter(e => !e.success);
  const failures_per_hour = recentFailures.length;

  // Calculate average print start delay
  const delays = recentPrints
    .filter(e => e.delay !== undefined)
    .map(e => e.delay!);
  const average_print_start_delay = delays.length > 0
    ? delays.reduce((a, b) => a + b, 0) / delays.length
    : 0;

  // Calculate printer offline duration (last hour)
  const recentOfflineEvents = printerOfflineEvents.filter(e => {
    const eventEnd = e.endTime || new Date();
    return eventEnd >= oneHourAgo;
  });

  let printer_offline_duration = 0;
  for (const event of recentOfflineEvents) {
    const start = event.startTime < oneHourAgo ? oneHourAgo : event.startTime;
    const end = event.endTime || new Date();
    printer_offline_duration += (end.getTime() - start.getTime()) / 1000; // seconds
  }

  // Add current offline duration if printer is currently offline
  if (lastPrinterOfflineTime) {
    const start = lastPrinterOfflineTime < oneHourAgo ? oneHourAgo : lastPrinterOfflineTime;
    const now = new Date();
    printer_offline_duration += (now.getTime() - start.getTime()) / 1000; // seconds
  }

  return {
    prints_per_hour,
    failures_per_hour,
    average_print_start_delay,
    printer_offline_duration,
  };
}

/**
 * Store metrics to MongoDB
 */
async function storeMetrics(): Promise<void> {
  try {
    const workerId = getWorkerId();
    const metrics = await calculateMetrics();

    const metricsDoc = new Metrics({
      timestamp: new Date(),
      prints_per_hour: metrics.prints_per_hour,
      failures_per_hour: metrics.failures_per_hour,
      average_print_start_delay: metrics.average_print_start_delay,
      printer_offline_duration: metrics.printer_offline_duration,
      workerId,
    });

    await metricsDoc.save();
    console.log(`📊 Metrics stored: ${metrics.prints_per_hour} prints/h, ${metrics.failures_per_hour} failures/h`);
  } catch (error) {
    console.error('❌ Error storing metrics:', error);
  }
}

/**
 * Clean up old metrics (keep last 7 days)
 */
async function cleanupOldMetrics(): Promise<void> {
  try {
    const retentionDate = new Date(Date.now() - METRICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await Metrics.deleteMany({
      timestamp: { $lt: retentionDate },
    });
    
    if (result.deletedCount > 0) {
      console.log(`🗑️  Cleaned up ${result.deletedCount} old metrics`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up old metrics:', error);
  }
}

/**
 * Calculate delay from order creation to printing start
 */
export async function calculatePrintDelay(orderId: string): Promise<number | undefined> {
  try {
    const order = await Order.findOne({ orderId });
    if (!order || !order.printStartedAt || !order.createdAt) {
      return undefined;
    }

    const delay = (order.printStartedAt.getTime() - order.createdAt.getTime()) / 1000; // seconds
    return delay;
  } catch (error) {
    console.error('Error calculating print delay:', error);
    return undefined;
  }
}

/**
 * Start metrics collection
 */
export function startMetricsCollection(): void {
  console.log(`📊 Starting metrics collection (interval: ${METRICS_STORAGE_INTERVAL}ms)`);

  // Store metrics immediately
  storeMetrics();

  // Then store at intervals
  setInterval(storeMetrics, METRICS_STORAGE_INTERVAL);

  // Clean up old metrics daily
  setInterval(cleanupOldMetrics, 24 * 60 * 60 * 1000);
}

/**
 * Get latest metrics
 */
export async function getLatestMetrics(): Promise<any> {
  try {
    const workerId = getWorkerId();
    const latest = await Metrics.findOne({ workerId })
      .sort({ timestamp: -1 })
      .limit(1);

    if (!latest) {
      // Return current calculated metrics if no stored metrics
      return await calculateMetrics();
    }

    return {
      prints_per_hour: latest.prints_per_hour,
      failures_per_hour: latest.failures_per_hour,
      average_print_start_delay: latest.average_print_start_delay,
      printer_offline_duration: latest.printer_offline_duration,
      timestamp: latest.timestamp,
    };
  } catch (error) {
    console.error('Error getting latest metrics:', error);
    return await calculateMetrics();
  }
}

