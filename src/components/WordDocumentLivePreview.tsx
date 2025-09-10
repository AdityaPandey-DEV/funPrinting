'use client';

import React, { useState, useEffect } from 'react';
import PlaceholderForm from './PlaceholderForm';

interface WordDocumentLivePreviewProps {
  docxBuffer: string;
  onDocumentEdited: (newDocxBuffer: string) => void;
  onClose: () => void;
}

export default function WordDocumentLivePreview({ docxBuffer, onDocumentEdited, onClose }: WordDocumentLivePreviewProps) {
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPlaceholderForm, setShowPlaceholderForm] = useState(false);
  const [previewMode, setPreviewMode] = useState<'html' | 'office' | 'google'>('html');
  const [documentUrl, setDocumentUrl] = useState<string>('');

  // Convert DOCX to HTML for preview
  useEffect(() => {
    const convertToHtml = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/convert-docx-to-html', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            docxBuffer: docxBuffer
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setPreviewContent(data.html || '');
        } else {
          // Fallback: extract raw text
          const fallbackResponse = await fetch('/api/extract-placeholders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              docxBuffer: docxBuffer
            }),
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            setPreviewContent(`<div class="prose max-w-none"><p>${fallbackData.text || 'Document preview not available'}</p></div>`);
          }
        }
      } catch (error) {
        console.error('Error converting document:', error);
        setPreviewContent('<div class="prose max-w-none"><p>Error loading document preview</p></div>');
      } finally {
        setIsLoading(false);
      }
    };

    if (docxBuffer) {
      convertToHtml();
    }
  }, [docxBuffer]);

  // Create document URL for Office Online
  useEffect(() => {
    if (!docxBuffer) return;

    const baseUrl = `${window.location.origin}/api/document-proxy`;
    const params = new URLSearchParams({
      data: docxBuffer,
      id: 'preview-document'
    });
    
    setDocumentUrl(`${baseUrl}?${params.toString()}`);
  }, [docxBuffer]);

  const handleProcessDocument = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/extract-placeholders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docxBuffer: docxBuffer
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.placeholders && data.placeholders.length > 0) {
          setShowPlaceholderForm(true);
        } else {
          alert('No placeholders found in the document. Add placeholders like @name, @phone, etc.');
        }
      } else {
        alert('Error processing document. Please try again.');
      }
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Error processing document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadOriginal = () => {
    if (!docxBuffer) return;

    const byteCharacters = atob(docxBuffer);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Microsoft Word - Document1</div>
          <div className="w-8"></div>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <button 
                onClick={() => setPreviewMode('html')}
                className={`px-3 py-1 rounded ${
                  previewMode === 'html' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                HTML Preview
              </button>
              <button 
                onClick={() => setPreviewMode('office')}
                className={`px-3 py-1 rounded ${
                  previewMode === 'office' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Office Online
              </button>
              <button 
                onClick={() => setPreviewMode('google')}
                className={`px-3 py-1 rounded ${
                  previewMode === 'google' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Google Docs
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleProcessDocument}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Find Placeholders</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadOriginal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                📥 Download Word
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>

        {/* Document Preview Area */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading document preview...</p>
              </div>
            </div>
          ) : (
            <div className="h-full">
              {previewMode === 'html' && (
                <div className="p-8 bg-gray-100 h-full overflow-auto">
                  <div className="max-w-4xl mx-auto bg-white shadow-2xl min-h-full" style={{ padding: '2.5cm' }}>
                    <div className="mb-8">
                      <div className="text-center border-b border-gray-300 pb-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Preview</h1>
                        <p className="text-gray-600">Live Word Document Preview</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div 
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: previewContent }}
                      />
                    </div>
                    <div className="mt-12 pt-4 border-t border-gray-300">
                      <div className="text-center text-sm text-gray-500">
                        <p>Generated by Word Document Processing System</p>
                        <p>Live HTML Preview | Formatting Preserved</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {previewMode === 'office' && documentUrl && (
                <div className="h-full">
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`}
                    className="w-full h-full border-0"
                    title="Office Online Preview"
                    onError={() => {
                      console.log('Office Online failed, falling back to HTML preview');
                      setPreviewMode('html');
                    }}
                  />
                </div>
              )}

              {previewMode === 'google' && documentUrl && (
                <div className="h-full">
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(documentUrl)}&embedded=true`}
                    className="w-full h-full border-0"
                    title="Google Docs Preview"
                    onError={() => {
                      console.log('Google Docs failed, falling back to HTML preview');
                      setPreviewMode('html');
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Placeholder Form Modal */}
      {showPlaceholderForm && (
        <PlaceholderForm
          docxBuffer={docxBuffer}
          onGenerateDocument={(formData) => {
            console.log('Document generated with data:', formData);
            setShowPlaceholderForm(false);
          }}
          onClose={() => setShowPlaceholderForm(false)}
        />
      )}
    </div>
  );
}
