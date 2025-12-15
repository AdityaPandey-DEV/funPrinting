import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(MONGODB_URI as string);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });

    return mongoose.connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    isConnected = false;
    throw error;
  }
}

export async function disconnectMongoDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🔌 Disconnected from MongoDB');
  }
}

