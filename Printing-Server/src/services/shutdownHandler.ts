/**
 * Shutdown Handler Service
 * Handles graceful shutdown by resetting orders owned by this worker
 */

import { Order } from '../models/Order';
import { PrintLog } from '../models/PrintLog';
import { getWorkerId } from '../utils/workerId';
import { connectMongoDB } from '../config/mongodb';

/**
 * Reset all orders owned by this worker on shutdown
 */
export async function handleShutdown(): Promise<number> {
  try {
    const workerId = getWorkerId();
    console.log(`🛑 Shutting down worker: ${workerId}`);
    console.log(`🔄 Resetting orders owned by this worker...`);

    // Ensure MongoDB is connected
    await connectMongoDB();

    // Find all orders with printStatus = 'printing' AND printingBy = workerId
    const ownedOrders = await Order.find({
      printStatus: 'printing',
      printingBy: workerId,
    });

    if (ownedOrders.length === 0) {
      console.log(`✅ No orders to reset on shutdown`);
      return 0;
    }

    console.log(`📋 Found ${ownedOrders.length} order(s) owned by this worker`);

    let resetCount = 0;

    // Reset each order to pending
    for (const order of ownedOrders) {
      try {
        await Order.findByIdAndUpdate(
          order._id,
          {
            $set: {
              printStatus: 'pending',
              printError: 'Server shutdown - order reset to pending',
            },
            $unset: {
              printStartedAt: '',
              printerId: '',
              printerName: '',
              printingBy: '',
              printJobId: '',
            },
          }
        );

        // Log shutdown action
        try {
          await PrintLog.create({
            action: 'server_shutdown',
            orderId: order.orderId,
            printJobId: order.printJobId,
            previousStatus: 'printing',
            newStatus: 'pending',
            reason: 'Server shutdown - order reset to pending',
            timestamp: new Date(),
            metadata: { workerId },
          });
        } catch (logError) {
          console.error('Error logging shutdown action:', logError);
        }

        resetCount++;
        console.log(`✅ Reset order ${order.orderId} to pending`);
      } catch (error) {
        console.error(`❌ Error resetting order ${order.orderId}:`, error);
      }
    }

    console.log(`✅ Reset ${resetCount} order(s) on shutdown`);
    return resetCount;
  } catch (error) {
    console.error('❌ Error in shutdown handler:', error);
    return 0;
  }
}

