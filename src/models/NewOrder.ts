import mongoose from 'mongoose';

export interface INewOrder {
  _id: string;
  id: string;
  templateId: string;
  templateName: string;
  formData: { [key: string]: string };
  pdfFile?: string; // Base64 encoded PDF (legacy)
  pdfUrl?: string; // URL to PDF in cloud storage
  status: 'pending' | 'completed' | 'failed';
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const newOrderSchema = new mongoose.Schema<INewOrder>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  templateId: {
    type: String,
    required: true,
  },
  templateName: {
    type: String,
    required: true,
  },
  formData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  pdfFile: {
    type: String,
    required: false,
  },
  pdfUrl: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

export default mongoose.models.NewOrder || mongoose.model<INewOrder>('NewOrder', newOrderSchema);
