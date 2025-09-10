const mongoose = require('mongoose');

// AdminInfo schema (simplified for clearing)
const AdminInfoSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  country: String,
  website: String,
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
    youtube: String
  },
  businessHours: {
    monday: String,
    tuesday: String,
    wednesday: String,
    thursday: String,
    friday: String,
    saturday: String,
    sunday: String
  },
  description: String,
  logo: String,
  favicon: String,
  isActive: Boolean
}, { timestamps: true });

const AdminInfo = mongoose.model('AdminInfo', AdminInfoSchema);

async function clearAdminData() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://anpandey042_db_user:p3d4mQ91oBVssrol@ad.ynepvru.mongodb.net/photography-services?retryWrites=true&w=majority';
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear all admin info data
    const result = await AdminInfo.deleteMany({});
    console.log(`Cleared ${result.deletedCount} admin info records`);

    // Create fresh admin data
    const defaultAdmin = new AdminInfo({
      name: 'PrintService',
      email: 'admin@printservice.com',
      phone: '+91 98765 43210',
      address: 'College Campus',
      city: 'Your City',
      state: 'Your State',
      pincode: '123456',
      country: 'India',
      website: 'https://printservice.com',
      socialMedia: {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        youtube: ''
      },
      businessHours: {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 6:00 PM',
        saturday: '10:00 AM - 4:00 PM',
        sunday: 'Closed'
      },
      description: 'Your trusted printing partner for all academic needs. Fast, reliable, and affordable printing services for college students.',
      logo: '',
      favicon: '',
      isActive: true
    });

    await defaultAdmin.save();
    console.log('Fresh admin information created successfully!');
    
  } catch (error) {
    console.error('Error clearing admin data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the clearing
clearAdminData();
