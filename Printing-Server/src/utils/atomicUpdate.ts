/**
 * Atomic update utilities for order state transitions
 */

import { Order } from '../models/Order';
import { PrintLog } from '../models/PrintLog';
import { randomUUID } from 'crypto';
import { getWorkerId } from './workerId';
import { validateTransition } from './stateMachine';

export interface ClaimOrderResult {
  success: boolean;
  order?: any;
  error?: string;
  printJobId?: string;
}

/**
 * Atomically claim an order for printing
 * Only updates if order is still in 'pending' state
 * Generates printJobId for idempotency and sets worker ownership
 * Validates state transition and enforces retry limits
 */
export async function claimOrderForPrinting(
  orderId: string,
  printerId: string,
  printerName: string
): Promise<ClaimOrderResult> {
  try {
    const workerId = getWorkerId();
    
    // Get current order to check state and retry limits
    const currentOrder = await Order.findById(orderId);
    if (!currentOrder) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    // Validate state transition: pending → printing
    const transitionValidation = validateTransition(
      currentOrder.printStatus,
      'printing',
      false
    );
    if (!transitionValidation.allowed) {
      return {
        success: false,
        error: `Invalid state transition: ${transitionValidation.reason}`,
      };
    }

    // Check retry limits
    const maxAttempts = currentOrder.maxPrintAttempts || 3;
    const currentAttempt = currentOrder.printAttempt || 0;
    if (currentAttempt >= maxAttempts) {
      // Mark as failed with max attempts reached
      await Order.findByIdAndUpdate(orderId, {
        $set: {
          printError: 'Max print attempts reached. Requires admin action.',
        },
      });

      // Log max attempts reached
      try {
        await PrintLog.create({
          action: 'max_attempts_reached',
          orderId: currentOrder.orderId,
          printJobId: currentOrder.printJobId,
          previousStatus: currentOrder.printStatus,
          newStatus: 'pending',
          reason: `Max print attempts (${maxAttempts}) reached. Requires admin action.`,
          timestamp: new Date(),
          metadata: { printAttempt: currentAttempt, maxPrintAttempts: maxAttempts },
        });
      } catch (logError) {
        console.error('Error logging max attempts:', logError);
      }

      return {
        success: false,
        error: `Max print attempts (${maxAttempts}) reached. Requires admin action.`,
      };
    }

    const printJobId = randomUUID();
    const newAttempt = currentAttempt + 1;
    
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        printStatus: 'pending',
        paymentStatus: 'completed',
        // Ensure we haven't exceeded max attempts
        $or: [
          { printAttempt: { $lt: maxAttempts } },
          { printAttempt: { $exists: false } },
        ],
      },
      {
        $set: {
          printStatus: 'printing',
          printStartedAt: new Date(),
          printerId: printerId,
          printerName: printerName,
          printJobId: printJobId,
          printingBy: workerId,
          printAttempt: newAttempt,
          printingHeartbeatAt: new Date(), // Initialize heartbeat
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!order) {
      return {
        success: false,
        error: 'Order not found, already claimed, or max attempts reached',
      };
    }

    // Log state transition
    try {
      await PrintLog.create({
        action: 'state_transition',
        orderId: order.orderId,
        printJobId: printJobId,
        previousStatus: 'pending',
        newStatus: 'printing',
        reason: `Claimed for printing (attempt ${newAttempt}/${maxAttempts})`,
        timestamp: new Date(),
        metadata: { workerId, printerId, printerName, printAttempt: newAttempt },
      });
    } catch (logError) {
      console.error('Error logging state transition:', logError);
    }

    console.log(`✅ Claimed order ${orderId} with printJobId: ${printJobId}, workerId: ${workerId}, attempt: ${newAttempt}/${maxAttempts}`);

    return {
      success: true,
      order,
      printJobId,
    };
  } catch (error) {
    console.error('Error claiming order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark order as printed
 * Only allows the owning worker to complete the job
 * Validates state transition: printing → printed
 */
export async function markOrderAsPrinted(orderId: string): Promise<boolean> {
  try {
    const workerId = getWorkerId();
    
    // Get current order to validate transition
    const currentOrder = await Order.findById(orderId);
    if (!currentOrder) {
      console.warn(`⚠️  Order ${orderId} not found`);
      return false;
    }

    // Validate state transition: printing → printed
    const transitionValidation = validateTransition(
      currentOrder.printStatus,
      'printed',
      false
    );
    if (!transitionValidation.allowed) {
      console.warn(`⚠️  Invalid state transition for order ${orderId}: ${transitionValidation.reason}`);
      return false;
    }

    const result = await Order.findOneAndUpdate(
      {
        _id: orderId,
        printingBy: workerId, // Only allow owning worker
        printStatus: 'printing',
      },
      {
        $set: {
          printStatus: 'printed',
          printCompletedAt: new Date(),
        },
        $unset: {
          printError: '',
          printingBy: '',
          printingHeartbeatAt: '', // Clear heartbeat
        },
      },
      { new: true }
    );

    if (!result) {
      console.warn(`⚠️  Cannot mark order ${orderId} as printed: not owned by worker ${workerId}`);
      return false;
    }

    // Log state transition
    try {
      await PrintLog.create({
        action: 'state_transition',
        orderId: result.orderId,
        printJobId: result.printJobId,
        previousStatus: 'printing',
        newStatus: 'printed',
        reason: 'Print job completed successfully',
        timestamp: new Date(),
        metadata: { workerId },
      });
    } catch (logError) {
      console.error('Error logging state transition:', logError);
    }

    return true;
  } catch (error) {
    console.error('Error marking order as printed:', error);
    return false;
  }
}

/**
 * Mark order as failed and reset to pending
 * Only allows the owning worker to reset the job
 * Validates state transition: printing → pending
 */
export async function markOrderAsFailed(
  orderId: string,
  errorMessage: string
): Promise<boolean> {
  try {
    const workerId = getWorkerId();
    
    // Get current order to validate transition and increment printAttempt
    const currentOrder = await Order.findById(orderId);
    if (!currentOrder) {
      console.warn(`⚠️  Order ${orderId} not found`);
      return false;
    }

    // Validate state transition: printing → pending
    const transitionValidation = validateTransition(
      currentOrder.printStatus,
      'pending',
      false
    );
    if (!transitionValidation.allowed) {
      console.warn(`⚠️  Invalid state transition for order ${orderId}: ${transitionValidation.reason}`);
      return false;
    }

    const newAttempt = (currentOrder.printAttempt || 0) + 1;
    const previousPrintJobId = currentOrder.printJobId;
    
    const result = await Order.findOneAndUpdate(
      {
        _id: orderId,
        printingBy: workerId, // Only allow owning worker
        printStatus: 'printing',
      },
      {
        $set: {
          printStatus: 'pending',
          printError: errorMessage,
          printAttempt: newAttempt,
        },
        $unset: {
          printStartedAt: '',
          printerId: '',
          printerName: '',
          printingBy: '',
          printJobId: '', // Clear printJobId to allow new attempt
          printingHeartbeatAt: '', // Clear heartbeat
        },
      },
      { new: true }
    );

    if (!result) {
      console.warn(`⚠️  Cannot reset order ${orderId}: not owned by worker ${workerId}`);
      return false;
    }

    // Log state transition
    try {
      await PrintLog.create({
        action: 'state_transition',
        orderId: result.orderId,
        printJobId: previousPrintJobId, // Preserve old printJobId in log
        previousStatus: 'printing',
        newStatus: 'pending',
        reason: `Print job failed: ${errorMessage}`,
        timestamp: new Date(),
        metadata: { workerId, printAttempt: newAttempt, error: errorMessage },
      });
    } catch (logError) {
      console.error('Error logging state transition:', logError);
    }

    return true;
  } catch (error) {
    console.error('Error marking order as failed:', error);
    return false;
  }
}

/**
 * Check if a printJobId has already been printed (idempotency check)
 * Checks both orders collection and print_logs to ensure absolute idempotency
 */
export async function isPrintJobIdAlreadyPrinted(printJobId: string): Promise<boolean> {
  try {
    // Check orders collection
    const order = await Order.findOne({
      printJobId: printJobId,
      printStatus: 'printed',
    });
    
    if (order) {
      console.log(`⏭️  Print job ${printJobId} already printed (found in orders)`);
      return true;
    }

    // Check print_logs for any successful print with this printJobId
    const logEntry = await PrintLog.findOne({
      printJobId: printJobId,
      action: { $in: ['state_transition', 'print_completed'] },
      newStatus: 'printed',
    });

    if (logEntry) {
      console.log(`⏭️  Print job ${printJobId} already printed (found in logs)`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking printJobId:', error);
    // Fail-safe: if we can't check, assume it's not printed (safer than assuming it is)
    return false;
  }
}

