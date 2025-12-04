import mongoose from 'mongoose';

export interface IVerificationToken {
  _id: string;
  token: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const verificationTokenSchema = new mongoose.Schema<IVerificationToken>(
  {
    token: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

// TTL index so documents are removed automatically once expiresAt is in the past
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.VerificationToken ||
  mongoose.model<IVerificationToken>('VerificationToken', verificationTokenSchema);


