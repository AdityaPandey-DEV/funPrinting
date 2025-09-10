import mongoose from 'mongoose';

export interface IDynamicTemplate {
  _id: string;
  id: string;
  name: string;
  description: string;
  category: string;
  pdfUrl: string;
  wordUrl?: string; // URL to the Word template file in cloud storage
  wordContent?: any; // JSON structure for backward compatibility
  placeholders: string[];
  formSchema?: any[]; // Form schema for dynamic form generation
  // Technical details for different template types
  os?: string;
  dbms?: string;
  programmingLanguage?: string;
  framework?: string;
  tools?: string[];
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const dynamicTemplateSchema = new mongoose.Schema<IDynamicTemplate>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['lab-manual', 'assignment', 'report', 'certificate', 'other'],
    default: 'other'
  },
  pdfUrl: {
    type: String,
    required: true
  },
  wordUrl: {
    type: String,
    required: false
  },
  wordContent: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  placeholders: [{
    type: String,
    required: true
  }],
  formSchema: [{
    type: mongoose.Schema.Types.Mixed,
    required: false
  }],
  // Technical details
  os: {
    type: String,
    trim: true
  },
  dbms: {
    type: String,
    trim: true
  },
  programmingLanguage: {
    type: String,
    trim: true
  },
  framework: {
    type: String,
    trim: true
  },
  tools: [{
    type: String,
    trim: true
  }],
  // Metadata
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Create index for better search performance
dynamicTemplateSchema.index({ category: 1, createdAt: -1 });
dynamicTemplateSchema.index({ name: 'text', description: 'text' });

export default mongoose.models.DynamicTemplate || mongoose.model<IDynamicTemplate>('DynamicTemplate', dynamicTemplateSchema);
