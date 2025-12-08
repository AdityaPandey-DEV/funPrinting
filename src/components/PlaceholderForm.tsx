'use client';

import React, { useState, useEffect } from 'react';
import { MemoIcon, DocumentIcon } from '@/components/SocialIcons';

interface PlaceholderFormProps {
  docxBuffer: string;
  onGenerateDocument: (formData: Record<string, string>) => void;
  onDocumentEdited?: (newDocxBuffer: string) => void;
  onClose: () => void;
}

export default function PlaceholderForm({ docxBuffer, onGenerateDocument, onDocumentEdited, onClose }: PlaceholderFormProps) {
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Extract placeholders from the Word document
  useEffect(() => {
    const extractPlaceholders = async () => {
      try {
        setIsLoading(true);
        
        // Send the document to the API to extract placeholders
        const response = await fetch('/api/extract-placeholders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            docxBuffer: docxBuffer
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setPlaceholders(data.placeholders || []);
          
          // Initialize form data with empty values
          const initialFormData: Record<string, string> = {};
          data.placeholders?.forEach((placeholder: string) => {
            initialFormData[placeholder] = '';
          });
          setFormData(initialFormData);
        } else {
          console.error('Failed to extract placeholders');
          // Fallback: try to extract placeholders from filename or use common ones
          setPlaceholders(['name', 'phone', 'email', 'address', 'date']);
          setFormData({
            name: '',
            phone: '',
            email: '',
            address: '',
            date: ''
          });
        }
      } catch (error) {
        console.error('Error extracting placeholders:', error);
        // Fallback placeholders
        setPlaceholders(['name', 'phone', 'email', 'address', 'date']);
        setFormData({
          name: '',
          phone: '',
          email: '',
          address: '',
          date: ''
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (docxBuffer) {
      extractPlaceholders();
    }
  }, [docxBuffer]);

  const handleInputChange = (placeholder: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  const handleGenerateDocument = async () => {
    try {
      setIsGenerating(true);
      
      // Check if all required fields are filled
      const missingFields = placeholders.filter(placeholder => !formData[placeholder]?.trim());
      if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Generate the personalized document
      const response = await fetch('/api/generate-personalized-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docxBuffer: docxBuffer,
          formData: formData,
          filename: `${formData.name || 'user'}-${formData.phone || 'phone'}.docx`
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formData.name || 'user'}-${formData.phone || 'phone'}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        onGenerateDocument(formData);
      } else {
        alert('Failed to generate document. Please try again.');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Error generating document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPlaceholderLabel = (placeholder: string) => {
    const labels: Record<string, string> = {
      'name': 'Full Name',
      'phone': 'Phone Number',
      'email': 'Email Address',
      'address': 'Address',
      'date': 'Date',
      'courseName': 'Course Name',
      'university': 'University',
      'studentId': 'Student ID',
      'rollNumber': 'Roll Number',
      'semester': 'Semester',
      'year': 'Year',
      'subject': 'Subject',
      'teacher': 'Teacher Name',
      'department': 'Department'
    };
    return labels[placeholder] || placeholder.charAt(0).toUpperCase() + placeholder.slice(1);
  };

  const getInputType = (placeholder: string) => {
    if (placeholder.toLowerCase().includes('email')) return 'email';
    if (placeholder.toLowerCase().includes('phone')) return 'tel';
    if (placeholder.toLowerCase().includes('date')) return 'date';
    if (placeholder.toLowerCase().includes('address')) return 'textarea';
    return 'text';
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing document for placeholders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-800">
            <span className="flex items-center gap-2">
              <MemoIcon size={20} className="w-5 h-5" />
              Fill Document Details
            </span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Please fill in the following details to personalize your document:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Found {placeholders.length} placeholders:</strong> {placeholders.join(', ')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {placeholders.map((placeholder) => (
              <div key={placeholder} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {getPlaceholderLabel(placeholder)} *
                </label>
                {getInputType(placeholder) === 'textarea' ? (
                  <textarea
                    value={formData[placeholder] || ''}
                    onChange={(e) => handleInputChange(placeholder, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder={`Enter ${getPlaceholderLabel(placeholder).toLowerCase()}`}
                    required
                  />
                ) : (
                  <input
                    type={getInputType(placeholder)}
                    value={formData[placeholder] || ''}
                    onChange={(e) => handleInputChange(placeholder, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${getPlaceholderLabel(placeholder).toLowerCase()}`}
                    required
                  />
                )}
              </div>
            ))}
          </div>

          {/* Auto-fill common fields */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Fill:</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    date: new Date().toLocaleDateString()
                  }));
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Fill Today&apos;s Date
              </button>
              <button
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    name: 'John Doe',
                    phone: '1234567890',
                    email: 'john@example.com',
                    address: '123 Main St, City, State'
                  }));
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Fill Sample Data
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateDocument}
            disabled={isGenerating}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <DocumentIcon size={16} className="w-4 h-4" />
                <span>Generate & Download Document</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
