/**
 * Migration Script: Add printStatus to existing orders
 * 
 * This script:
 * 1. Adds printStatus field to all existing orders
 * 2. Sets printStatus: 'pending' for orders with paymentStatus: 'completed' and no print job
 * 3. Sets printStatus: 'printed' for orders with orderStatus: 'delivered'
 * 4. Creates required indexes
 * 5. Initializes printer records if none exist
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Import models
import Order from '../src/models/Order';
import Printer from '../src/models/Printer';
import PrintLog from '../src/models/PrintLog';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function migrate() {
  try {
    console.log('🔄 Starting migration...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Step 1: Add printStatus to orders with completed payment
    console.log('\n📋 Step 1: Updating orders with completed payment...');
    const pendingResult = await Order.updateMany(
      {
        paymentStatus: 'completed',
        $or: [
          { printStatus: { $exists: false } },
          { printStatus: null }
        ]
      },
      {
        $set: { printStatus: 'pending' }
      }
    );
    console.log(`   ✅ Updated ${pendingResult.modifiedCount} orders to printStatus: 'pending'`);

    // Step 2: Set printStatus: 'printed' for delivered orders
    console.log('\n📋 Step 2: Updating delivered orders...');
    const printedResult = await Order.updateMany(
      {
        orderStatus: 'delivered',
        $or: [
          { printStatus: { $exists: false } },
          { printStatus: null }
        ]
      },
      {
        $set: { printStatus: 'printed' }
      }
    );
    console.log(`   ✅ Updated ${printedResult.modifiedCount} orders to printStatus: 'printed'`);

    // Step 3: Create indexes
    console.log('\n📋 Step 3: Creating indexes...');
    
    // Orders collection indexes
    await Order.collection.createIndex({ printStatus: 1, paymentStatus: 1, createdAt: 1 });
    console.log('   ✅ Created index: orders.printStatus + paymentStatus + createdAt');
    
    await Order.collection.createIndex({ printStatus: 1, createdAt: -1 });
    console.log('   ✅ Created index: orders.printStatus + createdAt');
    
    await Order.collection.createIndex({ printerId: 1, printStatus: 1 });
    console.log('   ✅ Created index: orders.printerId + printStatus');

    // Printers collection indexes
    await Printer.collection.createIndex({ printer_id: 1 }, { unique: true, sparse: true });
    console.log('   ✅ Created index: printers.printer_id (unique)');
    
    await Printer.collection.createIndex({ last_seen_at: -1 });
    console.log('   ✅ Created index: printers.last_seen_at');

    // PrintLogs collection indexes
    await PrintLog.collection.createIndex({ orderId: 1, timestamp: -1 });
    console.log('   ✅ Created index: print_logs.orderId + timestamp');
    
    await PrintLog.collection.createIndex({ timestamp: -1 });
    console.log('   ✅ Created index: print_logs.timestamp');
    
    await PrintLog.collection.createIndex({ action: 1, timestamp: -1 });
    console.log('   ✅ Created index: print_logs.action + timestamp');

    // Step 4: Initialize printer records if none exist
    console.log('\n📋 Step 4: Checking for printer records...');
    const printerCount = await Printer.countDocuments();
    
    if (printerCount === 0) {
      console.log('   ⚠️  No printers found. Creating sample printer...');
      
      const samplePrinter = new Printer({
        name: 'Default Printer',
        printerModel: 'Unknown',
        manufacturer: 'Unknown',
        connectionType: 'usb',
        connectionString: 'USB001',
        status: 'offline',
        printer_id: 'printer_001',
        printer_name: 'Default Printer',
        system_name: 'Windows',
        queue_length: 0,
        capabilities: {
          supportedPageSizes: ['A4', 'A3'],
          supportsColor: true,
          supportsDuplex: true,
          maxCopies: 99,
          supportedFileTypes: ['application/pdf', 'application/msword']
        },
        queueLength: 0,
        totalPagesPrinted: 0,
        isActive: true,
        autoPrintEnabled: true
      });
      
      await samplePrinter.save();
      console.log('   ✅ Created sample printer: Default Printer');
    } else {
      console.log(`   ✅ Found ${printerCount} existing printer(s)`);
    }

    // Summary
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Orders set to 'pending': ${pendingResult.modifiedCount}`);
    console.log(`   - Orders set to 'printed': ${printedResult.modifiedCount}`);
    console.log(`   - Indexes created: 8`);
    console.log(`   - Printers: ${printerCount === 0 ? '1 (created)' : printerCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✨ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });

