'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  placeholders: string[];
  wordContent: any;
}

interface FormData {
  [key: string]: string;
}

export default function FillTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchTemplate(params.id as string);
    }
  }, [params.id]);

  const fetchTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      const result = await response.json();

      if (result.success) {
        setTemplate(result.template);
        
        // Initialize form data with empty values
        const initialFormData: FormData = {};
        result.template.placeholders.forEach((placeholder: string) => {
          initialFormData[placeholder] = '';
        });
        setFormData(initialFormData);
      } else {
        setError(result.error || 'Failed to load template');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      setError('Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (placeholder: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      // Generate personalized document
      const response = await fetch('/api/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template?.id,
          formData: formData
        }),
      });

      if (response.ok) {
        // Convert Word to PDF
        const wordBlob = await response.blob();
        const formDataForPdf = new FormData();
        formDataForPdf.append('wordFile', wordBlob, 'document.docx');

        const pdfResponse = await fetch('/api/convert-word-to-pdf', {
          method: 'POST',
          body: formDataForPdf,
        });

        if (pdfResponse.ok) {
          // Create order with generated PDF
          const pdfBlob = await pdfResponse.blob();
          const orderResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              templateId: template?.id,
              templateName: template?.name,
              formData: formData,
              pdfFile: await blobToBase64(pdfBlob)
            }),
          });

          if (orderResponse.ok) {
            const orderResult = await orderResponse.json();
            // Redirect to order page
            router.push(`/orders/${orderResult.orderId}`);
          } else {
            throw new Error('Failed to create order');
          }
        } else {
          throw new Error('Failed to convert to PDF');
        }
      } else {
        throw new Error('Failed to generate document');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      setError('Failed to generate document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
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
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Fill Out Your Document
            </h1>
            <p className="text-gray-600">
              Complete the form below to generate your personalized <strong>{template.name}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {template.placeholders.map((placeholder) => (
              <div key={placeholder}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {placeholder.charAt(0).toUpperCase() + placeholder.slice(1).replace(/([A-Z])/g, ' $1')}
                </label>
                <input
                  type="text"
                  value={formData[placeholder] || ''}
                  onChange={(e) => handleInputChange(placeholder, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Enter ${placeholder.toLowerCase()}`}
                  required
                />
              </div>
            ))}

            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Generating Your Document...
                  </div>
                ) : (
                  'Generate My Document'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Your document will be generated and you'll be redirected to the order page.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
