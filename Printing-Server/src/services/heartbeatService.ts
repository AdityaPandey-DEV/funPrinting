/**
 * Heartbeat Service
 * Updates printingHeartbeatAt for active printing jobs to detect stale/crashed jobs
 */

import { Order } from '../models/Order';
import { getWorkerId } from '../utils/workerId';

const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || '10000', 10); // Default: 10 seconds

let heartbeatInterval: NodeJS.Timeout | null = null;

/**
 * Update heartbeat for all orders currently being printed by this worker
 */
async function updateHeartbeats(): Promise<void> {
  try {
    const workerId = getWorkerId();
    const now = new Date();

    // Update heartbeat for all orders owned by this worker that are in 'printing' state
    const result = await Order.updateMany(
      {
        printStatus: 'printing',
        printingBy: workerId,
      },
      {
        $set: {
          printingHeartbeatAt: now,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`💓 Heartbeat updated for ${result.modifiedCount} active print job(s)`);
    }
  } catch (error) {
    console.error('❌ Error updating heartbeats:', error);
  }
}

/**
 * Start the heartbeat service
 * Updates heartbeats at regular intervals
 */
export function startHeartbeatService(): void {
  if (heartbeatInterval) {
    console.log('⚠️  Heartbeat service already running');
    return;
  }

  console.log(`💓 Starting heartbeat service (interval: ${HEARTBEAT_INTERVAL}ms)`);
  
  // Update immediately
  updateHeartbeats();

  // Then update at intervals
  heartbeatInterval = setInterval(updateHeartbeats, HEARTBEAT_INTERVAL);
}

/**
 * Stop the heartbeat service
 */
export function stopHeartbeatService(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('💓 Heartbeat service stopped');
  }
}

/**
 * Update heartbeat for a specific order
 * Called during active printing to keep heartbeat fresh
 */
export async function updateHeartbeat(orderId: string): Promise<boolean> {
  try {
    const workerId = getWorkerId();
    const now = new Date();

    const result = await Order.findOneAndUpdate(
      {
        _id: orderId,
        printStatus: 'printing',
        printingBy: workerId,
      },
      {
        $set: {
          printingHeartbeatAt: now,
        },
      }
    );

    return !!result;
  } catch (error) {
    console.error(`❌ Error updating heartbeat for order ${orderId}:`, error);
    return false;
  }
}

