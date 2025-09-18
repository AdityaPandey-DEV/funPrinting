import mongoose from 'mongoose';

export interface IPricing {
  _id: string;
  basePrices: {
    A4: number;
    A3: number;
  };
  multipliers: {
    color: number;
    doubleSided: number;
  };
  deliveryCharges: {
    pickup: number;
    delivery: {
      '0-5': number;
      '5-10': number;
      '10-15': number;
      '15-20': number;
      '20+': number;
    };
  };
  additionalServices: {
    binding: number;
    resumeTemplate: number;
    minServiceFee: number;
    minServiceFeePageLimit: number;
  };
  updatedBy: string;
  updatedAt: Date;
}

const pricingSchema = new mongoose.Schema<IPricing>({
  basePrices: {
    A4: { type: Number, required: true, default: 5 },
    A3: { type: Number, required: true, default: 10 },
  },
  multipliers: {
    color: { type: Number, required: true, default: 2 },
    doubleSided: { type: Number, required: true, default: 1.5 },
  },
  deliveryCharges: {
    pickup: { type: Number, required: true, default: 0 },
    delivery: {
      '0-5': { type: Number, required: true, default: 10 },
      '5-10': { type: Number, required: true, default: 20 },
      '10-15': { type: Number, required: true, default: 30 },
      '15-20': { type: Number, required: true, default: 40 },
      '20+': { type: Number, required: true, default: 50 },
    },
  },
  additionalServices: {
    binding: { type: Number, required: true, default: 20 },
    resumeTemplate: { type: Number, required: true, default: 0 },
    minServiceFee: { type: Number, required: true, default: 5 },
    minServiceFeePageLimit: { type: Number, required: true, default: 1 },
  },
  updatedBy: { type: String, required: true },
}, {
  timestamps: true,
});

// Ensure only one pricing document exists
pricingSchema.index({}, { unique: true });

export default mongoose.models.Pricing || mongoose.model<IPricing>('Pricing', pricingSchema);
