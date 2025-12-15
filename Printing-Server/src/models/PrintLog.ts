import mongoose from 'mongoose';

export interface IPrintLog {
  _id: string;
  action: string;
  orderId: string;
  printJobId?: string;
  adminId?: string;
  adminEmail?: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const printLogSchema = new mongoose.Schema<IPrintLog>({
  action: { type: String, required: true, index: true },
  orderId: { type: String, required: true, index: true },
  printJobId: String,
  adminId: String,
  adminEmail: String,
  previousStatus: String,
  newStatus: String,
  reason: String,
  timestamp: { type: Date, default: Date.now, index: true },
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

export const PrintLog = mongoose.models.PrintLog || mongoose.model<IPrintLog>('PrintLog', printLogSchema);

