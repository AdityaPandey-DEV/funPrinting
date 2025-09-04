const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/print-service';

async function setupAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define Admin schema
    const adminSchema = new mongoose.Schema({
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
      },
      password: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        enum: ['admin', 'super-admin'],
        default: 'admin',
      },
    }, {
      timestamps: true,
    });

    const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@printservice.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = new Admin({
      email: 'admin@printservice.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'super-admin',
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@printservice.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error setting up admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

setupAdmin();
