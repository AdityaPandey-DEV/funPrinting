'use client';

import { useState, useRef } from 'react';
import ProfessionalWordConverter from '@/components/ProfessionalWordConverter';

export default function DynamicTemplateUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: 'lab-manual',
  });
  const [extractedPlaceholders, setExtractedPlaceholders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'edit' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Create preview URL
    const url = URL.createObjectURL(selectedFile);
    setDocxUrl(url);
    setStep('edit');
  };

  const handlePlaceholdersExtracted = (placeholders: string[]) => {
    setExtractedPlaceholders(placeholders);
  };

  const handleSaveTemplate = async () => {
    if (!file || extractedPlaceholders.length === 0) return;

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateData', JSON.stringify({
      ...templateData,
      placeholders: extractedPlaceholders,
    }));

    try {
      const response = await fetch('/api/admin/templates/dynamic/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        alert('Template saved successfully!');
        setStep('preview');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create Dynamic Template</h1>
      
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center ${step === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="ml-2">Upload Word Document</span>
          </div>
          <div className="w-8 h-1 bg-gray-200"></div>
          <div className={`flex items-center ${step === 'edit' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'edit' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="ml-2">Edit & Extract Placeholders</span>
          </div>
          <div className="w-8 h-1 bg-gray-200"></div>
          <div className={`flex items-center ${step === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="ml-2">Preview & Save</span>
          </div>
        </div>
      </div>

      {step === 'upload' && (
        <div className="text-center">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 text-lg"
            >
              Upload Word Document
            </button>
            <p className="mt-4 text-gray-600">
              Upload your Word document (.docx or .doc) with placeholders like @name, @date, etc.
            </p>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <h4 className="text-sm font-medium text-blue-800 mb-2">📝 How to prepare your Word document:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• <strong>Use placeholders</strong> like @name, @date, @courseName, etc.</li>
                <li>• <strong>Convert PDF to Word</strong> using Adobe online or other tools first</li>
                <li>• <strong>Edit in Word</strong> to add your placeholders where needed</li>
                <li>• <strong>Save as .docx</strong> format for best compatibility</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {step === 'edit' && docxUrl && (
        <div className="space-y-6">
          {/* Template Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Template Name</label>
              <input
                type="text"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900"
                placeholder="e.g., Computer Science Lab Manual"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={templateData.category}
                onChange={(e) => setTemplateData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900"
              >
                <option value="lab-manual">Lab Manual</option>
                <option value="assignment">Assignment</option>
                <option value="report">Report</option>
                <option value="certificate">Certificate</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={templateData.description}
              onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900"
              rows={3}
              placeholder="Describe what this template is for..."
            />
          </div>

          {/* Professional Word Converter */}
          <ProfessionalWordConverter
            pdfUrl={docxUrl}
            onPlaceholdersExtracted={handlePlaceholdersExtracted}
          />

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
            >
              ← Back
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={!templateData.name || extractedPlaceholders.length === 0 || isUploading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8">
            <div className="text-green-600 text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Template Created Successfully!</h2>
            <p className="text-green-700 mb-4">
              Your dynamic template &quot;{templateData.name}&quot; has been saved with {extractedPlaceholders.length} placeholders.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.location.href = '/admin/templates/dynamic'}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                View All Templates
              </button>
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setDocxUrl(null);
                  setExtractedPlaceholders([]);
                  setTemplateData({ name: '', description: '', category: 'lab-manual' });
                }}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Create Another Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
