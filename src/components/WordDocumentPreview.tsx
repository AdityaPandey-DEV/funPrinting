'use client';

import React, { useState, useEffect } from 'react';
import PlaceholderForm from './PlaceholderForm';

interface WordDocumentPreviewProps {
  docxBuffer: string;
  onDocumentEdited: (newDocxBuffer: string) => void;
  onClose: () => void;
}

export default function WordDocumentPreview({ docxBuffer, onDocumentEdited, onClose }: WordDocumentPreviewProps) {
  const [previewText, setPreviewText] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlaceholderForm, setShowPlaceholderForm] = useState(false);
  const [pageRange, setPageRange] = useState<{ start: number; end: number }>({ start: 1, end: 1 });
  const [processingMode, setProcessingMode] = useState<'full' | 'range'>('full');

  // Extract text and page info from Word document
  useEffect(() => {
    const extractDocumentInfo = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/extract-word-info', {
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
          setPreviewText(data.previewText || '');
          setTotalPages(data.totalPages || 1);
          setPageRange({ start: 1, end: data.totalPages || 1 });
        } else {
          // Fallback: extract basic text
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
            setPreviewText(fallbackData.text || 'Document preview not available');
            setTotalPages(1);
            setPageRange({ start: 1, end: 1 });
          }
        }
      } catch (error) {
        console.error('Error extracting document info:', error);
        setPreviewText('Error loading document preview');
        setTotalPages(1);
        setPageRange({ start: 1, end: 1 });
      } finally {
        setIsLoading(false);
      }
    };

    if (docxBuffer) {
      extractDocumentInfo();
    }
  }, [docxBuffer]);

  const handleProcessDocument = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/extract-placeholders-range', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docxBuffer: docxBuffer,
          pageRange: processingMode === 'full' ? null : pageRange,
          processingMode: processingMode
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.placeholders && data.placeholders.length > 0) {
          setShowPlaceholderForm(true);
        } else {
          alert('No placeholders found in the selected pages. Try selecting different pages or use full document.');
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
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            📄 Word Document Preview
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handleDownloadOriginal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              📥 Download Original
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Processing Mode:</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setProcessingMode('full')}
                  className={`px-3 py-1 rounded text-sm ${
                    processingMode === 'full' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Full Document
                </button>
                <button
                  onClick={() => setProcessingMode('range')}
                  className={`px-3 py-1 rounded text-sm ${
                    processingMode === 'range' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Page Range
                </button>
              </div>
            </div>

            {processingMode === 'range' && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Pages:</label>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageRange.start}
                  onChange={(e) => setPageRange(prev => ({ ...prev, start: parseInt(e.target.value) || 1 }))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageRange.end}
                  onChange={(e) => setPageRange(prev => ({ ...prev, end: parseInt(e.target.value) || 1 }))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-sm text-gray-500">of {totalPages}</span>
              </div>
            )}

            <button
              onClick={handleProcessDocument}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
          </div>

          <div className="text-sm text-gray-600">
            <p>
              <strong>Instructions:</strong> Choose whether to process the full document or specific pages. 
              The system will search for placeholders like {'{{'}name{'}}'}, {'{{'}phone{'}}'}, {'{{'}email{'}}'}, etc. in the selected content.
            </p>
          </div>
        </div>

        {/* Document Preview */}
        <div className="flex-1 p-4 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading document preview...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6 h-full overflow-auto">
              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Document Preview</h3>
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {previewText || 'No preview available'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">Total Pages:</span> {totalPages} | 
              <span className="font-medium ml-2">Processing:</span> {
                processingMode === 'full' 
                  ? 'Full Document' 
                  : `Pages ${pageRange.start}-${pageRange.end}`
              }
            </div>
            <div>
              Generated by Word Document Processing System
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Form Modal */}
      {showPlaceholderForm && (
        <PlaceholderForm
          docxBuffer={docxBuffer}
          onGenerateDocument={(formData) => {
            // Handle document generation
            console.log('Generating document with form data:', formData);
          }}
          onDocumentEdited={onDocumentEdited}
          onClose={() => setShowPlaceholderForm(false)}
        />
      )}
    </div>
  );
}
