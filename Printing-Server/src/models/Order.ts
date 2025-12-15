import mongoose from 'mongoose';

export interface IOrder {
  _id: string;
  orderId: string;
  customerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  orderType: 'file' | 'template';
  fileURL?: string;
  fileURLs?: string[];
  originalFileName?: string;
  originalFileNames?: string[];
  printingOptions: {
    pageSize: 'A4' | 'A3';
    color: 'color' | 'bw' | 'mixed';
    sided: 'single' | 'double';
    copies: number;
    pageCount?: number;
    pageColors?: {
      colorPages?: number[];
      bwPages?: number[];
    } | Array<{
      colorPages?: number[];
      bwPages?: number[];
    }>;
  };
  paymentStatus: 'pending' | 'completed' | 'failed';
  printStatus?: 'pending' | 'printing' | 'printed';
  printError?: string;
  printerId?: string;
  printerName?: string;
  printStartedAt?: Date;
  printCompletedAt?: Date;
  // Production-critical: Idempotency and ownership
  printJobId?: string; // UUID for print job idempotency
  printAttempt?: number; // Number of print attempts (default: 0)
  maxPrintAttempts?: number; // Maximum print attempts before requiring admin action (default: 3)
  printingBy?: string; // Worker ID that owns this print job
  printingHeartbeatAt?: Date; // Last heartbeat update while printing (for stale job detection)
  printSegments?: Array<{ // For mixed printing (color/BW segments)
    segmentId: string;
    pageRange?: {
      start: number;
      end: number;
    };
    printMode?: 'color' | 'bw';
    copies?: number;
    paperSize?: 'A4' | 'A3';
    duplex?: boolean;
    status: 'pending' | 'printing' | 'completed' | 'failed';
    printJobId?: string;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new mongoose.Schema<IOrder>({
  orderId: { type: String, required: true, index: true },
  customerInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  orderType: { type: String, enum: ['file', 'template'], required: true },
  fileURL: String,
  fileURLs: [String],
  originalFileName: String,
  originalFileNames: [String],
  printingOptions: {
    pageSize: { type: String, enum: ['A4', 'A3'], required: true },
    color: { type: String, enum: ['color', 'bw', 'mixed'], required: true },
    sided: { type: String, enum: ['single', 'double'], required: true },
    copies: { type: Number, required: true, min: 1 },
    pageCount: { type: Number, default: 1 },
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  printStatus: {
    type: String,
    enum: ['pending', 'printing', 'printed'],
    index: true,
  },
  printError: String,
  printerId: String,
  printerName: String,
  printStartedAt: Date,
  printCompletedAt: Date,
  // Production-critical: Idempotency and ownership
  printJobId: { type: String, index: true, sparse: true, unique: true }, // UUID for print job idempotency
  printAttempt: { type: Number, default: 0 }, // Number of print attempts
  maxPrintAttempts: { type: Number, default: 3 }, // Maximum print attempts before requiring admin action
  printingBy: { type: String, index: true }, // Worker ID that owns this print job
  printingHeartbeatAt: { type: Date, index: true }, // Last heartbeat update while printing (for stale job detection)
  printSegments: [{ // For mixed printing (color/BW segments)
    segmentId: String,
    pageRange: {
      start: Number,
      end: Number,
    },
    printMode: { type: String, enum: ['color', 'bw'] },
    copies: Number,
    paperSize: { type: String, enum: ['A4', 'A3'] },
    duplex: Boolean,
    status: { type: String, enum: ['pending', 'printing', 'completed', 'failed'] },
    printJobId: String,
    startedAt: Date,
    completedAt: Date,
    error: String,
  }],
}, {
  timestamps: true,
});

// Indexes for efficient queries
orderSchema.index({ printJobId: 1 }, { unique: true, sparse: true });
orderSchema.index({ printingBy: 1, printStatus: 1 });
orderSchema.index({ printingHeartbeatAt: 1 }); // For stale job detection
orderSchema.index({ printStatus: 1, printAttempt: 1 }); // For retry limit queries

export const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);

