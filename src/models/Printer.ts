import mongoose, { Document, Schema } from 'mongoose';

export interface IPrinter extends Document {
  name: string;
  printerModel: string;
  manufacturer: string;
  connectionType: 'usb' | 'network' | 'wireless';
  connectionString: string; // USB path, IP address, or network path
  status: 'online' | 'offline' | 'error' | 'maintenance' | 'busy';
  // Health monitoring fields
  printer_id?: string; // Unique identifier (alternative to _id)
  printer_name?: string; // Display name (alternative to name)
  last_seen_at?: Date; // Last health check timestamp
  last_successful_print_at?: Date; // Last successful print timestamp
  queue_length?: number; // Current queue length (alternative to queueLength)
  error_message?: string; // Current error message if status is 'error'
  driver_name?: string; // Printer driver name
  system_name?: 'Windows' | 'Linux'; // Operating system
  capabilities: {
    supportedPageSizes: string[];
    supportsColor: boolean;
    supportsDuplex: boolean;
    maxCopies: number;
    supportedFileTypes: string[];
    // Enhanced capabilities
    maxPaperSize?: string; // e.g., "A3", "A4", "Letter"
    recommendedDPI?: number; // e.g., 300, 600
    supportsPostScript?: boolean;
    supportsPCL?: boolean;
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
    enum: ['online', 'offline', 'error', 'maintenance', 'busy'], 
    default: 'offline',
    index: true
  },
  // Health monitoring fields
  printer_id: { type: String, unique: true, sparse: true }, // Unique identifier
  printer_name: String, // Display name
  last_seen_at: Date, // Last health check timestamp
  last_successful_print_at: Date, // Last successful print timestamp
  queue_length: { type: Number, default: 0 }, // Current queue length
  error_message: String, // Current error message if status is 'error'
  driver_name: String, // Printer driver name
  system_name: { type: String, enum: ['Windows', 'Linux'] }, // Operating system
  capabilities: {
    supportedPageSizes: [{ type: String }],
    supportsColor: { type: Boolean, default: false },
    supportsDuplex: { type: Boolean, default: false },
    maxCopies: { type: Number, default: 1 },
    supportedFileTypes: [{ type: String }],
    // Enhanced capabilities
    maxPaperSize: String, // e.g., "A3", "A4", "Letter"
    recommendedDPI: Number, // e.g., 300, 600
    supportsPostScript: { type: Boolean, default: false },
    supportsPCL: { type: Boolean, default: false },
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
printerSchema.index({ printer_id: 1 }, { unique: true, sparse: true });
printerSchema.index({ last_seen_at: -1 });

export default mongoose.models.Printer || mongoose.model<IPrinter>('Printer', printerSchema);
