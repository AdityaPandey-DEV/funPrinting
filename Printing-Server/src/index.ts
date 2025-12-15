/**
 * Printing Server - Main Entry Point
 * 
 * MongoDB-based printing server for funPrinting
 * Polls MongoDB for pending orders and processes them
 */

import dotenv from 'dotenv';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import { startOrderProcessing, checkStuckOrders } from './services/orderProcessor';
import { startHealthMonitoring, initializePrinter } from './services/printerHealth';
import { handleShutdown } from './services/shutdownHandler';
import { getWorkerId } from './utils/workerId';
import { startMetricsCollection } from './services/metricsCollector';
import { recoverCrashedJobs } from './services/startupRecovery';
import { detectAndRecoverStaleJobs } from './services/staleJobDetector';
import { startHeartbeatService, stopHeartbeatService } from './services/heartbeatService';

// Load environment variables
dotenv.config();

let isShuttingDown = false;

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop heartbeat service
    stopHeartbeatService();

    // Reset orders owned by this worker
    const resetCount = await handleShutdown();
    console.log(`📊 Reset ${resetCount} order(s) during shutdown`);

    // Disconnect from MongoDB
    await disconnectMongoDB();
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Printing Server...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Connect to MongoDB
    await connectMongoDB();

    // Initialize worker ID
    const workerId = getWorkerId();
    console.log(`🆔 Worker ID: ${workerId}`);

    // Recover crashed jobs on startup
    console.log('🔄 Running startup recovery...');
    const recoveredCount = await recoverCrashedJobs();
    if (recoveredCount > 0) {
      console.log(`✅ Recovered ${recoveredCount} crashed job(s) on startup`);
    }

    // Initialize printer
    await initializePrinter();

    // Start health monitoring
    startHealthMonitoring();

    // Start heartbeat service
    startHeartbeatService();

    // Start order processing
    startOrderProcessing();

    // Start metrics collection
    startMetricsCollection();

    // Check for stuck orders every 5 minutes
    setInterval(checkStuckOrders, 5 * 60 * 1000);

    // Check for stale jobs every 2-3 minutes
    setInterval(async () => {
      await detectAndRecoverStaleJobs();
    }, 2 * 60 * 1000); // Every 2 minutes

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Printing Server started successfully');
    console.log('📊 Monitoring MongoDB for pending orders...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('❌ Failed to start Printing Server:', error);
    process.exit(1);
  }
}

// Start the server
main();

