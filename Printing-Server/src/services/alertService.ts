/**
 * Alert Service
 * Detects critical conditions and logs alerts
 */

import { Order } from '../models/Order';
import { Printer } from '../models/Printer';
import { PrintLog } from '../models/PrintLog';
import { getStaleJobCount } from './staleJobDetector';

const PRINTER_OFFLINE_THRESHOLD_MINUTES = parseInt(process.env.PRINTER_OFFLINE_THRESHOLD_MINUTES || '10', 10);
const QUEUE_BACKLOG_THRESHOLD = parseInt(process.env.QUEUE_BACKLOG_THRESHOLD || '20', 10);

export interface Alert {
  type: 'repeated_failure' | 'printer_offline' | 'stale_job' | 'admin_override' | 'queue_backlog';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Check for alert conditions
 */
export async function checkAlertConditions(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // 1. Check for orders that failed > 2 times
    const repeatedFailures = await Order.find({
      printStatus: 'pending',
      printError: { $exists: true, $ne: null },
      printAttempt: { $gte: 3 },
    }).limit(10);

    if (repeatedFailures.length > 0) {
      alerts.push({
        type: 'repeated_failure',
        severity: 'warning',
        message: `${repeatedFailures.length} order(s) have failed 3+ times and require admin action`,
        metadata: {
          orderIds: repeatedFailures.map(o => o.orderId),
          count: repeatedFailures.length,
        },
        timestamp: new Date(),
      });
    }

    // 2. Check for printers offline > threshold
    const printers = await Printer.find({ isActive: true });
    const now = new Date();

    for (const printer of printers) {
      if (printer.status === 'offline' || printer.status === 'error') {
        if (printer.last_seen_at) {
          const offlineDuration = (now.getTime() - printer.last_seen_at.getTime()) / (1000 * 60); // minutes
          if (offlineDuration > PRINTER_OFFLINE_THRESHOLD_MINUTES) {
            alerts.push({
              type: 'printer_offline',
              severity: printer.status === 'error' ? 'error' : 'warning',
              message: `Printer ${printer.name} has been ${printer.status} for ${Math.round(offlineDuration)} minutes`,
              metadata: {
                printerId: printer._id.toString(),
                printerName: printer.name,
                status: printer.status,
                offlineDurationMinutes: Math.round(offlineDuration),
                errorMessage: printer.error_message,
              },
              timestamp: new Date(),
            });
          }
        }
      }
    }

    // 3. Check for stale jobs
    const staleJobCount = await getStaleJobCount();
    if (staleJobCount > 0) {
      alerts.push({
        type: 'stale_job',
        severity: 'warning',
        message: `${staleJobCount} stale printing job(s) detected`,
        metadata: {
          count: staleJobCount,
        },
        timestamp: new Date(),
      });
    }

    // 4. Check for recent admin overrides
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentOverrides = await PrintLog.find({
      action: { $in: ['force_printed', 'reset_state', 'reprint'] },
      timestamp: { $gte: oneHourAgo },
    }).limit(10);

    if (recentOverrides.length > 0) {
      alerts.push({
        type: 'admin_override',
        severity: 'warning',
        message: `${recentOverrides.length} admin override(s) in the last hour`,
        metadata: {
          actions: recentOverrides.map(log => ({
            action: log.action,
            orderId: log.orderId,
            adminEmail: log.adminEmail,
            timestamp: log.timestamp,
          })),
          count: recentOverrides.length,
        },
        timestamp: new Date(),
      });
    }

    // 5. Check for queue backlog
    const pendingCount = await Order.countDocuments({
      printStatus: 'pending',
      paymentStatus: 'completed',
    });

    if (pendingCount > QUEUE_BACKLOG_THRESHOLD) {
      alerts.push({
        type: 'queue_backlog',
        severity: pendingCount > QUEUE_BACKLOG_THRESHOLD * 2 ? 'error' : 'warning',
        message: `Print queue backlog: ${pendingCount} pending order(s)`,
        metadata: {
          pendingCount,
          threshold: QUEUE_BACKLOG_THRESHOLD,
        },
        timestamp: new Date(),
      });
    }

    // Log alerts to print_logs
    for (const alert of alerts) {
      try {
        await PrintLog.create({
          action: 'alert',
          orderId: 'system',
          reason: alert.message,
          timestamp: alert.timestamp,
          metadata: {
            alertType: alert.type,
            severity: alert.severity,
            ...alert.metadata,
          },
        });
      } catch (logError) {
        console.error('Error logging alert:', logError);
      }
    }

    return alerts;
  } catch (error) {
    console.error('❌ Error checking alert conditions:', error);
    return alerts;
  }
}

/**
 * Get active alerts
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  return await checkAlertConditions();
}

