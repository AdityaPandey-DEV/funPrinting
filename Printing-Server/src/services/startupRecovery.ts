/**
 * Startup Recovery Service
 * Recovers crashed jobs on server startup
 */

import { Order } from '../models/Order';
import { PrintLog } from '../models/PrintLog';
import { getWorkerId } from '../utils/workerId';

/**
 * Recover crashed jobs on startup
 * Finds orders with printStatus = 'printing' that are:
 * - Owned by this worker (printingBy = workerId)
 * - Or orphaned (printingBy = null/undefined)
 * Resets them to 'pending' and increments printAttempt
 */
export async function recoverCrashedJobs(): Promise<number> {
  try {
    const workerId = getWorkerId();
    console.log(`🔄 Starting crash recovery for worker: ${workerId}`);

    // Find orders owned by this worker that are in 'printing' state
    const ownedOrders = await Order.find({
      printStatus: 'printing',
      printingBy: workerId,
    });

    // Find orphaned orders (no worker ownership)
    const orphanedOrders = await Order.find({
      printStatus: 'printing',
      $or: [
        { printingBy: { $exists: false } },
        { printingBy: null },
      ],
    });

    const allCrashedOrders = [...ownedOrders, ...orphanedOrders];

    if (allCrashedOrders.length === 0) {
      console.log('✅ No crashed jobs to recover');
      return 0;
    }

    console.log(`⚠️  Found ${allCrashedOrders.length} crashed job(s) to recover (${ownedOrders.length} owned, ${orphanedOrders.length} orphaned)`);

    let recoveredCount = 0;

    for (const order of allCrashedOrders) {
      try {
        const isOwned = order.printingBy === workerId;
        const newAttempt = (order.printingAttempt || 0) + 1;

        // Reset order to pending
        await Order.findByIdAndUpdate(
          order._id,
          {
            $set: {
              printStatus: 'pending',
              printError: `Server crash recovery: order was in 'printing' state on startup. Reset to pending.`,
              printAttempt: newAttempt,
            },
            $unset: {
              printStartedAt: '',
              printerId: '',
              printerName: '',
              printingBy: '',
              printJobId: '',
              printingHeartbeatAt: '',
            },
          }
        );

        // Log recovery action
        try {
          await PrintLog.create({
            action: 'crash_recovery',
            orderId: order.orderId,
            printJobId: order.printJobId,
            previousStatus: 'printing',
            newStatus: 'pending',
            reason: `Server crash recovery: order was in 'printing' state on startup`,
            timestamp: new Date(),
            metadata: {
              workerId,
              wasOwned: isOwned,
              printAttempt: newAttempt,
            },
          });
        } catch (logError) {
          console.error('Error logging crash recovery:', logError);
        }

        recoveredCount++;
        console.log(`✅ Recovered crashed order: ${order.orderId} (attempt: ${newAttempt})`);
      } catch (error) {
        console.error(`❌ Error recovering crashed order ${order.orderId}:`, error);
      }
    }

    console.log(`✅ Crash recovery completed: ${recoveredCount} order(s) recovered`);
    return recoveredCount;
  } catch (error) {
    console.error('❌ Error in crash recovery:', error);
    return 0;
  }
}

