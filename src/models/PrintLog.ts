import mongoose, { Document, Schema } from 'mongoose';

export interface IPrintLog extends Document {
  _id: string;
  action: string; // e.g., "reprint", "cancel", "reset_state", "force_printed", "server_shutdown"
  orderId: string; // Order ID (indexed)
  printJobId?: string; // Print job ID for idempotency tracking
  adminId?: string; // Who performed the action
  adminEmail?: string; // Admin email for audit
  previousStatus?: string; // Previous printStatus
  newStatus?: string; // New printStatus
  reason?: string; // Reason for the action
  timestamp: Date; // When the action occurred
  metadata?: Record<string, any>; // Additional context
  createdAt: Date;
  updatedAt: Date;
}

const printLogSchema: Schema = new Schema({
  action: { 
    type: String, 
    required: true,
    index: true
  },
  orderId: { 
    type: String, 
    required: true,
    index: true
  },
  printJobId: String, // Print job ID for idempotency tracking
  adminId: String, // Who performed the action
  adminEmail: String, // Admin email for audit
  previousStatus: String, // Previous printStatus
  newStatus: String, // New printStatus
  reason: String, // Reason for the action
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  metadata: mongoose.Schema.Types.Mixed, // Additional context
}, {
  timestamps: true,
});

// Indexes for efficient queries
printLogSchema.index({ orderId: 1, timestamp: -1 });
printLogSchema.index({ timestamp: -1 });
printLogSchema.index({ action: 1, timestamp: -1 });

export default mongoose.models.PrintLog || mongoose.model<IPrintLog>('PrintLog', printLogSchema);

