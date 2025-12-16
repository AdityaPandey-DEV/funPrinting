/**
 * Migration script to update cancelled status to pending
 * 
 * This script:
 * 1. Updates all orders with status: 'cancelled' to orderStatus: 'pending'
 * 2. Updates all print jobs with status: 'cancelled' to status: 'pending'
 * 
 * Run with: npx ts-node scripts/migrate-cancelled-status.ts
 */

import mongoose from 'mongoose';
import connectDB from '../src/lib/mongodb';
import Order from '../src/models/Order';
import PrintJob from '../src/models/PrintJob';

async function migrateCancelledStatus() {
  try {
    console.log('🔄 Starting cancelled status migration...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Update orders with cancelled status
    console.log('\n📋 Processing orders...');
    const cancelledOrders = await Order.find({ status: 'cancelled' });
    console.log(`   Found ${cancelledOrders.length} orders with cancelled status`);

    let ordersUpdated = 0;
    for (const order of cancelledOrders) {
      await Order.updateOne(
        { _id: order._id },
        { 
          $set: { 
            orderStatus: 'pending',
            status: 'pending_payment' // Set status to pending_payment as default
          } 
        }
      );
      ordersUpdated++;
      console.log(`   ✅ Updated order: ${order.orderId || order._id}`);
    }

    // Update print jobs with cancelled status
    console.log('\n📋 Processing print jobs...');
    const cancelledPrintJobs = await PrintJob.find({ status: 'cancelled' });
    console.log(`   Found ${cancelledPrintJobs.length} print jobs with cancelled status`);

    let printJobsUpdated = 0;
    for (const printJob of cancelledPrintJobs) {
      await PrintJob.updateOne(
        { _id: printJob._id },
        { $set: { status: 'pending' } }
      );
      printJobsUpdated++;
      console.log(`   ✅ Updated print job: ${printJob.orderId || printJob._id}`);
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Orders updated: ${ordersUpdated}`);
    console.log(`   ✅ Print jobs updated: ${printJobsUpdated}`);
    console.log(`   📋 Total records updated: ${ordersUpdated + printJobsUpdated}`);
    console.log('\n✅ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateCancelledStatus();

