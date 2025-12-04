'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRazorpay } from '@/hooks/useRazorpay';

interface FormField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  defaultPlaceholder?: string;
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
  isPaid?: boolean;
  price?: number;
  allowFreeDownload?: boolean;
}

interface FormData {
  [key: string]: string;
}

type Step = 'filling' | 'payment' | 'complete';

export default function TemplateFillPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { isLoaded: isRazorpayLoaded, error: razorpayError, openRazorpay } = useRazorpay();
  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('filling');
  const [generatedWordUrl, setGeneratedWordUrl] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
    setFormData(prev => ({
      ...prev,
      [key]: value
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🔄 Generating filled document...');
      console.log('📝 Form data:', formData);

      const response = await fetch('/api/templates/generate-fill', {
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
        console.error('❌ Generation error response:', errText);
        throw new Error('Failed to generate document');
      }

      const result = await response.json();
      
      if (result.success) {
        setGeneratedWordUrl(result.wordUrl);
        
        // Check if template is paid
        if (template?.isPaid && (template.price ?? 0) > 0) {
          // Move to payment step
          setStep('payment');
        } else {
          // Free template - show options directly
          setStep('complete');
        }
      } else {
        throw new Error(result.error || 'Failed to generate document');
      }
      
    } catch (error) {
      console.error('❌ Error generating document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate document. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!template || !generatedWordUrl) return;
    
    if (!isRazorpayLoaded) {
      alert('Payment gateway is loading. Please wait a moment.');
      return;
    }

    if (razorpayError) {
      alert(`Payment gateway error: ${razorpayError}`);
      return;
    }

    setIsProcessingPayment(true);
    setError(null);

    try {
      // Create template payment order
      const response = await fetch('/api/templates/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: templateId,
          pdfUrl: generatedWordUrl, // Pass Word URL as pdfUrl parameter
          formData: formData,
          amount: template.price
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment order');
      }

      const data = await response.json();
      
      if (data.success) {
        
        // Initialize Razorpay payment
        const options = {
          key: data.key,
          amount: data.amount * 100, // Razorpay expects amount in paise
          currency: 'INR',
          name: 'Fun Printing',
          description: `Template Payment - ${template.name}`,
          order_id: data.razorpayOrderId,
          handler: async function (response: any) {
            try {
              // Verify payment with all necessary data
              const verifyResponse = await fetch('/api/templates/pay/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  templateId: data.templateId,
                  pdfUrl: data.pdfUrl,
                  formData: formData,
                  templateCommissionPercent: data.templateCommissionPercent,
                  creatorShareAmount: data.creatorShareAmount,
                  platformShareAmount: data.platformShareAmount,
                  templateCreatorUserId: data.templateCreatorUserId,
                  amount: data.amount
                })
              });

              const verifyData = await verifyResponse.json();
              
              if (verifyData.success) {
                setStep('complete');
              } else {
                throw new Error(verifyData.error || 'Payment verification failed');
              }
            } catch (error) {
              console.error('Payment verification error:', error);
              setError('Payment verification failed. Please contact support if payment was deducted.');
            } finally {
              setIsProcessingPayment(false);
            }
          },
          prefill: {
            name: formData.name || '',
            email: formData.email || '',
            contact: formData.phone || formData.contact || '',
          },
          theme: {
            color: '#2563eb'
          },
          modal: {
            ondismiss: function() {
              setIsProcessingPayment(false);
            }
          }
        };

        const razorpay = openRazorpay(options);
        razorpay.open();
      } else {
        throw new Error(data.error || 'Failed to create payment order');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedWordUrl) return;
    
    try {
      // Fetch Word document from URL
      const response = await fetch(generatedWordUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

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
    } catch (error) {
      console.error('❌ Error downloading document:', error);
      setError('Failed to download document. Please try again.');
    }
  };

  const handleContinueToOrder = () => {
    if (!generatedWordUrl || !template) return;
    
    // Store order data in sessionStorage for the order page
    const orderData = {
      templateId: templateId,
      templateName: template.name,
      wordUrl: generatedWordUrl,
      customerData: formData,
      isTemplateDocument: true
    };
    
    sessionStorage.setItem('pendingTemplateDocument', JSON.stringify(orderData));
    
    // Redirect to order page
    router.push('/order');
  };


  const renderFormField = (field: FormField) => {
    // Use placeholder if available, otherwise use defaultPlaceholder, otherwise generate default
    const displayPlaceholder = field.placeholder || (field as any).defaultPlaceholder || `Enter ${field.key || field.label || ''}`;
    
    const commonProps = {
      id: field.key,
      name: field.key,
      value: formData[field.key] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleInputChange(field.key, e.target.value),
      placeholder: displayPlaceholder,
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

  // Show payment step
  if (step === 'payment' && template) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Generated Successfully!</h2>
              <p className="text-gray-600 mb-4">Please complete the payment to access your document.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Template Fee:</span>
                <span className="text-2xl font-bold text-gray-900">₹{template.price}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/templates')}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={!isRazorpayLoaded || isProcessingPayment}
                className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isProcessingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  `Pay ₹${template.price}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show complete step (download/order options)
  if (step === 'complete' && template) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Ready!</h2>
              <p className="text-gray-600 mb-6">Your document has been generated successfully.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {template.allowFreeDownload !== false && (
                <button
                  onClick={handleDownload}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Document
                </button>
              )}
              <button
                onClick={handleContinueToOrder}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                Continue to Order
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => router.push('/templates')}
              className="mt-6 text-gray-600 hover:text-gray-800"
            >
              ← Back to Templates
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show form step (default)
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
            <div className="mt-2 flex items-center flex-wrap gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {template.category}
              </span>
              {template.isPaid && (template.price ?? 0) > 0 ? (
                <span className="bg-orange-100 text-orange-800 text-xs px-3 py-1 rounded font-semibold">
                  ₹{template.price}
                </span>
              ) : (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">
                  Free Template
                </span>
              )}
              {template.isPaid && template.allowFreeDownload === false && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  Download requires payment
                </span>
              )}
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


              <form onSubmit={handleSubmit} className="space-y-6">
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
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      'Generate Document'
                    )}
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