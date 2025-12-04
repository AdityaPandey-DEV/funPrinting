'use client';

import { useState, useEffect } from 'react';
import EnhancedLiveWordPreview from '@/components/EnhancedLiveWordPreview';

interface FormField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

export default function LivePreviewPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();

      if (result.success) {
        setTemplates(result.templates);
        if (result.templates.length > 0) {
          setSelectedTemplate(result.templates[0]);
          initializeFormData(result.templates[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeFormData = (template: any) => {
    const initialData: Record<string, any> = {};
    template.formSchema.forEach((field: FormField) => {
      initialData[field.key] = '';
    });
    setFormData(initialData);
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      initializeFormData(template);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderFormField = (field: FormField) => {
    const commonProps = {
      id: field.key,
      name: field.key,
      value: formData[field.key] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleInputChange(field.key, e.target.value),
      placeholder: field.placeholder,
      required: field.required,
      className: "mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={3}
            className={`${commonProps.className} resize-vertical`}
          />
        );
      case 'email':
        return (
          <input
            {...commonProps}
            type="email"
          />
        );
      case 'tel':
        return (
          <input
            {...commonProps}
            type="tel"
          />
        );
      case 'date':
        return (
          <input
            {...commonProps}
            type="date"
          />
        );
      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
          />
        );
      default:
        return (
          <input
            {...commonProps}
            type="text"
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Word Preview Demo</h1>
          <p className="text-gray-600">
            Test the live preview functionality with different templates and form data
          </p>
        </div>

        {/* Template Selection */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Select Template</h2>
          </div>
          <div className="p-6">
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="text-xl mr-2">📝</span>
                  Form Data
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Edit the form to see live preview changes
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {selectedTemplate.formSchema.map((field: FormField) => (
                    <div key={field.key}>
                      <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderFormField(field)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Preview Section */}
            <div className="bg-white shadow rounded-lg">
              <EnhancedLiveWordPreview
                templateId={selectedTemplate.id}
                formData={formData}
                onUpdate={setFormData}
                className="h-full"
                previewType="docx"
              />
            </div>
          </div>
        )}

        {!selectedTemplate && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Template Selected</h3>
            <p className="text-gray-500">Please select a template to see the live preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
