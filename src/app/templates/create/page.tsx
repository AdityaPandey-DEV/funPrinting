'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface PayoutSettings {
  upiId?: string;
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  };
}

function CreateTemplateContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: 'lab-manual',
    isPublic: false,
    isPaid: false,
    price: 0,
    allowFreeDownload: true,
  });
  const [extractedPlaceholders, setExtractedPlaceholders] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'save'>('upload');
  const [rawFileUrl, setRawFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings | null>(null);
  const [loadingPayout, setLoadingPayout] = useState(true);

  // Fetch user's payout settings
  useEffect(() => {
    const fetchPayoutSettings = async () => {
      try {
        const response = await fetch('/api/user/payout-settings');
        if (response.ok) {
          const data = await response.json();
          setPayoutSettings(data.payoutSettings || null);
        }
      } catch (error) {
        console.error('Error fetching payout settings:', error);
      } finally {
        setLoadingPayout(false);
      }
    };

    if (status === 'authenticated') {
      fetchPayoutSettings();
    } else {
      setLoadingPayout(false);
    }
  }, [status]);

  const hasPayoutInfo = !!(payoutSettings?.upiId || payoutSettings?.bankDetails?.accountNumber);

  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const extractPlaceholdersFromFile = async (fileUrl: string) => {
    try {
      console.log('🔄 Extracting placeholders from file:', fileUrl);
      
      const response = await fetch('/api/extract-placeholders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract placeholders');
      }

      const result = await response.json();
      setExtractedPlaceholders(result.placeholders || []);
      
      // Initialize form data with empty values
      const initialFormData: Record<string, any> = {};
      result.placeholders?.forEach((placeholder: string) => {
        initialFormData[placeholder] = '';
      });
      setFormData(initialFormData);
      
      console.log('✅ Placeholders extracted:', result.placeholders);
      
    } catch (error) {
      console.error('❌ Error extracting placeholders:', error);
      setExtractedPlaceholders([]);
    }
  };

  const handleUnifiedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsUploading(true);
    
    try {
      console.log('🔄 Starting unified upload process...');
      const arrayBuffer = await selectedFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const uploadResponse = await fetch('/api/upload-raw-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileBuffer: buffer.toString('base64'),
          contentType: selectedFile.type
        }),
      });

      if (!uploadResponse.ok) { throw new Error('Failed to upload file to cloud'); }
      const uploadResult = await uploadResponse.json();
      setRawFileUrl(uploadResult.url);
      console.log('✅ File uploaded to cloud:', uploadResult.url);
      
      setIsProcessing(true);
      await extractPlaceholdersFromFile(uploadResult.url);
      setStep('preview');
      console.log('✅ Unified upload process completed successfully');
    } catch (error) {
      console.error('❌ Unified upload failed:', error);
      alert('Failed to upload and process file. Please try again.');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  // Handle form data changes for live preview
  const handleFormDataChange = (placeholder: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  // Handle removing a placeholder from the form
  const handleRemovePlaceholder = (placeholder: string) => {
    setExtractedPlaceholders(prev => prev.filter(p => p !== placeholder));
    setFormData(prev => {
      const newData = { ...prev };
      delete newData[placeholder];
      return newData;
    });
  };

  // Handle adding a new placeholder
  const handleAddPlaceholder = () => {
    const newPlaceholder = prompt('Enter placeholder name (without @ or {}):');
    if (newPlaceholder && !extractedPlaceholders.includes(newPlaceholder)) {
      setExtractedPlaceholders(prev => [...prev, newPlaceholder]);
      setFormData(prev => ({
        ...prev,
        [newPlaceholder]: ''
      }));
    }
  };

  const handleSaveTemplate = async () => {
    if (!rawFileUrl || !templateData.name) return;
    
    // Validate paid template requirements
    if (templateData.isPaid && templateData.price <= 0) {
      alert('Please enter a valid price greater than 0 for a paid template.');
      return;
    }
    
    if (templateData.isPaid && !hasPayoutInfo) {
      alert('Please set up your payout settings before creating a paid template.');
      return;
    }
    
    setIsUploading(true);
    try {
      console.log('🔄 Saving template...');
      const response = await fetch('/api/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: templateData.name,
          description: templateData.description,
          category: templateData.category,
          pdfUrl: rawFileUrl,
          wordContent: {
            paragraphs: [],
            tables: []
          },
          placeholders: extractedPlaceholders,
          isPublic: templateData.isPublic,
          isPaid: templateData.isPaid,
          price: templateData.price,
          allowFreeDownload: templateData.allowFreeDownload,
        }),
      });
      const data = await response.json();
      if (data.success) { 
        setStep('save'); 
        console.log('✅ Template saved successfully'); 
      }
      else { 
        alert('Failed to save template: ' + (data.error || 'Unknown error')); 
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally { 
      setIsUploading(false); 
    }
  };

  const handleDownloadFilled = async () => {
    if (!rawFileUrl || !formData) return;
    
    try {
      console.log('🔄 Downloading filled document...');
      const response = await fetch('/api/templates/download-filled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: rawFileUrl,
          formData,
          placeholders: extractedPlaceholders
        }),
      });

      if (!response.ok) { throw new Error('Failed to generate filled document'); }
      const result = await response.json();
      
      if (result.success) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `${templateData.name || 'template'}_filled.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('✅ Document downloaded successfully');
      } else {
        throw new Error(result.error || 'Failed to generate document');
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert('Failed to download filled document. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Your Template</h1>
          <p className="text-lg text-gray-600">
            Upload a Word document with placeholders to create your own template
          </p>
        </div>

        {step === 'upload' && (
          <div className="bg-white shadow rounded-lg p-8">
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gray-100 mb-4">
                  <svg className="h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Word Document</h3>
                <p className="text-gray-600 mb-6">
                  Choose a .docx file with placeholders like {'{{'}Name{'}}'}, {'{{'}Email{'}}'}, etc.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleUnifiedUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isProcessing}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading || isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isUploading ? 'Uploading...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Choose File
                  </>
                )}
              </button>

              {file && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Selected:</strong> {file.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            {/* Document Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateData.name}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={templateData.category}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="lab-manual">Lab Manual</option>
                    <option value="assignment">Assignment</option>
                    <option value="report">Report</option>
                    <option value="certificate">Certificate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={templateData.description}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter template description"
                />
              </div>

              {/* Monetization Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Monetization Options</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={templateData.isPublic}
                      onChange={(e) => setTemplateData(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Make this template public</span>
                      <p className="text-xs text-gray-500">Others can discover and use this template</p>
                    </div>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer ${!hasPayoutInfo && !loadingPayout ? 'bg-gray-100 opacity-60' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    <input
                      type="checkbox"
                      checked={templateData.isPaid}
                      disabled={!hasPayoutInfo && !loadingPayout}
                      onChange={(e) => setTemplateData(prev => ({
                        ...prev,
                        isPaid: e.target.checked,
                        price: e.target.checked ? Math.max(prev.price, 1) : 0,
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Charge for this template</span>
                      <p className="text-xs text-gray-500">
                        {hasPayoutInfo ? 'Earn money when others use your template' : 'Set up payout settings first'}
                      </p>
                    </div>
                  </label>
                </div>

                {!hasPayoutInfo && !loadingPayout && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      To charge for templates, you need to set up your payout details.{' '}
                      <Link href="/payout-settings" className="font-medium underline hover:text-yellow-900">
                        Set up payout settings →
                      </Link>
                    </p>
                  </div>
                )}

                {templateData.isPaid && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Price (₹) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        step="1"
                        value={templateData.price}
                        onChange={(e) => setTemplateData(prev => ({
                          ...prev,
                          price: Math.max(0, Number(e.target.value) || 0),
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter price in INR"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Users will pay this amount in addition to printing charges.
                      </p>
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={templateData.allowFreeDownload}
                          onChange={(e) => setTemplateData(prev => ({ ...prev, allowFreeDownload: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700">Allow free download</span>
                          <p className="text-xs text-gray-500">
                            Users can download without ordering
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Placeholders Management */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Placeholders</h2>
                <button
                  onClick={handleAddPlaceholder}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Placeholder
                </button>
              </div>
              
              {extractedPlaceholders.length > 0 ? (
                <div className="space-y-3">
                  {extractedPlaceholders.map((placeholder) => (
                    <div key={placeholder} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {placeholder.charAt(0).toUpperCase() + placeholder.slice(1)}
                        </label>
                        <input
                          type="text"
                          value={formData[placeholder] || ''}
                          onChange={(e) => handleFormDataChange(placeholder, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Enter ${placeholder}`}
                        />
                      </div>
                      <button
                        onClick={() => handleRemovePlaceholder(placeholder)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No placeholders found in the document.</p>
                  <p className="text-sm mt-2">Make sure your document contains placeholders like {'{{'}Name{'}}'}, {'{{'}Email{'}}'}, etc.</p>
                </div>
              )}
            </div>

            {/* Download Filled Document */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Download Filled Document</h2>
              <p className="text-gray-600 mb-4">
                Test your template by downloading a document with the form data filled in.
              </p>
              <button
                onClick={handleDownloadFilled}
                disabled={!rawFileUrl || extractedPlaceholders.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download Filled Document
              </button>
            </div>

            {/* Save Template */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Save Template</h2>
              <p className="text-gray-600 mb-4">
                Save this template to your account. You can make it public later if you want to share it with others.
              </p>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateData.name || isUploading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        )}

        {step === 'save' && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="text-green-600 text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Template Saved Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your template has been saved to your account. You can view and manage it from your templates page.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/my-templates"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                View My Templates
              </Link>
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setExtractedPlaceholders([]);
                  setTemplateData({ name: '', description: '', category: 'lab-manual', isPublic: false, isPaid: false, price: 0, allowFreeDownload: true });
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Another Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateTemplatePage() {
  return <CreateTemplateContent />;
}

