import mongoose from 'mongoose';

export interface IAdmin {
  _id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'super-admin';
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new mongoose.Schema<IAdmin>({
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

export default mongoose.models.Admin || mongoose.model<IAdmin>('Admin', adminSchema);
