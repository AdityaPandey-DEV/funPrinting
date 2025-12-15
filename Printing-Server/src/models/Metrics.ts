import mongoose from 'mongoose';

export interface IMetrics {
  _id: string;
  timestamp: Date;
  prints_per_hour: number;
  failures_per_hour: number;
  average_print_start_delay: number; // seconds
  printer_offline_duration: number; // seconds
  workerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const metricsSchema = new mongoose.Schema<IMetrics>({
  timestamp: { type: Date, required: true, index: true, default: Date.now },
  prints_per_hour: { type: Number, default: 0 },
  failures_per_hour: { type: Number, default: 0 },
  average_print_start_delay: { type: Number, default: 0 }, // seconds
  printer_offline_duration: { type: Number, default: 0 }, // seconds
  workerId: { type: String, required: true, index: true },
}, {
  timestamps: true,
});

// Indexes for efficient queries
metricsSchema.index({ timestamp: -1 });
metricsSchema.index({ workerId: 1, timestamp: -1 });

export const Metrics = mongoose.models.Metrics || mongoose.model<IMetrics>('Metrics', metricsSchema);

