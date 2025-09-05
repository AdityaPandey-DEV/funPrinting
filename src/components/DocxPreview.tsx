'use client';

import React, { useEffect, useRef, useState } from 'react';

interface DocxPreviewProps {
  docxBuffer: string; // Base64 encoded DOCX buffer
  onClose: () => void;
}

export default function DocxPreview({ docxBuffer, onClose }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDocx = async () => {
      if (!containerRef.current || !docxBuffer) return;

      try {
        setIsLoading(true);
        setError(null);

        // Clear previous content
        containerRef.current.innerHTML = '';

        // First, try to get document content from our API
        try {
          const response = await fetch('/api/parse-docx-structure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docxBuffer }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Show text preview with document info
            if (containerRef.current) {
              containerRef.current.innerHTML = `
                <div class="p-6 bg-white">
                  <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-800 mb-2">📄 Document Preview</h3>
                    <div class="grid grid-cols-2 gap-4 text-sm text-blue-700">
                      <div>
                        <span class="font-medium">Pages:</span> ${data.totalPages || 'Unknown'}
                      </div>
                      <div>
                        <span class="font-medium">Words:</span> ${data.wordCount || 0}
                      </div>
                      <div>
                        <span class="font-medium">Characters:</span> ${data.charCount || 0}
                      </div>
                      <div>
                        <span class="font-medium">Placeholders:</span> ${data.placeholders?.length || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div class="mb-4">
                    <h4 class="font-semibold text-gray-800 mb-2">Document Content:</h4>
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre class="whitespace-pre-wrap text-sm text-gray-700 font-mono">${data.text || 'No content available'}</pre>
                    </div>
                  </div>
                  
                  ${data.placeholders && data.placeholders.length > 0 ? `
                    <div class="mb-4">
                      <h4 class="font-semibold text-gray-800 mb-2">Found Placeholders:</h4>
                      <div class="flex flex-wrap gap-2">
                        ${data.placeholders.map((p: string) => `<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">@${p}</span>`).join('')}
                      </div>
                    </div>
                  ` : ''}
                  
                  <div class="text-center">
                    <button onclick="window.close()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Close Preview
                    </button>
                  </div>
                </div>
              `;
            }
            setIsLoading(false);
            return;
          }
        } catch (apiError) {
          console.log('API fallback failed, trying direct rendering:', apiError);
        }

        // Fallback: Try direct docx-preview rendering
        const binaryString = atob(docxBuffer);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;

        try {
          const { renderAsync } = await import('docx-preview');
          await renderAsync(arrayBuffer, containerRef.current, undefined, {
            className: 'docx-wrapper',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: true,
            experimental: true,
            trimXmlDeclaration: true,
            useBase64URL: false,
            renderChanges: false,
            renderComments: false,
            renderFootnotes: true,
            renderEndnotes: true,
            renderHeaders: true,
            renderFooters: true,
            debug: false,
          });
        } catch (renderError) {
          console.error('DOCX preview render error:', renderError);
          // Final fallback
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div class="p-6 bg-white">
                <div class="text-center">
                  <div class="text-6xl mb-4">📄</div>
                  <h3 class="text-xl font-semibold text-gray-800 mb-2">Document Preview</h3>
                  <p class="text-gray-600 mb-4">Unable to render the document preview. This might be due to the document format or size.</p>
                  <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <h4 class="font-medium text-gray-800 mb-2">Document Information:</h4>
                    <p class="text-sm text-gray-600">File size: ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB</p>
                    <p class="text-sm text-gray-600">Format: Microsoft Word Document (.docx)</p>
                  </div>
                  <button onclick="window.close()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Close Preview
                  </button>
                </div>
              </div>
            `;
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error rendering DOCX:', err);
        setError('Failed to render document preview');
        setIsLoading(false);
      }
    };

    renderDocx();
  }, [docxBuffer]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            📄 Document Preview
          </h2>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading document preview...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <div className="h-full overflow-auto p-4">
              <div 
                ref={containerRef}
                className="docx-preview-container"
                style={{
                  minHeight: '100%',
                  backgroundColor: 'white',
                  padding: '20px',
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: '1.6',
                  color: '#333'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
