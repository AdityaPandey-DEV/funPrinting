const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Printer = require('../src/models/Printer').default;

async function setupPrinting() {
  try {
    console.log('🖨️ Setting up printing system...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if any printers exist
    const existingPrinters = await Printer.find();
    console.log(`📊 Found ${existingPrinters.length} existing printers`);

    if (existingPrinters.length === 0) {
      console.log('🔧 No printers found. Creating sample printer...');
      
      // Create a sample printer for testing
      const samplePrinter = new Printer({
        name: 'Sample Office Printer',
        printerModel: 'LaserJet Pro M404n',
        manufacturer: 'HP',
        connectionType: 'usb',
        connectionString: '/dev/usb/lp0', // This would be the actual device path
        status: 'offline', // Will be updated when printer is actually connected
        capabilities: {
          supportedPageSizes: ['A4', 'Letter'],
          supportsColor: false,
          supportsDuplex: true,
          maxCopies: 99,
          supportedFileTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        },
        autoPrintEnabled: true,
        isActive: true
      });

      await samplePrinter.save();
      console.log('✅ Sample printer created:', samplePrinter.name);
    }

    // List all printers
    const allPrinters = await Printer.find({ isActive: true });
    console.log('\n📋 Active Printers:');
    allPrinters.forEach((printer, index) => {
      console.log(`${index + 1}. ${printer.name} (${printer.printerModel})`);
      console.log(`   Status: ${printer.status}`);
      console.log(`   Auto Print: ${printer.autoPrintEnabled ? 'Enabled' : 'Disabled'}`);
      console.log(`   Capabilities: ${printer.capabilities.supportsColor ? 'Color' : 'B&W'}, ${printer.capabilities.supportsDuplex ? 'Duplex' : 'Single-sided'}`);
      console.log('');
    });

    console.log('🎉 Printing system setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Connect your actual printer to the system');
    console.log('2. Update the printer connection string in the admin panel');
    console.log('3. Test the printer connection');
    console.log('4. Start the print queue processor');
    console.log('5. Place a test order to verify auto-printing works');

  } catch (error) {
    console.error('❌ Error setting up printing system:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the setup
setupPrinting();
