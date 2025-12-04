'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface UploadLivePreviewProps {
  docxBuffer: string | null;
  placeholders: string[];
  formData: Record<string, any>;
  onUpdate?: (data: Record<string, any>) => void;
  className?: string;
}

const UploadLivePreview: React.FC<UploadLivePreviewProps> = ({
  docxBuffer,
  placeholders,
  formData,
  onUpdate,
  className = ''
}) => {
  // Debug props on component mount and when they change
  console.log('🎯 UploadLivePreview received props:');
  console.log('  - docxBuffer:', docxBuffer ? `${docxBuffer.length} chars` : 'null');
  console.log('  - docxBuffer first 50 chars:', docxBuffer?.substring(0, 50) || 'null');
  console.log('  - placeholders:', placeholders);
  console.log('  - formData:', formData);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<number>(0);

  // Debounce form data to prevent too many API calls
  const debouncedFormData = useDebounce(formData, 1000); // 1 second delay

  // Generate preview using the document buffer
  const generatePreview = useCallback(async (data: Record<string, any>) => {
    console.log('🔄 generatePreview called with:');
    console.log('  - docxBuffer:', docxBuffer ? `${docxBuffer.length} chars` : 'null');
    console.log('  - data:', data);
    console.log('  - Object.keys(data).length:', Object.keys(data).length);
    
    if (!docxBuffer || !data || Object.keys(data).length === 0) {
      console.log('🔄 Skipping generatePreview - missing requirements');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Generating upload preview with data:', data);
      console.log('🔄 Placeholders available:', placeholders);
      console.log('🔄 Data keys:', Object.keys(data));
      console.log('🔄 Data values:', Object.values(data));
      console.log('🔄 Data entries:', Object.entries(data));
      console.log('🔄 DocxBuffer length:', docxBuffer?.length, 'characters');
      console.log('🔄 DocxBuffer first 100 chars:', docxBuffer?.substring(0, 100));

      const requestBody = {
        docxBuffer,
        formData: data,
        placeholders
      };
      
      console.log('🔄 Sending to API:');
      console.log('  - docxBuffer length:', docxBuffer?.length);
      console.log('  - docxBuffer first 50 chars:', docxBuffer?.substring(0, 50));
      console.log('  - formData:', data);
      console.log('  - placeholders:', placeholders);
      
      const response = await fetch('/api/templates/preview-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Clean up previous URL to prevent memory leaks
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        setPreviewUrl(result.previewUrl);
        setLastGenerated(Date.now());
        
        console.log('🎉 Upload preview generated successfully:', result.previewUrl);
      } else {
        throw new Error(result.error || 'Failed to generate preview');
      }
    } catch (err) {
      console.error('❌ Error generating upload preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  }, [docxBuffer, placeholders]);

  // Generate preview when debounced form data changes
  useEffect(() => {
    console.log('🔄 UploadLivePreview: debouncedFormData changed:', debouncedFormData);
    console.log('🔄 UploadLivePreview: Object.keys(debouncedFormData):', Object.keys(debouncedFormData));
    console.log('🔄 UploadLivePreview: Object.keys(debouncedFormData).length:', Object.keys(debouncedFormData).length);
    
    if (debouncedFormData && Object.keys(debouncedFormData).length > 0) {
      console.log('🔄 UploadLivePreview: Calling generatePreview with:', debouncedFormData);
      generatePreview(debouncedFormData);
    } else {
      console.log('🔄 UploadLivePreview: Skipping generatePreview - no data or empty data');
    }
  }, [debouncedFormData, generatePreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Manual refresh function
  const handleRefresh = () => {
    if (formData && Object.keys(formData).length > 0) {
      generatePreview(formData);
    }
  };

  // Download function
  const handleDownload = () => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `preview-document.docx`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={`upload-live-preview-container ${className}`}>
      {/* Header */}
      <div className="preview-header bg-blue-50 p-4 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">📄</span>
              Live Preview
              {isLoading && (
                <div className="flex items-center text-blue-600 ml-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm">Generating...</span>
                </div>
              )}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading || !formData || Object.keys(formData).length === 0}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🔄 Refresh
            </button>
            
            {previewUrl && (
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                💾 Download
              </button>
            )}
          </div>
        </div>
        
        {lastGenerated > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Last updated: {new Date(lastGenerated).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Preview Content */}
      <div className="preview-content relative">
        {error ? (
          <div className="p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h4 className="text-lg font-semibold text-red-800 mb-2">Preview Error</h4>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : previewUrl ? (
          <div className="preview-iframe-container">
            {previewUrl.startsWith('data:') ? (
              <div className="p-8 text-center">
                <div className="text-green-500 text-6xl mb-4">✅</div>
                <h4 className="text-lg font-semibold text-green-800 mb-2">Preview Generated Successfully!</h4>
                <p className="text-green-600 mb-4">Your document has been processed with the placeholder values.</p>
                <div className="space-x-4">
                  <a
                    href={previewUrl}
                    download="preview-document.docx"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    📥 Download Preview
                  </a>
                  <button
                    onClick={() => window.open(previewUrl, '_blank')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    👁️ Open in New Tab
                  </button>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Note:</strong> DOCX files cannot be displayed directly in the browser. 
                    Click &quot;Download Preview&quot; to see your document with filled placeholders.
                  </p>
                </div>
              </div>
            ) : (
              <iframe
                src={previewUrl}
                width="100%"
                height="500px"
                title="Document Live Preview"
                className="border-0 w-full"
                style={{ minHeight: '500px' }}
              />
            )}
          </div>
        ) : (
          <div className="preview-placeholder p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h4 className="text-lg font-semibold text-gray-600 mb-2">No Preview Available</h4>
            <p className="text-gray-500">
              {!formData || Object.keys(formData).length === 0
                ? 'Fill out the form below to see live preview'
                : 'Generating preview...'}
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="preview-footer bg-gray-50 p-3 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>💡 Changes are updated automatically as you type</span>
          <span>🔄 Auto-refresh every 1 second</span>
          <span>📄 Format: DOCX</span>
        </div>
      </div>
    </div>
  );
};

export default UploadLivePreview;
