import mongoose from 'mongoose';

export interface IPickupLocation {
  _id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isActive: boolean;
  isDefault: boolean;
  description?: string;
  contactPerson?: string;
  contactPhone?: string;
  operatingHours?: string;
  gmapLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pickupLocationSchema = new mongoose.Schema<IPickupLocation>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    trim: true,
  },
  contactPerson: {
    type: String,
    trim: true,
  },
  contactPhone: {
    type: String,
    trim: true,
  },
  operatingHours: {
    type: String,
    trim: true,
  },
  gmapLink: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Ensure only one default location exists
pickupLocationSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // Set all other locations to non-default
    await mongoose.model('PickupLocation').updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

export default mongoose.models.PickupLocation || mongoose.model<IPickupLocation>('PickupLocation', pickupLocationSchema);
