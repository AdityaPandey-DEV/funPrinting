import mongoose from 'mongoose';

export interface IPrinter {
  _id: string;
  name: string;
  printer_id?: string;
  printer_name?: string;
  status: 'online' | 'offline' | 'error' | 'maintenance' | 'busy';
  last_seen_at?: Date;
  last_successful_print_at?: Date;
  queue_length?: number;
  error_message?: string;
  driver_name?: string;
  system_name?: 'Windows' | 'Linux';
  connectionType: 'usb' | 'network' | 'wireless';
  connectionString: string;
  capabilities?: {
    supportedPageSizes?: string[];
    supportsColor?: boolean;
    supportsDuplex?: boolean;
    maxCopies?: number;
    supportedFileTypes?: string[];
    // Enhanced capabilities
    maxPaperSize?: string; // e.g., "A3", "A4", "Letter"
    recommendedDPI?: number; // e.g., 300, 600
    supportsPostScript?: boolean;
    supportsPCL?: boolean;
  };
  isActive: boolean;
  autoPrintEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const printerSchema = new mongoose.Schema<IPrinter>({
  name: { type: String, required: true },
  printer_id: { type: String, unique: true, sparse: true },
  printer_name: String,
  status: {
    type: String,
    enum: ['online', 'offline', 'error', 'maintenance', 'busy'],
    default: 'offline',
    index: true,
  },
  last_seen_at: Date,
  last_successful_print_at: Date,
  queue_length: { type: Number, default: 0 },
  error_message: String,
  driver_name: String,
  system_name: { type: String, enum: ['Windows', 'Linux'] },
  connectionType: {
    type: String,
    enum: ['usb', 'network', 'wireless'],
    required: true,
  },
  connectionString: { type: String, required: true },
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
  isActive: { type: Boolean, default: true, index: true },
  autoPrintEnabled: { type: Boolean, default: true, index: true },
}, {
  timestamps: true,
});

export const Printer = mongoose.models.Printer || mongoose.model<IPrinter>('Printer', printerSchema);

