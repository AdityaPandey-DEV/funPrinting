'use client';

import { useState, useRef, useEffect } from 'react';

interface MicrosoftWordEditorProps {
  docxBuffer: string; // Base64 encoded DOCX buffer
  onDocumentEdited: (editedBuffer: string) => void;
  onClose: () => void;
}

export default function MicrosoftWordEditor({ docxBuffer, onDocumentEdited, onClose }: MicrosoftWordEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Create a temporary file URL for the DOCX
    const binaryString = atob(docxBuffer);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const fileUrl = URL.createObjectURL(blob);
    setDownloadUrl(fileUrl);
    setIsLoading(false);
    
    // Cleanup function
    return () => {
      URL.revokeObjectURL(fileUrl);
    };
  }, [docxBuffer]);

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'document-to-edit.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(',')[1]; // Remove data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,
        onDocumentEdited(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Edit Document with Microsoft Word
          </h2>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-b p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 text-xl">💡</div>
            <div className="text-sm text-blue-800">
              <strong>How to edit your document:</strong>
              <ol className="mt-2 space-y-1 list-decimal list-inside">
                <li>Download the Word document below</li>
                <li>Open it in Microsoft Word (desktop or online)</li>
                <li>Edit the document and add placeholders like <code className="bg-blue-100 px-1 rounded">@name</code>, <code className="bg-blue-100 px-1 rounded">@date</code>, etc.</li>
                <li>Save the document and upload it back using the button below</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Preparing document...</p>
            </div>
          ) : (
            <>
              {/* Download Section */}
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Download Document</h3>
                <p className="text-gray-600 mb-4">Click below to download the Word document for editing</p>
                <button
                  onClick={handleDownload}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📥 Download Word Document
                </button>
              </div>

              {/* Upload Section */}
              <div className="text-center">
                <div className="text-6xl mb-4">📤</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Upload Edited Document</h3>
                <p className="text-gray-600 mb-4">After editing, upload the modified document here</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  📤 Upload Edited Document
                </button>
              </div>

              {/* Alternative Options */}
              <div className="bg-gray-50 rounded-lg p-4 w-full max-w-md">
                <h4 className="font-semibold text-gray-800 mb-2">Alternative Editing Options:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Microsoft Word Online:</strong> office.com → Word → Upload file</li>
                  <li>• <strong>Google Docs:</strong> docs.google.com → File → Import</li>
                  <li>• <strong>LibreOffice Writer:</strong> Free desktop alternative</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-t p-3">
            <div className="flex items-center space-x-2">
              <div className="text-red-600">❌</div>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
