import mongoose from 'mongoose';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string; // Optional for OAuth users
  phone?: string;
  profilePicture?: string;
  provider: 'email' | 'google';
  providerId?: string; // For OAuth providers
  emailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: false }, // Optional for OAuth users
  phone: { type: String, required: false, trim: true },
  profilePicture: { type: String, required: false },
  provider: { type: String, enum: ['email', 'google'], required: true, default: 'email' },
  providerId: { type: String, required: false }, // For OAuth providers
  emailVerified: { type: Boolean, required: true, default: false },
  isActive: { type: Boolean, required: true, default: true },
  lastLogin: { type: Date, required: false },
}, {
  timestamps: true,
});

// Index for faster queries (email already has unique index from schema)
userSchema.index({ providerId: 1 });
// Note: Removed unique index on phone field to allow multiple null values

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
