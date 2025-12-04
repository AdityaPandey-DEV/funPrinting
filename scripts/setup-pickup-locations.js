const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/print-service';

async function setupPickupLocations() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const pickupLocations = db.collection('pickuplocations');
    
    // Check if locations already exist
    const existingLocations = await pickupLocations.countDocuments();
    
    if (existingLocations > 0) {
      console.log('Pickup locations already exist. Skipping setup.');
      return;
    }
    
    // Default pickup locations
    const defaultLocations = [
      {
        name: 'Pandey Grocery Store',
        address: 'Pandey Grocery Store, Bhimtal, Uttarakhand',
        lat: 29.3441,
        lng: 79.5632,
        isActive: true,
        isDefault: true,
        description: 'Convenient pickup location at Pandey Grocery Store',
        contactPerson: 'Store Owner',
        contactPhone: '+91 98765 43210',
        operatingHours: '7:00 AM - 9:00 PM (Daily)',
        gmapLink: 'https://share.google/wZCX96ZttHegRluXn',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Gehu Bhimtal Campus',
        address: 'Gehu Bhimtal Campus, Bhimtal, Uttarakhand',
        lat: 29.3445,
        lng: 79.5638,
        isActive: true,
        isDefault: false,
        description: 'Main campus pickup location at Gehu Bhimtal',
        contactPerson: 'Campus Admin',
        contactPhone: '+91 98765 43211',
        operatingHours: '8:00 AM - 6:00 PM (Monday to Friday)',
        gmapLink: 'https://share.google/o9p4hOG4tpVPbhHjE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert default locations
    const result = await pickupLocations.insertMany(defaultLocations);
    
    console.log(`✅ Successfully created ${result.insertedCount} pickup locations:`);
    defaultLocations.forEach((location, index) => {
      console.log(`  ${index + 1}. ${location.name} ${location.isDefault ? '(Default)' : ''}`);
    });
    
    console.log('\n🎯 Default pickup location set to: Main Campus - Admin Block');
    console.log('📍 You can now manage pickup locations from the admin dashboard');
    
  } catch (error) {
    console.error('❌ Error setting up pickup locations:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the setup
setupPickupLocations();
