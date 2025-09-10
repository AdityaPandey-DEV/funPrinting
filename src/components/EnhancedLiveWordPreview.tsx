'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface EnhancedLiveWordPreviewProps {
  templateId: string;
  formData: Record<string, any>;
  onUpdate?: (data: Record<string, any>) => void;
  className?: string;
  previewType?: 'docx' | 'pdf';
}

const EnhancedLiveWordPreview: React.FC<EnhancedLiveWordPreviewProps> = ({
  templateId,
  formData,
  onUpdate,
  className = '',
  previewType = 'docx'
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<number>(0);
  const [previewInfo, setPreviewInfo] = useState<any>(null);

  // Debounce form data to prevent too many API calls
  const debouncedFormData = useDebounce(formData, 1000); // 1 second delay

  // Generate preview using backend API
  const generatePreview = useCallback(async (data: Record<string, any>) => {
    if (!templateId || !data || Object.keys(data).length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Generating enhanced preview with data:', data);

      const response = await fetch('/api/templates/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          formData: data,
          previewType
        }),
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
        setPreviewInfo(result);
        setLastGenerated(Date.now());
        
        console.log('🎉 Enhanced preview generated successfully:', result.previewUrl);
      } else {
        throw new Error(result.error || 'Failed to generate preview');
      }
    } catch (err) {
      console.error('❌ Error generating enhanced preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  }, [templateId, previewType, previewUrl]);

  // Generate preview when debounced form data changes
  useEffect(() => {
    if (debouncedFormData && Object.keys(debouncedFormData).length > 0) {
      generatePreview(debouncedFormData);
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
      link.download = previewInfo?.fileName || `preview-document.${previewType}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Switch preview type
  const handleSwitchType = () => {
    const newType = previewType === 'docx' ? 'pdf' : 'docx';
    if (formData && Object.keys(formData).length > 0) {
      generatePreview(formData);
    }
  };

  return (
    <div className={`enhanced-live-preview-container ${className}`}>
      {/* Header */}
      <div className="preview-header bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">📄</span>
              Live Document Preview
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {previewType.toUpperCase()}
              </span>
            </h3>
            {isLoading && (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm">Generating...</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSwitchType}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🔄 Switch to {previewType === 'docx' ? 'PDF' : 'DOCX'}
            </button>
            
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
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Last updated: {new Date(lastGenerated).toLocaleTimeString()}
            </p>
            {previewInfo && (
              <p className="text-xs text-gray-500">
                Template: {previewInfo.template?.name || 'Unknown'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Preview Content */}
      <div className="preview-content relative">
        {error ? (
          <div className="p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h4 className="text-lg font-semibold text-red-800 mb-2">Preview Error</h4>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="space-x-2">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleSwitchType}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Switch Format
              </button>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="preview-iframe-container">
            {previewType === 'pdf' ? (
              <iframe
                src={`${previewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                width="100%"
                height="600px"
                title="PDF Live Preview"
                className="border-0 w-full"
                style={{ minHeight: '600px' }}
              />
            ) : (
              <iframe
                src={previewUrl}
                width="100%"
                height="600px"
                title="Word Document Live Preview"
                className="border-0 w-full"
                style={{ minHeight: '600px' }}
              />
            )}
          </div>
        ) : (
          <div className="preview-placeholder p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h4 className="text-lg font-semibold text-gray-600 mb-2">No Preview Available</h4>
            <p className="text-gray-500">
              {!formData || Object.keys(formData).length === 0
                ? 'Fill out the form to see live preview'
                : 'Generating preview...'}
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="preview-footer bg-gray-50 p-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>💡 Changes are updated automatically as you type</span>
          <span>🔄 Auto-refresh every 1 second</span>
          <span>📄 Format: {previewType.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLiveWordPreview;
