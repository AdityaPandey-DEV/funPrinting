'use client';

import React, { useState, useEffect } from 'react';

interface MicrosoftWordEditorProps {
  docxBuffer: string; // Base64 encoded DOCX buffer
  onDocumentEdited: (newDocxBuffer: string) => void;
  onClose: () => void;
}

export default function MicrosoftWordEditor({ docxBuffer, onDocumentEdited, onClose }: MicrosoftWordEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [documentUrl, setDocumentUrl] = useState<string>('');

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
        const placeholderRegex = /@([A-Za-z0-9_]+)/g;
        const placeholders = [...new Set(
          (textContent.match(placeholderRegex) || [])
            .map(match => match.substring(1))
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
            ✏️ Edit with Microsoft Word Online
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
            <p className="font-medium mb-2">📝 Document Editing Instructions:</p>
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
                  <div className="text-6xl mb-6">📝</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Document Editor</h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Microsoft Word Online integration is temporarily unavailable. 
                    Please use the download option below to edit your document locally.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">📥 Download & Edit</h4>
                      <p className="text-sm text-gray-600 mb-3">Download the document and edit it locally</p>
                      <button
                        onClick={handleDownload}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Download DOCX
                      </button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">🌐 Microsoft Word Online</h4>
                      <p className="text-sm text-gray-600 mb-3">Try Microsoft Word Online (may require login)</p>
                      <a
                        href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm text-center"
                      >
                        Open in Word Online
                      </a>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">🌐 Google Docs</h4>
                      <p className="text-sm text-gray-600 mb-3">Upload to Google Docs for editing</p>
                      <a
                        href="https://docs.google.com/document"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm text-center"
                      >
                        Open Google Docs
                      </a>
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
    </div>
  );
}