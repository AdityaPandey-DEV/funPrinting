'use client';

import React, { useState, useEffect } from 'react';
import PlaceholderForm from './PlaceholderForm';
import WordDocumentPreview from './WordDocumentPreview';
import WordDocumentLivePreview from './WordDocumentLivePreview';
import { EditIcon, MemoIcon, DocumentIcon } from '@/components/SocialIcons';

interface MicrosoftWordEditorProps {
  docxBuffer: string; // Base64 encoded DOCX buffer
  onDocumentEdited: (newDocxBuffer: string) => void;
  onClose: () => void;
}

export default function MicrosoftWordEditor({ docxBuffer, onDocumentEdited, onClose }: MicrosoftWordEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [showGoogleDocs, setShowGoogleDocs] = useState(false);
  const [showPlaceholderForm, setShowPlaceholderForm] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Create a document URL for Microsoft Word Online
  useEffect(() => {
    if (!docxBuffer) return;

    try {
      // Create a unique document ID
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a public URL with the document data
      const documentUrl = `${window.location.origin}/api/document-proxy?id=${docId}&data=${encodeURIComponent(docxBuffer)}`;
      
      setDocumentUrl(documentUrl);
      setIsLoading(false);
    } catch (error) {
      console.error('Error creating document URL:', error);
      setIsLoading(false);
    }
  }, [docxBuffer]);

  // Clean up the URL when component unmounts
  useEffect(() => {
    return () => {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [documentUrl]);

  const handleDownload = () => {
    if (!docxBuffer) return;

    const byteCharacters = atob(docxBuffer);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(',')[1]; // Remove data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,
        
        // Extract placeholders from the uploaded document
        const textContent = file.name; // For now, we'll use the filename as a simple example
        const placeholderRegex = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;
        const placeholders = [...new Set(
          (textContent.match(placeholderRegex) || [])
            .map(match => {
              const matchResult = match.match(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/);
              return matchResult ? matchResult[1] : '';
            })
            .filter(placeholder => placeholder.length > 0)
        )];
        
        console.log('📝 Placeholders found in uploaded document:', placeholders);
        
        onDocumentEdited(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Microsoft Word Online embed URL - Direct document opening
  const wordOnlineUrl = documentUrl ? 
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}` : 
    'https://office.com/launch/word';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            <span className="flex items-center gap-2">
              <EditIcon size={18} className="w-4.5 h-4.5" />
              Edit with Microsoft Word Online
            </span>
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <span>💾</span>
              <span>Download Word Document</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border-b">
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2 flex items-center gap-2">
              <MemoIcon size={18} className="w-4.5 h-4.5" />
              Document Editing Instructions:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Download your document using the button below</li>
              <li>Edit it with Microsoft Word, Google Docs, or any compatible editor</li>
              <li>Add placeholders like <code className="bg-blue-100 px-1 rounded">@name</code>, <code className="bg-blue-100 px-1 rounded">@date</code>, <code className="bg-blue-100 px-1 rounded">@courseName</code>, etc.</li>
              <li>Save your changes and upload the modified file back to our system</li>
              <li>Use the upload option below to replace the original document</li>
            </ul>
          </div>
        </div>

        {/* Document Editor Interface */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Preparing document editor...</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Main Editor Area */}
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-6 flex items-center justify-center">
                <div className="text-center max-w-2xl">
                  <div className="flex justify-center mb-6">
                    <MemoIcon size={64} className="w-16 h-16" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Document Personalization</h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Upload a Word document with placeholders (like @name, @phone, @email) and we&apos;ll create a personalized form for you to fill out.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <DocumentIcon size={18} className="w-4.5 h-4.5" />
                        Live Preview
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">Real-time Word document preview</p>
                      <button
                        onClick={() => setShowLivePreview(true)}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                      >
                        Live Preview
                      </button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <DocumentIcon size={18} className="w-4.5 h-4.5" />
                        Page Range
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">Preview and choose pages to process</p>
                      <button
                        onClick={() => setShowDocumentPreview(true)}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                      >
                        Page Range
                      </button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">🎯 Quick Fill</h4>
                      <p className="text-sm text-gray-600 mb-3">Process full document for placeholders</p>
                      <button
                        onClick={() => setShowPlaceholderForm(true)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        Fill Placeholders
                      </button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">📥 Download Original</h4>
                      <p className="text-sm text-gray-600 mb-3">Download the original document</p>
                      <button
                        onClick={handleDownload}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Download DOCX
                      </button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">🌐 Google Docs Viewer</h4>
                      <p className="text-sm text-gray-600 mb-3">View document in Google Docs viewer</p>
                      <button
                        onClick={() => setShowGoogleDocs(!showGoogleDocs)}
                        className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        {showGoogleDocs ? 'Hide Viewer' : 'Show Read-Only Viewer'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">💡 How to use placeholders:</h4>
                    <div className="text-sm text-blue-700 text-left">
                      <p className="mb-2">Add these placeholders in your document:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><code className="bg-blue-100 px-1 rounded">@name</code> - Student name</li>
                        <li><code className="bg-blue-100 px-1 rounded">@courseName</code> - Course name</li>
                        <li><code className="bg-blue-100 px-1 rounded">@date</code> - Current date</li>
                        <li><code className="bg-blue-100 px-1 rounded">@university</code> - University name</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Google Docs Viewer */}
        {showGoogleDocs && documentUrl && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <DocumentIcon size={20} className="w-5 h-5" />
                Google Docs Viewer
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(`https://docs.google.com/gview?url=${encodeURIComponent(documentUrl)}&embedded=true`, '_blank')}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Open in New Tab
                </button>
                <button
                  onClick={() => setShowGoogleDocs(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(documentUrl)}&embedded=true`}
                className="w-full h-96 border-0"
                title="Google Docs Viewer"
                allow="clipboard-read; clipboard-write"
                onError={() => {
                  console.log('Google Docs viewer failed to load');
                }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p>💡 <strong>Note:</strong> This is a read-only view. To edit, download the document and use your preferred editor.</p>
              <p className="mt-1">🔄 <strong>Alternative:</strong> If the viewer doesn&apos;t load, try opening in a new tab or use the download option above.</p>
            </div>
          </div>
        )}

        {/* Footer with upload option */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>After editing, upload your modified document:</p>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept=".docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
                id="upload-edited-doc"
              />
              <label
                htmlFor="upload-edited-doc"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center space-x-2"
              >
                <span>📤</span>
                <span>Upload Edited Document</span>
              </label>
            </div>
          </div>
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

      {/* Word Document Preview Modal */}
      {showDocumentPreview && (
        <WordDocumentPreview
          docxBuffer={docxBuffer}
          onDocumentEdited={onDocumentEdited}
          onClose={() => setShowDocumentPreview(false)}
        />
      )}

      {/* Word Document Live Preview Modal */}
      {showLivePreview && (
        <WordDocumentLivePreview
          docxBuffer={docxBuffer}
          onDocumentEdited={onDocumentEdited}
          onClose={() => setShowLivePreview(false)}
        />
      )}
    </div>
  );
}