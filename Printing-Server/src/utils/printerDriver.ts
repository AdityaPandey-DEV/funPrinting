/**
 * Windows Printer Driver Utilities
 * Provides OS-specific printer access and status checking
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PrinterStatus {
  available: boolean;
  status: 'online' | 'offline' | 'busy' | 'error';
  errorMessage?: string;
  queueLength: number;
}

/**
 * Get list of available printers on Windows
 */
export async function getWindowsPrinters(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('wmic printer get name /value');
    const lines = stdout.split('\n');
    const printers: string[] = [];

    for (const line of lines) {
      const match = line.match(/^Name=(.+)$/);
      if (match && match[1].trim()) {
        printers.push(match[1].trim());
      }
    }

    return printers;
  } catch (error) {
    console.error('Error getting Windows printers:', error);
    return [];
  }
}

/**
 * Check if a printer is available on Windows
 */
export async function checkWindowsPrinterStatus(printerName: string): Promise<PrinterStatus> {
  try {
    // Check if printer exists
    const { stdout } = await execAsync(`wmic printer where name="${printerName}" get PrinterStatus,WorkOffline /value`);
    
    if (!stdout || stdout.includes('No Instance(s) Available')) {
      return {
        available: false,
        status: 'offline',
        errorMessage: 'Printer not found',
        queueLength: 0,
      };
    }

    // Parse printer status
    const statusMatch = stdout.match(/PrinterStatus=(\d+)/);
    const offlineMatch = stdout.match(/WorkOffline=(.+)/);

    const printerStatus = statusMatch ? parseInt(statusMatch[1], 10) : null;
    const isOffline = offlineMatch && offlineMatch[1].trim().toLowerCase() === 'true';

    if (isOffline) {
      return {
        available: false,
        status: 'offline',
        errorMessage: 'Printer is offline',
        queueLength: 0,
      };
    }

    // Printer status codes (Windows):
    // 0 = Other
    // 1 = Unknown
    // 2 = Idle
    // 3 = Printing
    // 4 = Warming Up
    // 5 = Stopped Printing
    // 6 = Offline
    // 7 = Paused
    // 8 = Error
    // 9 = Busy
    // 10 = Not Available
    // 11 = Waiting
    // 12 = Processing
    // 13 = Initialization
    // 14 = Power Save
    // 15 = Pending Deletion

    let status: 'online' | 'offline' | 'busy' | 'error' = 'online';
    let errorMessage: string | undefined;

    if (printerStatus === null) {
      status = 'offline';
      errorMessage = 'Unable to determine printer status';
    } else if (printerStatus === 3 || printerStatus === 9 || printerStatus === 12) {
      status = 'busy';
    } else if (printerStatus === 6 || printerStatus === 10) {
      status = 'offline';
      errorMessage = 'Printer is offline';
    } else if (printerStatus === 8) {
      status = 'error';
      errorMessage = 'Printer error detected';
    } else if (printerStatus === 5 || printerStatus === 7) {
      status = 'error';
      errorMessage = 'Printer stopped or paused';
    }

    // Get queue length
    const queueLength = await getPrinterQueueLength(printerName);

    return {
      available: status === 'online' || status === 'busy',
      status,
      errorMessage,
      queueLength,
    };
  } catch (error) {
    console.error(`Error checking printer status for ${printerName}:`, error);
    return {
      available: false,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      queueLength: 0,
    };
  }
}

/**
 * Get the number of jobs in the printer queue
 */
async function getPrinterQueueLength(printerName: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`wmic printjob where "name like '%${printerName}%'" get JobStatus /value`);
    
    if (!stdout || stdout.includes('No Instance(s) Available')) {
      return 0;
    }

    // Count lines with JobStatus
    const matches = stdout.match(/JobStatus=/g);
    return matches ? matches.length : 0;
  } catch (error) {
    console.error(`Error getting queue length for ${printerName}:`, error);
    return 0;
  }
}

/**
 * Get printer driver name
 */
export async function getPrinterDriverName(printerName: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`wmic printer where name="${printerName}" get DriverName /value`);
    const match = stdout.match(/DriverName=(.+)/);
    return match ? match[1].trim() : null;
  } catch (error) {
    console.error(`Error getting driver name for ${printerName}:`, error);
    return null;
  }
}

