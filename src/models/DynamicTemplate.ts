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
  createdBy: string; // Backward compatible - stores email
  createdByUserId?: mongoose.Types.ObjectId; // Reference to User
  createdByEmail?: string; // User email for display
  createdByName?: string; // User name for display
  isPublic: boolean; // Controls visibility to all users
  createdByType: 'user' | 'admin'; // Distinguish user vs admin created templates
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
  },
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdByEmail: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  createdByName: {
    type: String,
    required: false,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: false,
    required: true
  },
  createdByType: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true
  }
}, {
  timestamps: true
});

// Create index for better search performance
dynamicTemplateSchema.index({ category: 1, createdAt: -1 });
dynamicTemplateSchema.index({ name: 'text', description: 'text' });
dynamicTemplateSchema.index({ createdByUserId: 1, createdAt: -1 });
dynamicTemplateSchema.index({ isPublic: 1, createdAt: -1 });
dynamicTemplateSchema.index({ createdByEmail: 1 });

export default mongoose.models.DynamicTemplate || mongoose.model<IDynamicTemplate>('DynamicTemplate', dynamicTemplateSchema);
