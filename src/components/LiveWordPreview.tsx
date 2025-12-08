'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fillDocxTemplate } from '@/lib/docxProcessor';
import { DocumentIcon, WarningIcon, MemoIcon } from '@/components/SocialIcons';

interface LiveWordPreviewProps {
  templateUrl: string;
  formData: Record<string, any>;
  onUpdate?: (data: Record<string, any>) => void;
  className?: string;
}

const LiveWordPreview: React.FC<LiveWordPreviewProps> = ({
  templateUrl,
  formData,
  onUpdate,
  className = ''
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<number>(0);

  // Debounce function to prevent too many API calls
  const debounce = useCallback((func: (...args: any[]) => void, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  // Generate preview function
  const generatePreview = useCallback(async (data: Record<string, any>) => {
    if (!templateUrl || !data || Object.keys(data).length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Generating live preview with data:', data);

      // Fetch template from URL
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }

      const templateBuffer = await response.arrayBuffer();
      console.log('📄 Template fetched, size:', templateBuffer.byteLength, 'bytes');

      // Fill template with current form data
      const filledBuffer = await fillDocxTemplate(Buffer.from(templateBuffer), data);
      console.log('✅ Template filled, size:', filledBuffer.length, 'bytes');

      // Create preview URL
      const blob = new Blob([new Uint8Array(filledBuffer)], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      // Clean up previous URL to prevent memory leaks
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setLastGenerated(Date.now());
      
      console.log('🎉 Live preview generated successfully');
    } catch (err) {
      console.error('❌ Error generating preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  }, [templateUrl, previewUrl]);

  // Debounced version of generatePreview
  const debouncedGeneratePreview = useCallback(
    debounce(generatePreview, 800), // 800ms delay
    [generatePreview]
  );

  // Generate preview when form data changes
  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      debouncedGeneratePreview(formData);
    }
  }, [formData, debouncedGeneratePreview]);

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
      link.download = 'preview-document.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={`live-preview-container ${className}`}>
      {/* Header */}
      <div className="preview-header bg-gray-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DocumentIcon size={24} className="w-6 h-6 mr-2" />
              Live Document Preview
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
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {new Date(lastGenerated).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Preview Content */}
      <div className="preview-content relative">
        {error ? (
          <div className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <WarningIcon size={64} className="w-16 h-16 text-red-500" />
            </div>
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
            <iframe
              src={previewUrl}
              width="100%"
              height="600px"
              title="Word Document Live Preview"
              className="border-0 w-full"
              style={{ minHeight: '600px' }}
            />
          </div>
        ) : (
          <div className="preview-placeholder p-8 text-center">
            <div className="flex justify-center mb-4">
              <MemoIcon size={64} className="w-16 h-16 text-gray-400" />
            </div>
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
          <span>🔄 Auto-refresh every 800ms</span>
        </div>
      </div>
    </div>
  );
};

export default LiveWordPreview;
