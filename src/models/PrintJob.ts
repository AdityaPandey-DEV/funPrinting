import mongoose, { Document, Schema } from 'mongoose';

export interface IPrintJob extends Document {
  _id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  fileURL: string;
  fileName: string;
  fileType: string;
  printingOptions: {
    pageSize: 'A4' | 'A3' | 'Letter';
    color: 'bw' | 'color' | 'mixed';
    sided: 'single' | 'double';
    copies: number;
    pageCount: number;
    colorPages?: number[];
    bwPages?: number[];
  };
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  printerId?: string;
  printerName?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

const printJobSchema: Schema = new Schema({
  orderId: { type: String, required: true, index: true },
  orderNumber: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  fileURL: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  printingOptions: {
    pageSize: { type: String, enum: ['A4', 'A3', 'Letter'], required: true },
    color: { type: String, enum: ['bw', 'color', 'mixed'], required: true },
    sided: { type: String, enum: ['single', 'double'], required: true },
    copies: { type: Number, required: true, min: 1 },
    pageCount: { type: Number, required: true, min: 1 },
    colorPages: [{ type: Number }],
    bwPages: [{ type: Number }]
  },
  status: { 
    type: String, 
    enum: ['pending', 'printing', 'completed', 'failed', 'cancelled'], 
    default: 'pending',
    index: true
  },
  printerId: { type: String, index: true },
  printerName: { type: String },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal',
    index: true
  },
  estimatedDuration: { type: Number }, // in minutes
  actualDuration: { type: Number }, // in minutes
  startedAt: { type: Date },
  completedAt: { type: Date },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 }
}, {
  timestamps: true,
});

// Indexes for efficient queries
printJobSchema.index({ status: 1, priority: -1, createdAt: 1 });
printJobSchema.index({ orderId: 1 });
printJobSchema.index({ printerId: 1, status: 1 });

export default mongoose.models.PrintJob || mongoose.model<IPrintJob>('PrintJob', printJobSchema);
