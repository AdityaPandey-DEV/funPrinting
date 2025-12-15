/**
 * MongoDB Change Streams Utility
 * Provides real-time updates via Change Streams with polling fallback
 */

import mongoose from 'mongoose';
import connectDB from './mongodb';

let changeStream: any = null;
let isReplicaSet = false;

/**
 * Check if MongoDB is configured as a replica set
 */
async function checkReplicaSet(): Promise<boolean> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return false;
    }
    const admin = db.admin();
    const status = await admin.command({ isMaster: 1 });
    return !!(status.setName || status.ismaster);
  } catch (error) {
    console.warn('⚠️  Could not check replica set status:', error);
    return false;
  }
}

/**
 * Initialize Change Streams (if replica set available) or return polling function
 */
export async function initializeChangeStreams(
  onOrderChange: (change: any) => void,
  onPrinterChange: (change: any) => void
): Promise<() => void> {
  try {
    await connectDB();
    isReplicaSet = await checkReplicaSet();

    if (isReplicaSet) {
      console.log('✅ MongoDB replica set detected. Using Change Streams for real-time updates.');
      return setupChangeStreams(onOrderChange, onPrinterChange);
    } else {
      console.log('⚠️  MongoDB replica set not detected. Using polling fallback.');
      return setupPolling(onOrderChange, onPrinterChange);
    }
  } catch (error) {
    console.error('❌ Error initializing change streams:', error);
    console.log('⚠️  Falling back to polling.');
    return setupPolling(onOrderChange, onPrinterChange);
  }
}

/**
 * Setup Change Streams (requires replica set)
 */
function setupChangeStreams(
  onOrderChange: (change: any) => void,
  onPrinterChange: (change: any) => void
): () => void {
  const Order = mongoose.models.Order;
  const Printer = mongoose.models.Printer;

  // Watch orders collection
  const orderStream = Order.watch([
    { $match: { 'updateDescription.updatedFields.printStatus': { $exists: true } } },
  ]);

  orderStream.on('change', (change: any) => {
    console.log('📊 Order change detected:', change.operationType);
    onOrderChange(change);
  });

  orderStream.on('error', (error: any) => {
    console.error('❌ Order change stream error:', error);
  });

  // Watch printers collection
  const printerStream = Printer.watch([
    { $match: { 'updateDescription.updatedFields.status': { $exists: true } } },
  ]);

  printerStream.on('change', (change: any) => {
    console.log('🖨️  Printer change detected:', change.operationType);
    onPrinterChange(change);
  });

  printerStream.on('error', (error: any) => {
    console.error('❌ Printer change stream error:', error);
  });

  changeStream = { orderStream, printerStream };

  // Return cleanup function
  return () => {
    if (orderStream) {
      orderStream.close();
    }
    if (printerStream) {
      printerStream.close();
    }
  };
}

/**
 * Setup polling fallback (works with any MongoDB setup)
 */
function setupPolling(
  onOrderChange: (change: any) => void,
  onPrinterChange: (change: any) => void
): () => void {
  const POLL_INTERVAL = 2000; // Poll every 2 seconds
  let lastOrderCheck: Date | null = null;
  let lastPrinterCheck: Date | null = null;

  const Order = mongoose.models.Order;
  const Printer = mongoose.models.Printer;

  const interval = setInterval(async () => {
    try {
      // Check for order changes
      const orderQuery: any = {};
      if (lastOrderCheck) {
        orderQuery.updatedAt = { $gt: lastOrderCheck };
      }

      const changedOrders = await Order.find(orderQuery)
        .select('_id orderId printStatus updatedAt')
        .limit(50)
        .sort({ updatedAt: -1 });

      if (changedOrders.length > 0) {
        changedOrders.forEach((order) => {
          onOrderChange({
            operationType: 'update',
            documentKey: { _id: order._id },
            fullDocument: order.toObject(),
          });
        });
        lastOrderCheck = new Date();
      }

      // Check for printer changes
      const printerQuery: any = {};
      if (lastPrinterCheck) {
        printerQuery.updatedAt = { $gt: lastPrinterCheck };
      }

      const changedPrinters = await Printer.find(printerQuery)
        .select('_id name status updatedAt')
        .limit(10)
        .sort({ updatedAt: -1 });

      if (changedPrinters.length > 0) {
        changedPrinters.forEach((printer) => {
          onPrinterChange({
            operationType: 'update',
            documentKey: { _id: printer._id },
            fullDocument: printer.toObject(),
          });
        });
        lastPrinterCheck = new Date();
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  }, POLL_INTERVAL);

  // Return cleanup function
  return () => {
    clearInterval(interval);
  };
}

/**
 * Check if Change Streams are available
 */
export function isChangeStreamsAvailable(): boolean {
  return isReplicaSet;
}

