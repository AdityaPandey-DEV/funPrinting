'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  placeholders: string[];
  pdfUrl: string;
  wordUrl: string;
  isPaid?: boolean;
  price?: number;
  allowFreeDownload?: boolean;
}

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  placeholder: string;
  required: boolean;
  placeholderKey: string;
}

interface FormConfig {
  title: string;
  description: string;
  fields: FormField[];
  submitText: string;
  validation: {
    required: string[];
  };
}

export default function CustomTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setIsLoading(true);
      
      // Fetch template details
      const templateResponse = await fetch(`/api/templates/${templateId}`);
      if (!templateResponse.ok) {
        throw new Error('Template not found');
      }
      
      const templateData = await templateResponse.json();
      setTemplate(templateData.template);
      
      // Generate dynamic form based on placeholders
      const formResponse = await fetch('/api/generate-dynamic-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placeholders: templateData.template.placeholders
        })
      });
      
      if (!formResponse.ok) {
        throw new Error('Failed to generate form');
      }
      
      const formData = await formResponse.json();
      setFormConfig(formData.formConfig);
      
    } catch (error) {
      console.error('Error fetching template:', error);
      setError('Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formConfig) return false;
    
    for (const fieldName of formConfig.validation.required) {
      if (!formData[fieldName] || formData[fieldName].trim() === '') {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Generate custom document
      const response = await fetch('/api/templates/generate-custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: templateId,
          formData: formData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const result = await response.json();
      
      if (result.success) {
        // Redirect to order page with the generated PDF
        const orderData = {
          templateId: templateId,
          templateName: template?.name,
          pdfUrl: result.pdfUrl,
          customerData: formData
        };
        
        // Store order data in sessionStorage for the order page
        sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));
        
        // Redirect to order page
        router.push('/order');
      } else {
        throw new Error(result.error || 'Failed to generate document');
      }
      
    } catch (error) {
      console.error('Error generating document:', error);
      setError('Failed to generate document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template || !formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error || 'Template not found'}</p>
          <button
            onClick={() => router.push('/templates')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Template Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{template.name}</h1>
          <p className="text-gray-600 mb-4">{template.description}</p>
          <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {template.category}
            </span>
            <span>{formConfig.fields.length} fields to fill</span>
            <span className={`px-2 py-1 rounded font-medium ${
              template.isPaid && (template.price ?? 0) > 0 
                ? 'bg-orange-100 text-orange-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {template.isPaid && (template.price ?? 0) > 0 
                ? `Template fee: ₹${template.price}` 
                : 'Template: Free'}
            </span>
            {template.isPaid && template.allowFreeDownload === false && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                Download requires order
              </span>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{formConfig.title}</h2>
            <p className="text-gray-600">{formConfig.description}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {formConfig.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    className="form-input"
                  />
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="form-input"
                  />
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-6">
              <button
                type="button"
                onClick={() => router.push('/templates')}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                ← Back to Templates
              </button>
              
              <button
                type="submit"
                disabled={!validateForm() || isGenerating}
                className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  formConfig.submitText
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}