import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Printer from '@/models/Printer';
import PrintLog from '@/models/PrintLog';
import mongoose from 'mongoose';

/**
 * GET /api/admin/printer-monitor-data
 * Get real-time data for printer monitor page
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get orders grouped by printStatus (include max attempts and segments info)
    const pendingOrders = await Order.find({
      printStatus: 'pending',
      paymentStatus: 'completed',
    })
      .select('_id orderId originalFileName originalFileNames fileURL fileURLs printStatus printError printerName printAttempt maxPrintAttempts printSegments createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Get orders that exceeded max attempts (require admin action)
    const maxAttemptsReached = await Order.find({
      printStatus: 'pending',
      paymentStatus: 'completed',
      $expr: {
        $gte: [
          { $ifNull: ['$printAttempt', 0] },
          { $ifNull: ['$maxPrintAttempts', 3] }
        ]
      },
    })
      .select('_id orderId originalFileName originalFileNames printStatus printError printAttempt maxPrintAttempts printSegments createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const printingOrders = await Order.find({
      printStatus: 'printing',
    })
      .select('_id orderId originalFileName originalFileNames fileURL fileURLs printStatus printError printerName printStartedAt printAttempt maxPrintAttempts printingBy printingHeartbeatAt printSegments createdAt')
      .sort({ printStartedAt: -1 })
      .limit(50)
      .lean();

    // Get printed orders from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const printedOrders = await Order.find({
      printStatus: 'printed',
      printCompletedAt: { $gte: twentyFourHoursAgo },
    })
      .select('_id orderId originalFileName originalFileNames fileURL fileURLs printStatus printerName printCompletedAt printSegments createdAt')
      .sort({ printCompletedAt: -1 })
      .limit(100)
      .lean();

    // Get all active printers with health status
    const printers = await Printer.find({ isActive: true })
      .select('_id name printer_id printer_name status last_seen_at last_successful_print_at queue_length error_message driver_name system_name connectionType connectionString')
      .sort({ name: 1 });

    // Get recent print logs (last 50)
    const recentLogs = await PrintLog.find()
      .select('action orderId printJobId adminEmail previousStatus newStatus reason timestamp metadata')
      .sort({ timestamp: -1 })
      .limit(50);

    // Get recent alerts from logs
    const recentAlerts = await PrintLog.find({
      action: 'alert',
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    })
      .select('action orderId reason timestamp metadata')
      .sort({ timestamp: -1 })
      .limit(20);

    // Get latest metrics
    const Metrics = mongoose.models.Metrics || mongoose.model('Metrics', new mongoose.Schema({
      timestamp: Date,
      prints_per_hour: Number,
      failures_per_hour: Number,
      average_print_start_delay: Number,
      printer_offline_duration: Number,
      workerId: String,
    }, { timestamps: true }));

    const latestMetrics = await Metrics.findOne()
      .sort({ timestamp: -1 })
      .limit(1);

    // Format orders for display
    const formatOrder = (order: any) => {
      const fileNames = (order.originalFileNames && Array.isArray(order.originalFileNames) && order.originalFileNames.length > 0)
        ? order.originalFileNames
        : order.originalFileName
          ? [order.originalFileName]
          : ['Unknown file'];

      // Calculate execution order for segments (reverse order for printing)
      let segmentsWithOrder: any[] = [];
      if (order.printSegments && Array.isArray(order.printSegments) && order.printSegments.length > 0) {
        // Sort segments by page range descending (last segment first for printing)
        const sortedSegments = [...order.printSegments].sort((a: any, b: any) => {
          const aEnd = a?.pageRange?.end || 0;
          const bEnd = b?.pageRange?.end || 0;
          if (bEnd !== aEnd) {
            return bEnd - aEnd;
          }
          const aStart = a?.pageRange?.start || 0;
          const bStart = b?.pageRange?.start || 0;
          return bStart - aStart;
        });
        
        segmentsWithOrder = sortedSegments.map((seg: any, index: number) => ({
          segmentId: seg?.segmentId || '',
          pageRange: seg?.pageRange || { start: 1, end: 1 },
          printMode: seg?.printMode || 'bw',
          copies: seg?.copies || 1,
          paperSize: seg?.paperSize || 'A4',
          duplex: seg?.duplex || false,
          status: seg?.status || 'pending',
          printJobId: seg?.printJobId,
          startedAt: seg?.startedAt,
          completedAt: seg?.completedAt,
          error: seg?.error,
          executionOrder: index + 1, // Execution order (1 = prints first physically)
        }));
      }

      return {
        _id: order._id.toString(),
        orderId: order.orderId,
        fileName: fileNames[0],
        fileNames: fileNames,
        printStatus: order.printStatus,
        printerName: order.printerName || 'N/A',
        createdAt: order.createdAt,
        printStartedAt: order.printStartedAt,
        printCompletedAt: order.printCompletedAt,
        errorMessage: order.printError,
        printAttempt: order.printAttempt || 0,
        maxPrintAttempts: order.maxPrintAttempts || 3,
        printingBy: order.printingBy,
        printingHeartbeatAt: order.printingHeartbeatAt,
        requiresAdminAction: (order.printAttempt || 0) >= (order.maxPrintAttempts || 3),
        printSegments: segmentsWithOrder,
      };
    };

    return NextResponse.json({
      success: true,
      data: {
        orders: {
          pending: pendingOrders.map(formatOrder),
          printing: printingOrders.map(formatOrder),
          printed: printedOrders.map(formatOrder),
          maxAttemptsReached: maxAttemptsReached.map(formatOrder),
        },
        printers: printers.map((printer: any) => ({
          _id: printer._id.toString(),
          name: printer.name,
          printer_id: printer.printer_id,
          printer_name: printer.printer_name || printer.name,
          status: printer.status,
          connectionType: printer.connectionType,
          queue_length: printer.queue_length || 0,
          last_seen_at: printer.last_seen_at,
          last_successful_print_at: printer.last_successful_print_at,
          error_message: printer.error_message,
          driver_name: printer.driver_name,
          system_name: printer.system_name,
        })),
        recentLogs: recentLogs.map((log: any) => ({
          action: log.action,
          orderId: log.orderId,
          printJobId: log.printJobId,
          adminEmail: log.adminEmail,
          previousStatus: log.previousStatus,
          newStatus: log.newStatus,
          reason: log.reason,
          timestamp: log.timestamp,
          metadata: log.metadata,
        })),
        alerts: recentAlerts.map((alert: any) => ({
          type: alert.metadata?.alertType || 'unknown',
          severity: alert.metadata?.severity || 'warning',
          message: alert.reason,
          timestamp: alert.timestamp,
          metadata: alert.metadata,
        })),
        metrics: latestMetrics ? {
          prints_per_hour: latestMetrics.prints_per_hour || 0,
          failures_per_hour: latestMetrics.failures_per_hour || 0,
          average_print_start_delay: latestMetrics.average_print_start_delay || 0,
          printer_offline_duration: latestMetrics.printer_offline_duration || 0,
          timestamp: latestMetrics.timestamp,
        } : null,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching printer monitor data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

