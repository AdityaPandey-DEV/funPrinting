/**
 * Stale Job Detector
 * Detects and recovers orders with stale heartbeats (crashed servers)
 */

import { Order } from '../models/Order';
import { PrintLog } from '../models/PrintLog';
import { markOrderAsFailed } from '../utils/atomicUpdate';

const STALE_THRESHOLD_MINUTES = parseInt(process.env.STALE_THRESHOLD_MINUTES || '5', 10); // Default: 5 minutes

/**
 * Detect and recover stale printing jobs
 * A job is considered stale if:
 * - printStatus = 'printing'
 * - printingHeartbeatAt is older than threshold OR doesn't exist
 */
export async function detectAndRecoverStaleJobs(): Promise<number> {
  try {
    const threshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000);

    // Find orders with stale heartbeats
    const staleOrders = await Order.find({
      printStatus: 'printing',
      $or: [
        { printingHeartbeatAt: { $lt: threshold } }, // Heartbeat too old
        { printingHeartbeatAt: { $exists: false } }, // No heartbeat (old jobs)
      ],
    });

    if (staleOrders.length === 0) {
      return 0;
    }

    console.log(`⚠️  Found ${staleOrders.length} stale printing job(s)`);

    let recoveredCount = 0;

    for (const order of staleOrders) {
      try {
        // Check if heartbeat is actually stale
        const heartbeatAge = order.printingHeartbeatAt
          ? Date.now() - order.printingHeartbeatAt.getTime()
          : Infinity;
        const heartbeatAgeMinutes = Math.floor(heartbeatAge / (60 * 1000));

        if (heartbeatAgeMinutes >= STALE_THRESHOLD_MINUTES) {
          console.log(`🔄 Recovering stale order: ${order.orderId} (heartbeat age: ${heartbeatAgeMinutes} minutes)`);

          // Reset order to pending using atomic update
          // Note: This will only work if the order is owned by the current worker
          // For orphaned orders (no printingBy), we need to reset directly
          if (order.printingBy) {
            // Try using atomic update (will only work if owned by this worker)
            const reset = await markOrderAsFailed(
              order._id.toString(),
              `Stale print job recovered: heartbeat not updated for ${heartbeatAgeMinutes} minutes. Server may have crashed.`
            );

            if (!reset) {
              // Order owned by different worker, reset directly
              await Order.findByIdAndUpdate(
                order._id,
                {
                  $set: {
                    printStatus: 'pending',
                    printError: `Stale print job recovered: heartbeat not updated for ${heartbeatAgeMinutes} minutes. Server may have crashed.`,
                    printAttempt: (order.printAttempt || 0) + 1,
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
            }
          } else {
            // Orphaned order (no printingBy), reset directly
            await Order.findByIdAndUpdate(
              order._id,
              {
                $set: {
                  printStatus: 'pending',
                  printError: `Stale print job recovered: orphaned order (no worker ownership).`,
                  printAttempt: (order.printAttempt || 0) + 1,
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
          }

          // Log recovery action
          try {
            await PrintLog.create({
              action: 'stale_print_recovered',
              orderId: order.orderId,
              printJobId: order.printJobId,
              previousStatus: 'printing',
              newStatus: 'pending',
              reason: `Stale print job recovered: heartbeat age ${heartbeatAgeMinutes} minutes`,
              timestamp: new Date(),
              metadata: {
                heartbeatAgeMinutes,
                printingBy: order.printingBy || 'orphaned',
                thresholdMinutes: STALE_THRESHOLD_MINUTES,
              },
            });
          } catch (logError) {
            console.error('Error logging stale job recovery:', logError);
          }

          recoveredCount++;
        }
      } catch (error) {
        console.error(`❌ Error recovering stale order ${order.orderId}:`, error);
      }
    }

    if (recoveredCount > 0) {
      console.log(`✅ Recovered ${recoveredCount} stale printing job(s)`);
    }

    return recoveredCount;
  } catch (error) {
    console.error('❌ Error detecting stale jobs:', error);
    return 0;
  }
}

/**
 * Get count of stale jobs without recovering them
 */
export async function getStaleJobCount(): Promise<number> {
  try {
    const threshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000);

    const count = await Order.countDocuments({
      printStatus: 'printing',
      $or: [
        { printingHeartbeatAt: { $lt: threshold } },
        { printingHeartbeatAt: { $exists: false } },
      ],
    });

    return count;
  } catch (error) {
    console.error('❌ Error counting stale jobs:', error);
    return 0;
  }
}

