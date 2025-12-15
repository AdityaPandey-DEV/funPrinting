/**
 * Printer Health Monitoring Service
 * Monitors printer health and updates MongoDB
 */

import { Printer } from '../models/Printer';
import { Order } from '../models/Order';
import {
  checkWindowsPrinterStatus,
  getWindowsPrinters,
  getPrinterDriverName,
  PrinterStatus,
} from '../utils/printerDriver';
import { recordPrinterOffline, recordPrinterOnline } from './metricsCollector';

const HEALTH_CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10);
const PRINTER_ID = process.env.PRINTER_ID || 'printer_001';
const PRINTER_NAME = process.env.PRINTER_NAME || 'Default Printer';
const SYSTEM_NAME = (process.env.SYSTEM_NAME || 'Windows') as 'Windows' | 'Linux';

/**
 * Check health of a specific printer
 */
export async function checkPrinterHealth(printer: any): Promise<PrinterStatus> {
  try {
    const status = await checkWindowsPrinterStatus(printer.name);
    
    // Get driver name if not set
    let driverName = printer.driver_name;
    if (!driverName) {
      driverName = await getPrinterDriverName(printer.name) || undefined;
    }

    // Update printer status in MongoDB
    await updatePrinterStatus(printer._id.toString(), status, driverName);

    // Record metrics
    if (status.status === 'offline' || status.status === 'error') {
      recordPrinterOffline();
    } else if (status.status === 'online' || status.status === 'busy') {
      recordPrinterOnline();
    }

    return status;
  } catch (error) {
    console.error(`Error checking printer health for ${printer.name}:`, error);
    
    // Update to error status
    await updatePrinterStatus(printer._id.toString(), {
      available: false,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      queueLength: 0,
    });

    return {
      available: false,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      queueLength: 0,
    };
  }
}

/**
 * Update printer status in MongoDB
 * Auto-pauses printing on hard errors, auto-resumes on recovery
 */
export async function updatePrinterStatus(
  printerId: string,
  status: PrinterStatus,
  driverName?: string
): Promise<void> {
  try {
    // Get current printer state
    const currentPrinter = await Printer.findById(printerId);
    const wasInError = currentPrinter?.status === 'error' || currentPrinter?.status === 'offline';
    const isNowInError = status.status === 'error' || status.status === 'offline';
    const isNowRecovered = (status.status === 'online' || status.status === 'busy') && wasInError;

    const updateData: any = {
      status: status.status,
      last_seen_at: new Date(),
      queue_length: status.queueLength,
      error_message: status.errorMessage || undefined,
      system_name: SYSTEM_NAME,
    };

    if (driverName) {
      updateData.driver_name = driverName;
    }

    // Auto-pause printing on hard errors
    if (isNowInError && !wasInError) {
      updateData.autoPrintEnabled = false;
      console.log(`⏸️  Auto-pausing printing due to printer error: ${status.errorMessage || status.status}`);
    }

    // Auto-resume printing when printer recovers
    if (isNowRecovered) {
      updateData.autoPrintEnabled = true;
      updateData.$unset = { error_message: '' };
      console.log(`▶️  Auto-resuming printing: printer recovered to ${status.status}`);
    } else if (status.status === 'online' || status.status === 'busy') {
      // Clear error message if printer is online (but don't auto-resume if it wasn't in error)
      updateData.$unset = { error_message: '' };
    }

    await Printer.findByIdAndUpdate(printerId, {
      $set: updateData,
    });

    console.log(`✅ Updated printer status: ${status.status} (queue: ${status.queueLength}, autoPrint: ${updateData.autoPrintEnabled ?? currentPrinter?.autoPrintEnabled ?? true})`);
  } catch (error) {
    console.error('Error updating printer status:', error);
  }
}

/**
 * Get available printer (online and not busy)
 */
export async function getAvailablePrinter(): Promise<any> {
  try {
    // Find active printers that are online or busy
    const printers = await Printer.find({
      isActive: true,
      autoPrintEnabled: true,
      status: { $in: ['online', 'busy'] },
    }).sort({ queue_length: 1 }); // Prefer printer with lowest queue

    if (printers.length === 0) {
      return null;
    }

    // Return the first available printer
    return printers[0];
  } catch (error) {
    console.error('Error getting available printer:', error);
    return null;
  }
}

/**
 * Check all printers health
 */
export async function checkAllPrintersHealth(): Promise<void> {
  try {
    console.log('🔍 Checking printer health...');

    // Get all active printers
    const printers = await Printer.find({ isActive: true });

    if (printers.length === 0) {
      console.log('⚠️  No active printers found');
      return;
    }

    // Check each printer
    for (const printer of printers) {
      await checkPrinterHealth(printer);
    }

    // Update queue lengths based on actual pending orders
    await updateQueueLengths();
  } catch (error) {
    console.error('Error checking all printers health:', error);
  }
}

/**
 * Update queue lengths based on actual pending orders
 */
async function updateQueueLengths(): Promise<void> {
  try {
    const printers = await Printer.find({ isActive: true });

    for (const printer of printers) {
      // Count orders assigned to this printer that are pending or printing
      const queueLength = await Order.countDocuments({
        printerId: printer._id.toString(),
        printStatus: { $in: ['pending', 'printing'] },
        paymentStatus: 'completed',
      });

      // Update queue length
      await Printer.findByIdAndUpdate(printer._id, {
        $set: { queue_length: queueLength },
      });
    }
  } catch (error) {
    console.error('Error updating queue lengths:', error);
  }
}

/**
 * Initialize or update printer record
 */
export async function initializePrinter(): Promise<void> {
  try {
    console.log('🔧 Initializing printer...');

    // Get Windows printers
    const windowsPrinters = await getWindowsPrinters();
    console.log(`📋 Found ${windowsPrinters.length} Windows printer(s):`, windowsPrinters);

    if (windowsPrinters.length === 0) {
      console.log('⚠️  No printers found on system');
      return;
    }

    // Use the first available printer or the one specified in env
    const printerName = PRINTER_NAME !== 'Default Printer' && windowsPrinters.includes(PRINTER_NAME)
      ? PRINTER_NAME
      : windowsPrinters[0];

    // Check if printer record exists
    let printer = await Printer.findOne({
      $or: [
        { printer_id: PRINTER_ID },
        { name: printerName },
      ],
    });

    if (!printer) {
      // Create new printer record
      console.log(`➕ Creating printer record: ${printerName}`);
      printer = new Printer({
        name: printerName,
        printer_id: PRINTER_ID,
        printer_name: printerName,
        status: 'offline',
        connectionType: 'usb',
        connectionString: 'USB001',
        system_name: SYSTEM_NAME,
        queue_length: 0,
        isActive: true,
        autoPrintEnabled: true,
      });
      await printer.save();
    } else {
      // Update existing printer
      console.log(`🔄 Updating printer record: ${printerName}`);
      await Printer.findByIdAndUpdate(printer._id, {
        $set: {
          name: printerName,
          printer_id: PRINTER_ID,
          printer_name: printerName,
          system_name: SYSTEM_NAME,
        },
      });
    }

    // Check health immediately
    const status = await checkPrinterHealth(printer);
    console.log(`✅ Printer initialized: ${printerName} (${status.status})`);
  } catch (error) {
    console.error('Error initializing printer:', error);
  }
}

/**
 * Start health monitoring loop
 */
export function startHealthMonitoring(): void {
  console.log(`🔄 Starting health monitoring (interval: ${HEALTH_CHECK_INTERVAL}ms)`);
  
  // Check immediately
  checkAllPrintersHealth();

  // Then check at intervals
  setInterval(checkAllPrintersHealth, HEALTH_CHECK_INTERVAL);
}

