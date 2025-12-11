'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function TemplateCompletePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [wordUrl, setWordUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setTemplateId(resolvedParams.id);
    };
    getParams();

    const pdfUrlParam = searchParams.get('pdfUrl');
    const wordUrlParam = searchParams.get('wordUrl');
    const errorParam = searchParams.get('error');

    if (pdfUrlParam) {
      setPdfUrl(decodeURIComponent(pdfUrlParam));
    }
    if (wordUrlParam) {
      setWordUrl(decodeURIComponent(wordUrlParam));
    }
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [params, searchParams]);

  const handleDownload = async () => {
    const urlToDownload = pdfUrl || wordUrl;
    if (!urlToDownload) return;

    setIsDownloading(true);
    try {
      const response = await fetch(urlToDownload);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = pdfUrl 
        ? `document.pdf`
        : `document.docx`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      console.log('✅ Document downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading document:', error);
      alert('Failed to download document. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleContinueToOrder = () => {
    const urlToUse = pdfUrl || wordUrl;
    if (!urlToUse || !templateId) return;

    // Get form data from sessionStorage if available
    const templateData = sessionStorage.getItem(`template_${templateId}_formData`);
    let customerData = {};
    if (templateData) {
      try {
        customerData = JSON.parse(templateData);
      } catch (e) {
        console.error('Error parsing form data:', e);
      }
    }

    // Store order data in sessionStorage for the order page
    const orderData = {
      templateId: templateId,
      pdfUrl: pdfUrl || undefined,
      wordUrl: wordUrl || undefined,
      customerData: customerData,
      isTemplateDocument: true,
      isPdf: !!pdfUrl, // Flag to indicate PDF is available
    };

    sessionStorage.setItem('pendingTemplateDocument', JSON.stringify(orderData));

    // Redirect to order page
    router.push('/order');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl w-full">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Document Ready!</h2>
          <p className="text-gray-600 mb-8">
            {pdfUrl 
              ? 'Your document has been generated and converted to PDF successfully.'
              : 'Your document has been generated successfully.'}
          </p>

          {/* Error Warning */}
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                ⚠️ {error}. You can still download and use the Word document.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleDownload}
              disabled={isDownloading || (!pdfUrl && !wordUrl)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download {pdfUrl ? 'PDF' : 'Word Document'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleContinueToOrder}
              disabled={!pdfUrl && !wordUrl}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Continue to Order</span>
            </button>
          </div>

          {/* Back Link */}
          <div className="mt-8">
            <Link
              href={`/templates/fill/${templateId}`}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              ← Back to template
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

