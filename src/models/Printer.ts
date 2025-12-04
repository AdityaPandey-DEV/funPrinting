import mongoose, { Document, Schema } from 'mongoose';

export interface IPrinter extends Document {
  _id: string;
  name: string;
  printerModel: string;
  manufacturer: string;
  connectionType: 'usb' | 'network' | 'wireless';
  connectionString: string; // USB path, IP address, or network path
  status: 'online' | 'offline' | 'error' | 'maintenance';
  capabilities: {
    supportedPageSizes: string[];
    supportsColor: boolean;
    supportsDuplex: boolean;
    maxCopies: number;
    supportedFileTypes: string[];
  };
  currentJob?: string; // PrintJob ID
  queueLength: number;
  lastUsed?: Date;
  lastMaintenance?: Date;
  totalPagesPrinted: number;
  isActive: boolean;
  autoPrintEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const printerSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  printerModel: { type: String, required: true },
  manufacturer: { type: String, required: true },
  connectionType: { 
    type: String, 
    enum: ['usb', 'network', 'wireless'], 
    required: true 
  },
  connectionString: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['online', 'offline', 'error', 'maintenance'], 
    default: 'offline',
    index: true
  },
  capabilities: {
    supportedPageSizes: [{ type: String }],
    supportsColor: { type: Boolean, default: false },
    supportsDuplex: { type: Boolean, default: false },
    maxCopies: { type: Number, default: 1 },
    supportedFileTypes: [{ type: String }]
  },
  currentJob: { type: String, ref: 'PrintJob' },
  queueLength: { type: Number, default: 0 },
  lastUsed: { type: Date },
  lastMaintenance: { type: Date },
  totalPagesPrinted: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  autoPrintEnabled: { type: Boolean, default: true, index: true }
}, {
  timestamps: true,
});

// Indexes for efficient queries
printerSchema.index({ status: 1, isActive: 1 });
printerSchema.index({ autoPrintEnabled: 1, status: 1 });

export default mongoose.models.Printer || mongoose.model<IPrinter>('Printer', printerSchema);
