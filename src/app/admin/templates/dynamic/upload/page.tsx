'use client';

import { useState, useRef } from 'react';
import DocxPreview from '@/components/DocxPreview';
import DocxEditor from '@/components/DocxEditor';
import AdminRouteProtection from '@/components/admin/AdminRouteProtection';

function DynamicTemplateUploadContent() {
  const [file, setFile] = useState<File | null>(null);
  const [docxBuffer, setDocxBuffer] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: 'lab-manual',
  });
  const [extractedPlaceholders, setExtractedPlaceholders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'save'>('upload');
  const [pageRange, setPageRange] = useState<{ start: number; end: number }>({ start: 1, end: 1 });
  const [totalPages, setTotalPages] = useState<number>(1);
  const [usePageRange, setUsePageRange] = useState<boolean>(false);
  const [showDocxPreview, setShowDocxPreview] = useState<boolean>(false);
  const [showDocxEditor, setShowDocxEditor] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    
    try {
      // Convert file to base64 safely
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to avoid call stack overflow
      let binaryString = '';
      const chunkSize = 8192; // Process in 8KB chunks
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64 = btoa(binaryString);
      setDocxBuffer(base64);
      
      // Parse DOCX structure for accurate page count and placeholders
      const structureResponse = await fetch('/api/parse-docx-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docxBuffer: base64 }),
      });
      
      if (structureResponse.ok) {
        const structureData = await structureResponse.json();
        setTotalPages(structureData.totalPages || 1);
        setPageRange({ start: 1, end: structureData.totalPages || 1 });
        setExtractedPlaceholders(structureData.placeholders || []);
        
        console.log('📄 Document structure parsed:', {
          totalPages: structureData.totalPages,
          placeholders: structureData.placeholders,
          wordCount: structureData.wordCount,
          paragraphCount: structureData.paragraphCount
        });
      } else {
        console.error('Failed to parse DOCX structure:', structureResponse.statusText);
        // Fallback to old method
        const [infoResponse, placeholdersResponse] = await Promise.all([
          fetch('/api/extract-word-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docxBuffer: base64 }),
          }),
          fetch('/api/extract-placeholders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docxBuffer: base64 }),
          })
        ]);
        
        if (infoResponse.ok) {
          const infoData = await infoResponse.json();
          setTotalPages(infoData.totalPages || 1);
          setPageRange({ start: 1, end: infoData.totalPages || 1 });
        }
        
        if (placeholdersResponse.ok) {
          const data = await placeholdersResponse.json();
          setExtractedPlaceholders(data.placeholders || []);
        } else {
          setExtractedPlaceholders([]);
        }
      }
      
      setStep('preview');
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
      setExtractedPlaceholders([]);
    } finally {
      setIsProcessing(false);
    }
  };


  const handleExtractPlaceholdersFromRange = async () => {
    if (!docxBuffer) return;

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/extract-placeholders-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docxBuffer: docxBuffer,
          pageRange: usePageRange ? pageRange : null,
          processingMode: usePageRange ? 'range' : 'full'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedPlaceholders(data.placeholders || []);
      } else {
        console.error('Failed to extract placeholders from range:', response.statusText);
        setExtractedPlaceholders([]);
      }
    } catch (error) {
      console.error('Error extracting placeholders from range:', error);
      alert('Error extracting placeholders. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadOriginal = () => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveTemplate = async () => {
    if (!file || !templateData.name) return;

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateData', JSON.stringify({
      ...templateData,
      placeholders: extractedPlaceholders,
    }));

    try {
      const response = await fetch('/api/admin/templates/dynamic/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setStep('save');
      } else {
        alert('Failed to save template: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Create Dynamic Template
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload a Word document with placeholders and create a dynamic template for personalized document generation
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-2">
            <div className={`flex items-center ${step === 'upload' ? 'text-blue-600' : step === 'preview' || step === 'save' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-600 text-white' : step === 'preview' || step === 'save' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                {step === 'preview' || step === 'save' ? '✓' : '1'}
              </div>
              <span className="ml-3 font-medium">Upload</span>
            </div>
            <div className={`w-12 h-1 ${step === 'preview' || step === 'save' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${step === 'preview' ? 'text-blue-600' : step === 'save' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'preview' ? 'bg-blue-600 text-white' : step === 'save' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                {step === 'save' ? '✓' : '2'}
          </div>
              <span className="ml-3 font-medium">Preview</span>
            </div>
            <div className={`w-12 h-1 ${step === 'save' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${step === 'save' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'save' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                {step === 'save' ? '✓' : '3'}
          </div>
              <span className="ml-3 font-medium">Save</span>
            </div>
          </div>
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Word Document</h2>
                <p className="text-gray-600 mb-8">
                  Upload a Word document (.docx or .doc) with placeholders like @name, @date, @courseName, etc.
                </p>
      </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc"
              onChange={handleFileUpload}
              className="hidden"
            />
              
              <div 
              onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Processing your document...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">DOCX, DOC files only</p>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pro Tips
                </h3>
                <ul className="text-sm text-gray-700 space-y-2 text-left">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Use placeholders like <code className="bg-blue-100 px-1 rounded">@name</code>, <code className="bg-blue-100 px-1 rounded">@date</code>, <code className="bg-blue-100 px-1 rounded">@courseName</code>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Placeholders are case-sensitive and should start with @
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    You can use any text as placeholders (e.g., @studentName, @university, @grade)
                  </li>
              </ul>
            </div>
          </div>
        </div>
      )}

        {/* Preview Step */}
        {step === 'preview' && docxBuffer && (
          <div className="space-y-8">
            {/* Template Info Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Template Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
              <input
                type="text"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="e.g., Computer Science Lab Manual"
                required
              />
            </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={templateData.category}
                onChange={(e) => setTemplateData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="lab-manual">Lab Manual</option>
                <option value="assignment">Assignment</option>
                <option value="report">Report</option>
                <option value="certificate">Certificate</option>
                    <option value="letter">Letter</option>
                    <option value="form">Form</option>
              </select>
            </div>
          </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={templateData.description}
              onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              rows={3}
              placeholder="Describe what this template is for..."
            />
              </div>
            </div>

            {/* Document Preview */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Document Preview & Placeholders
              </h2>

              {/* Page Range Selection */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Page Range Selection
                  </h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="usePageRange"
                      checked={usePageRange}
                      onChange={(e) => setUsePageRange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="usePageRange" className="text-sm font-medium text-gray-700">
                      Use page range
                    </label>
                  </div>
          </div>

                {usePageRange && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">From page:</label>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={pageRange.start}
                        onChange={(e) => setPageRange(prev => ({ ...prev, start: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">To page:</label>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={pageRange.end}
                        onChange={(e) => setPageRange(prev => ({ ...prev, end: Math.min(totalPages, Math.max(prev.start, parseInt(e.target.value) || prev.start)) }))}
                        className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <span className="text-sm text-gray-500">of {totalPages} pages</span>
                    <button
                      onClick={() => {
                        const newTotal = prompt(`Current estimate: ${totalPages} pages\nEnter actual page count:`, totalPages.toString());
                        if (newTotal && !isNaN(parseInt(newTotal))) {
                          setTotalPages(parseInt(newTotal));
                          setPageRange(prev => ({ ...prev, end: parseInt(newTotal) }));
                        }
                      }}
                      className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                      title="Correct page count if estimation is wrong"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={handleExtractPlaceholdersFromRange}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {isProcessing ? 'Extracting...' : 'Extract Placeholders'}
                    </button>
                  </div>
                )}
              </div>

              {/* Placeholders Found */}
              {extractedPlaceholders.length > 0 ? (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Found {extractedPlaceholders.length} placeholders:</h3>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ✓ Ready to use
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extractedPlaceholders.map((placeholder, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium"
                      >
                        @{placeholder}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-yellow-800 font-medium">No placeholders found</p>
                  </div>
                  <p className="text-yellow-700 text-sm mt-1">
                    Add placeholders like @name, @date, @courseName to your document and re-upload.
                  </p>
                </div>
              )}

              {/* Document Preview Component */}
              {docxBuffer && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Document Preview</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowDocxPreview(true)}
                        className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                      </button>
                      <button
                        onClick={() => setShowDocxEditor(true)}
                        className="flex items-center px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-xs font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={handleDownloadOriginal}
                        className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Document processed successfully. {extractedPlaceholders.length} placeholders detected.
                  </p>
                  <div className="text-xs text-gray-500">
                    File: {file?.name} ({(file?.size || 0 / 1024).toFixed(1)} KB) | Pages: {totalPages}
                  </div>
                </div>
              )}
            </div>

          {/* Action Buttons */}
            <div className="flex justify-between items-center">
            <button
              onClick={() => setStep('upload')}
                className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200"
            >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Upload
            </button>
            <button
              onClick={handleSaveTemplate}
                disabled={!templateData.name || isUploading}
                className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Saving Template...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Template
                  </>
                )}
            </button>
          </div>
        </div>
      )}

        {/* Success Step */}
        {step === 'save' && (
          <div className="bg-white rounded-2xl shadow-xl p-12 border border-gray-100 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Template Created Successfully! 🎉</h2>
              <p className="text-gray-600 text-lg mb-6">
                Your dynamic template <span className="font-semibold text-blue-600">&quot;{templateData.name}&quot;</span> has been saved with <span className="font-semibold text-purple-600">{extractedPlaceholders.length} placeholders</span>.
              </p>
              
              {/* Template Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8 border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-4">Template Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-700">Template Name</div>
                    <div className="text-blue-600 font-semibold">{templateData.name}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-700">Category</div>
                    <div className="text-purple-600 font-semibold capitalize">{templateData.category.replace('-', ' ')}</div>
                  </div>
        <div className="text-center">
                    <div className="font-medium text-gray-700">Placeholders</div>
                    <div className="text-green-600 font-semibold">{extractedPlaceholders.length} found</div>
                  </div>
                </div>
              </div>

              {/* Placeholders List */}
              {extractedPlaceholders.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-800 mb-3">Detected Placeholders:</h4>
                  <div className="flex flex-wrap justify-center gap-2">
                    {extractedPlaceholders.map((placeholder, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium"
                      >
                        @{placeholder}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.href = '/admin/templates/dynamic'}
                className="flex items-center justify-center px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View All Templates
              </button>
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setDocxBuffer(null);
                  setExtractedPlaceholders([]);
                  setTemplateData({ name: '', description: '', category: 'lab-manual' });
                }}
                className="flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Another Template
              </button>
            </div>
          </div>
        )}

        {/* DOCX Preview Modal */}
        {showDocxPreview && docxBuffer && (
          <DocxPreview
            docxBuffer={docxBuffer}
            onClose={() => setShowDocxPreview(false)}
          />
        )}

        {/* DOCX Editor Modal */}
        {showDocxEditor && docxBuffer && (
          <DocxEditor
            docxBuffer={docxBuffer}
            placeholders={extractedPlaceholders}
            onSave={(newBuffer) => {
              setDocxBuffer(newBuffer);
              setShowDocxEditor(false);
            }}
            onClose={() => setShowDocxEditor(false)}
          />
        )}
        </div>
    </div>
  );
}

export default function DynamicTemplateUpload() {
  return (
    <AdminRouteProtection 
      title="Admin Template Upload"
      subtitle="Upload and manage dynamic document templates"
    >
      <DynamicTemplateUploadContent />
    </AdminRouteProtection>
  );
}
