'use client';

import React, { useState, useEffect } from 'react';
import { MemoIcon, DocumentIcon } from '@/components/SocialIcons';

interface DocxEditorProps {
  docxBuffer: string;
  placeholders: string[];
  onSave: (editedBuffer: string) => void;
  onClose: () => void;
}

export default function DocxEditor({ docxBuffer, placeholders, onSave, onClose }: DocxEditorProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data with placeholders
  useEffect(() => {
    const initialData: Record<string, string> = {};
    placeholders.forEach(placeholder => {
      initialData[placeholder] = '';
      // Set default values for common placeholders
      if (placeholder.toLowerCase().includes('date')) {
        initialData[placeholder] = new Date().toISOString().slice(0, 10);
      }
      if (placeholder.toLowerCase().includes('name')) {
        initialData[placeholder] = 'John Doe';
      }
      if (placeholder.toLowerCase().includes('email')) {
        initialData[placeholder] = 'john.doe@example.com';
      }
    });
    setFormData(initialData);
  }, [placeholders]);

  const handleInputChange = (placeholder: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  const handleSave = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-personalized-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docxBuffer,
          formData,
          filename: `edited-${Date.now()}.docx`
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to base64
        let binaryString = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, i + chunkSize);
          binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binaryString);
        
        onSave(base64);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save document');
      }
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Network error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-personalized-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docxBuffer,
          formData,
          filename: `personalized-${Date.now()}.docx`
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `personalized-${Date.now()}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to download document');
      }
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Network error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            <span className="flex items-center gap-2">
              <MemoIcon size={20} className="w-5 h-5" />
              Edit Document Placeholders
            </span>
          </h2>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                📋 Placeholder Editor
              </h3>
              <p className="text-blue-700 text-sm">
                Edit the values for each placeholder. The document will be updated with your changes while preserving all original formatting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {placeholders.map((placeholder, index) => (
                <div key={index} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    @{placeholder}
                  </label>
                  <input
                    type="text"
                    value={formData[placeholder] || ''}
                    onChange={(e) => handleInputChange(placeholder, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter value for @${placeholder}`}
                  />
                </div>
              ))}
            </div>

            {placeholders.length === 0 && (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <DocumentIcon size={64} className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-gray-600">No placeholders found in this document.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Add placeholders like @name, @date, @email to your document and re-upload.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {placeholders.length} placeholder{placeholders.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleDownload}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Download'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
