/**
 * Worker ID Generator
 * Generates a unique worker ID on server startup for ownership tracking
 */

import { randomUUID } from 'crypto';
import * as os from 'os';

let workerId: string | null = null;

/**
 * Generate or retrieve worker ID
 * Worker ID format: {uuid}-{hostname}-{timestamp}
 */
export function getWorkerId(): string {
  if (workerId) {
    return workerId;
  }

  // Try to get from environment variable (for persistence across restarts)
  const envWorkerId = process.env.WORKER_ID;
  if (envWorkerId) {
    workerId = envWorkerId;
    return workerId;
  }

  // Generate new worker ID
  const hostname = os.hostname();
  const timestamp = Date.now();
  const uuid = randomUUID();
  
  workerId = `${uuid}-${hostname}-${timestamp}`;
  
  // Store in environment variable for persistence
  process.env.WORKER_ID = workerId;
  
  console.log(`🆔 Generated Worker ID: ${workerId}`);
  
  return workerId;
}

/**
 * Reset worker ID (for testing)
 */
export function resetWorkerId(): void {
  workerId = null;
  delete process.env.WORKER_ID;
}

