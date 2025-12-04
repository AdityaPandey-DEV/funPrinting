'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminGoogleAuth from '@/components/admin/AdminGoogleAuth';

interface UploadResult {
  name: string;
  description: string;
  category: string;
  originalFileName: string;
  fileSize: number;
  pdfUrl: string;
  docxUrl: string;
  message: string;
}

interface Placeholder {
  key: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

function AdminUploadPageContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other'
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [formSchema, setFormSchema] = useState<Placeholder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpload = async () => {
    if (!file || !formData.name || !formData.description) {
      setError('Please fill in all required fields and select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('name', formData.name);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('category', formData.category);

      const response = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadResult(result.data);
        // Simulate placeholder extraction (in real implementation, this would come from the API)
        const mockPlaceholders = ['name', 'date', 'email', 'phone'];
        setPlaceholders(mockPlaceholders);
        setFormSchema(mockPlaceholders.map(p => ({
          key: p,
          type: 'text',
          label: p.charAt(0).toUpperCase() + p.slice(1),
          required: true,
          placeholder: `Enter ${p}`
        })));
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!uploadResult) {
      setError('Please upload a file first');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/save-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          pdfUrl: uploadResult.pdfUrl,
          docxUrl: uploadResult.docxUrl,
          placeholders,
          formSchema
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Template saved successfully!');
        router.push('/admin/templates/dynamic');
      } else {
        setError(result.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addPlaceholder = () => {
    const newPlaceholder = prompt('Enter placeholder name (without @):');
    if (newPlaceholder && !placeholders.includes(newPlaceholder)) {
      const updatedPlaceholders = [...placeholders, newPlaceholder];
      setPlaceholders(updatedPlaceholders);
      setFormSchema(updatedPlaceholders.map(p => ({
        key: p,
        type: 'text',
        label: p.charAt(0).toUpperCase() + p.slice(1),
        required: true,
        placeholder: `Enter ${p}`
      })));
    }
  };

  const removePlaceholder = (index: number) => {
    const updatedPlaceholders = placeholders.filter((_, i) => i !== index);
    setPlaceholders(updatedPlaceholders);
    setFormSchema(updatedPlaceholders.map(p => ({
      key: p,
      type: 'text',
      label: p.charAt(0).toUpperCase() + p.slice(1),
      required: true,
      placeholder: `Enter ${p}`
    })));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Upload PDF Template</h1>
            <p className="mt-1 text-sm text-gray-600">
              Upload a PDF file to convert it to a fillable template
            </p>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Template Name *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter template name"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <select
                  name="category"
                  id="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="lab-manual">Lab Manual</option>
                  <option value="assignment">Assignment</option>
                  <option value="report">Report</option>
                  <option value="certificate">Certificate</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter template description"
              />
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                PDF File *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a PDF file</span>
                      <input
                        ref={fileInputRef}
                        id="file"
                        name="file"
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF up to 50MB (no storage provider limits)</p>
                </div>
              </div>
              {file && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={uploading || !file || !formData.name || !formData.description}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload & Convert'}
              </button>
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Upload Successful</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>PDF converted to DOCX successfully!</p>
                      <p>File: {uploadResult.originalFileName}</p>
                      <p>Size: {(uploadResult.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholders Section */}
            {uploadResult && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Template Placeholders</h3>
                  <button
                    onClick={addPlaceholder}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Placeholder
                  </button>
                </div>

                <div className="space-y-2">
                  {placeholders.map((placeholder, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium text-gray-900">@{placeholder}</span>
                      <button
                        onClick={() => removePlaceholder(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {placeholders.length === 0 && (
                  <p className="text-sm text-gray-500">No placeholders found. Add some to make the template fillable.</p>
                )}
              </div>
            )}

            {/* Save Template Button */}
            {uploadResult && (
              <div className="flex justify-end">
                <button
                  onClick={handleSaveTemplate}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUploadPage() {
  return (
    <AdminGoogleAuth 
      title="Upload Template"
      subtitle="Sign in with Google to upload and manage PDF templates"
    >
      <AdminUploadPageContent />
    </AdminGoogleAuth>
  );
}
