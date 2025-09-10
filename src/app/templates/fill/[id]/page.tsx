'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FormField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  placeholders: string[];
  formSchema: FormField[];
  pdfUrl: string;
  wordUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  [key: string]: string;
}

export default function TemplateFillPage({ params }: { params: Promise<{ id: string }> }) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setTemplateId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/admin/save-template?id=${templateId}`);
      const result = await response.json();

      if (result.success) {
        setTemplate(result.data.template);
        // Initialize form data with empty values
        const initialFormData: FormData = {};
        
        // Check if formSchema exists and is an array
        if (result.data.template.formSchema && Array.isArray(result.data.template.formSchema)) {
          result.data.template.formSchema.forEach((field: FormField) => {
            initialFormData[field.key] = '';
          });
        } else if (result.data.template.placeholders && Array.isArray(result.data.template.placeholders)) {
          // Fallback: use placeholders array to create form data
          result.data.template.placeholders.forEach((placeholder: string) => {
            initialFormData[placeholder] = '';
          });
        }
        
        setFormData(initialFormData);
      } else {
        setError(result.error || 'Template not found');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      setError('Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    // Normalize input to prevent page count variations
    let normalizedValue = value;
    
    // Limit text length to prevent excessive page growth
    const maxLength = 500;
    if (normalizedValue.length > maxLength) {
      normalizedValue = normalizedValue.substring(0, maxLength);
      console.log(`⚠️ Truncated field ${key} to ${maxLength} characters to prevent page count variations`);
    }
    
    // Normalize line breaks
    normalizedValue = normalizedValue.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Limit consecutive line breaks
    normalizedValue = normalizedValue.replace(/\n{3,}/g, '\n\n');
    
    // Normalize spaces
    normalizedValue = normalizedValue.replace(/\s{2,}/g, ' ');
    
    setFormData(prev => ({
      ...prev,
      [key]: normalizedValue
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!template) return errors;

    // Check if formSchema exists and is an array
    if (template.formSchema && Array.isArray(template.formSchema)) {
      template.formSchema.forEach(field => {
        if (field.required && (!formData[field.key] || formData[field.key].trim() === '')) {
          errors.push(`${field.label} is required`);
        }
      });
    } else if (template.placeholders && Array.isArray(template.placeholders)) {
      // Fallback: validate placeholders as required fields
      template.placeholders.forEach(placeholder => {
        if (!formData[placeholder] || formData[placeholder].trim() === '') {
          errors.push(`${placeholder} is required`);
        }
      });
    }

    return errors;
  };

  const handleDownload = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🔄 Downloading filled document...');
      console.log('📝 Form data:', formData);

      const response = await fetch('/api/templates/user-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template?.id,
          formData
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('❌ Download error response:', errText);
        throw new Error('Failed to generate document');
      }

      // Stream binary DOCX and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template?.name?.replace(/[^\w\-\s\.]/g, '').trim().replace(/\s+/g, '-') || 'document'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      console.log('✅ Document downloaded successfully');

      // Show countdown and redirect after 10 seconds to allow download to finish
      const targetUrl = 'https://www.ilovepdf.com/word_to_pdf';
      setRedirectMessage('Redirecting to iLovePDF Word to PDF');
      setRedirectCountdown(10);
      const intervalId = window.setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            window.clearInterval(intervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      window.setTimeout(() => {
        window.clearInterval(intervalId);
        window.location.href = targetUrl;
      }, 10000);

    } catch (error) {
      console.error('❌ Error downloading document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download document. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };


  const renderFormField = (field: FormField) => {
    const currentValue = formData[field.key] || '';
    const maxLength = 500;
    const isNearLimit = currentValue.length > maxLength * 0.8;
    const isOverLimit = currentValue.length > maxLength;
    
    const commonProps = {
      id: field.key,
      name: field.key,
      value: currentValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleInputChange(field.key, e.target.value),
      placeholder: field.placeholder,
      required: field.required,
      maxLength: maxLength,
      className: `mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
        isOverLimit ? 'border-red-300 bg-red-50' : isNearLimit ? 'border-yellow-300 bg-yellow-50' : ''
      }`
    };

    switch (field.type) {
      case 'textarea':
        return (
          <div>
            <textarea
              {...commonProps}
              rows={3}
              className={`${commonProps.className} resize-vertical`}
            />
            <div className={`text-xs mt-1 ${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}`}>
              {currentValue.length}/{maxLength} characters
              {isOverLimit && ' (Text will be truncated)'}
            </div>
          </div>
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
          <div>
            <input
              {...commonProps}
              type="text"
            />
            {currentValue.length > 100 && (
              <div className={`text-xs mt-1 ${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}`}>
                {currentValue.length}/{maxLength} characters
                {isOverLimit && ' (Text will be truncated)'}
              </div>
            )}
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/templates"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">📄</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Template Not Found</h3>
          <p className="text-gray-600 mb-4">The requested template could not be found.</p>
          <Link
            href="/templates"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/templates"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Templates
          </Link>
        </div>

        {/* Template Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
            <p className="mt-1 text-sm text-gray-600">{template.description}</p>
            <div className="mt-2">
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {template.category}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          {/* Form Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-xl mr-2">📝</span>
                Fill Template Form
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Fill out the form below and download your personalized document
              </p>
            </div>

            <div className="p-6">
              {(error || redirectCountdown !== null) && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="ml-3">
                      {error && (
                        <>
                          <h3 className="text-sm font-medium text-red-800">Error</h3>
                          <div className="mt-2 text-sm text-red-700">{error}</div>
                        </>
                      )}
                      {redirectCountdown !== null && (
                        <div className="mt-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-3">
                          {redirectMessage || 'Redirecting'} in {redirectCountdown}s... Please wait while your download starts.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}


              <form className="space-y-6">
                <div className="space-y-4">
                  {template.formSchema && Array.isArray(template.formSchema) ? (
                    // Use formSchema if available
                    template.formSchema.map((field) => (
                      <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                        <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderFormField(field)}
                      </div>
                    ))
                  ) : template.placeholders && Array.isArray(template.placeholders) ? (
                    // Fallback: use placeholders to create form fields
                    template.placeholders.map((placeholder) => (
                      <div key={placeholder}>
                        <label htmlFor={placeholder} className="block text-sm font-medium text-gray-700">
                          {placeholder.charAt(0).toUpperCase() + placeholder.slice(1)}
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          id={placeholder}
                          value={formData[placeholder] || ''}
                          onChange={(e) => handleInputChange(placeholder, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Enter ${placeholder}`}
                          required
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No form fields available for this template.
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                  <Link
                    href="/templates"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </Link>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Downloading...' : 'Download Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}