'use client';

import { useState, useCallback, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import MicrosoftWordEditor from './MicrosoftWordEditor';

interface ProfessionalWordConverterProps {
  pdfUrl: string | null; // This will now be a DOCX URL
  onPlaceholdersExtracted: (placeholders: string[]) => void;
}

interface WordContent {
  paragraphs: Array<{
    id: string;
    text: string;
    isPlaceholder: boolean;
    placeholderName: string;
    style: 'heading' | 'normal' | 'list';
    level?: number;
    html?: string; // HTML content for better formatting
  }>;
  tables?: Array<{
    id: string;
    title: string;
    headers: string[];
    rows: string[][];
  }>;
  totalParagraphs?: number; // Total number of paragraphs
  placeholders?: string[]; // Array of extracted placeholders
  conversionMethod?: string; // Method used for conversion
  docxBuffer?: string; // Base64 encoded DOCX buffer for download
  fullHtml?: string; // Full HTML content for rich display
}

export default function ProfessionalWordConverter({ pdfUrl, onPlaceholdersExtracted }: ProfessionalWordConverterProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [wordContent, setWordContent] = useState<WordContent>({ paragraphs: [] });
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionSuccess, setConversionSuccess] = useState(false);
  const [conversionProgress, setConversionProgress] = useState({
    step: '',
    percentage: 0,
    details: '',
    conversionMethod: ''
  });
  
  // Editing states
  const [editingParagraph, setEditingParagraph] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddParagraphModal, setShowAddParagraphModal] = useState(false);
  const [newParagraphData, setNewParagraphData] = useState({
    text: '',
    isPlaceholder: false,
    placeholderName: '',
    style: 'normal' as 'heading' | 'normal' | 'list'
  });
  
  // Save template states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Microsoft Word Online editor states
  const [showWordEditor, setShowWordEditor] = useState(false);

  const processWordDocument = useCallback(async () => {
    if (!pdfUrl) return;

    setIsConverting(true);
    setConversionError(null);
    setConversionSuccess(false);
    setConversionProgress({ 
      step: 'Processing Word document...', 
      percentage: 0,
      details: 'Reading Word document content...',
      conversionMethod: 'mammoth'
    });

    try {
      console.log('Starting Word document processing...');
      
      // Fetch the Word document
      const response = await fetch(pdfUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      setConversionProgress({ 
        step: 'Analyzing document...', 
        percentage: 30,
        details: 'Extracting text and placeholders...',
        conversionMethod: 'mammoth'
      });
      
      // Use mammoth to extract content from the Word document
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ buffer: Buffer.from(arrayBuffer) });
      const htmlContent = result.value;
      
      setConversionProgress({ 
        step: 'Processing content...', 
        percentage: 60,
        details: 'Converting HTML to structured content...',
        conversionMethod: 'mammoth'
      });

      // Convert HTML to plain text for placeholder extraction
      const textContent = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      
      // Extract placeholders using regex
      const placeholderRegex = /@([A-Za-z0-9_]+)/g;
      const placeholders = [...new Set(
        (textContent.match(placeholderRegex) || [])
          .map(match => match.substring(1))
      )];
      
      console.log('📝 Extracted placeholders:', placeholders);
      
      // Split content into paragraphs for better display
      const lines = textContent.split('\n').filter(line => line.trim().length > 0);
      const paragraphs = lines.map((line, index) => {
        const trimmedLine = line.trim();
        const placeholderMatch = trimmedLine.match(/@(\w+)/);
        const isPlaceholder = !!placeholderMatch;
        const placeholderName = isPlaceholder ? placeholderMatch[1] : '';

        let style: 'normal' | 'heading' | 'list' = 'normal';
        let level = 1;

        // Detect headings (short lines, all caps, or ending with colon)
        if (trimmedLine.length < 100 && (trimmedLine.toUpperCase() === trimmedLine || trimmedLine.endsWith(':')) && !isPlaceholder) {
          style = 'heading';
          level = trimmedLine.includes(':') ? 3 : (trimmedLine.length < 50 ? 1 : 2);
        } else if (trimmedLine.match(/^\d+\./)) {
          style = 'list';
        }

        return {
          id: (index + 1).toString(),
          text: trimmedLine,
          style: style,
          level: level,
          isPlaceholder: isPlaceholder,
          placeholderName: placeholderName
        };
      });
      
      setConversionProgress({ 
        step: 'Document processed successfully!', 
        percentage: 100,
        details: `Found ${placeholders.length} placeholders in document`,
        conversionMethod: 'mammoth'
      });
      
      // Set the word content
      setWordContent({
        paragraphs: paragraphs,
        tables: [],
        docxBuffer: Buffer.from(arrayBuffer).toString('base64'),
        fullHtml: htmlContent
      });
      
      setConversionSuccess(true);
      
      // Extract placeholders for parent component
      if (placeholders.length > 0) {
        onPlaceholdersExtracted(placeholders);
      }
      
    } catch (error) {
      console.error('Error processing Word document:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConversionError(`Failed to process Word document: ${errorMessage}`);
      setConversionProgress(prev => ({
        ...prev,
        step: 'Conversion failed',
        details: errorMessage,
        percentage: 0
      }));
    } finally {
      setIsConverting(false);
    }
  }, [pdfUrl, onPlaceholdersExtracted]);

  // Editing functions
  const startEditing = (paragraph: any) => {
    setEditingParagraph(paragraph.id);
    setEditText(paragraph.text);
  };

  const saveEdit = (id: string) => {
    setWordContent(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.map(p => 
        p.id === id ? { ...p, text: editText } : p
      )
    }));
    setEditingParagraph(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingParagraph(null);
    setEditText('');
  };

  const deleteParagraph = (id: string) => {
    setWordContent(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.filter(p => p.id !== id)
    }));
  };

  const addParagraph = () => {
    if (!newParagraphData.text.trim()) return;

    const newParagraph = {
      id: Date.now().toString(),
      text: newParagraphData.text,
      isPlaceholder: newParagraphData.isPlaceholder,
      placeholderName: newParagraphData.isPlaceholder ? newParagraphData.placeholderName : '',
      style: newParagraphData.style,
      level: newParagraphData.style === 'heading' ? 1 : undefined
    };

    setWordContent(prev => ({
      ...prev,
      paragraphs: [...prev.paragraphs, newParagraph]
    }));

    setShowAddParagraphModal(false);
    setNewParagraphData({ text: '', isPlaceholder: false, placeholderName: '', style: 'normal' });
  };

  const convertToPlaceholder = (id: string) => {
    const paragraph = wordContent.paragraphs.find(p => p.id === id);
    if (!paragraph) return;

    const placeholderName = `@${paragraph.text.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}`;
    
    setWordContent(prev => ({
      ...prev,
      paragraphs: prev.paragraphs.map(p => 
        p.id === id ? { ...p, isPlaceholder: true, placeholderName } : p
      )
    }));

    // Extract placeholders for the parent component
    const placeholders = wordContent.paragraphs
      .filter(p => p.isPlaceholder)
      .map(p => p.placeholderName);
    
    onPlaceholdersExtracted(placeholders);
  };

  const downloadWordDocument = async () => {
    try {
      setConversionProgress({ 
        step: 'Preparing Word document download...', 
        percentage: 50,
        details: 'Converting DOCX buffer...',
        conversionMethod: ''
      });
      
      // Get the DOCX buffer from the conversion result
      if (!wordContent.docxBuffer) {
        throw new Error('No DOCX buffer available for download');
      }
      
      // Convert base64 to blob
      const base64Data = wordContent.docxBuffer;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob and download
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted-document.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setConversionProgress({ 
        step: 'Download completed!', 
        percentage: 100,
        details: 'Word document downloaded successfully',
        conversionMethod: ''
      });
      
    } catch (error) {
      console.error('Error downloading Word document:', error);
      setConversionError('Failed to download Word document: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setIsSaving(true);
    try {
      // Extract placeholders from the content
      const placeholders: string[] = [];
      wordContent.paragraphs.forEach(p => {
        if (p.isPlaceholder && p.placeholderName) {
          placeholders.push(p.placeholderName);
        }
      });
      (wordContent.tables || []).forEach(table => {
        table.rows.forEach(row => {
          row.forEach(cell => {
            const matches = cell.match(/@(\w+)/g);
            if (matches) {
              matches.forEach(match => placeholders.push(match.substring(1)));
            }
          });
        });
      });

      const response = await fetch('/api/save-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName: templateName.trim(),
          wordContent: wordContent,
          placeholders: [...new Set(placeholders)] // Remove duplicates
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Template "${templateName}" saved successfully!`);
        setShowSaveModal(false);
        setTemplateName('');
      } else {
        alert(`Error saving template: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (pdfUrl && !conversionSuccess) {
      processWordDocument();
    }
  }, [pdfUrl, processWordDocument, conversionSuccess]);

  if (conversionError) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Document Processing Error</h3>
          <p className="text-red-600 mb-4">{conversionError}</p>
          
          {/* Show conversion method if available */}
          {conversionProgress.conversionMethod && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Conversion Method:</strong> {conversionProgress.conversionMethod}
              </p>
              {conversionProgress.details && (
                <p className="text-xs text-yellow-700 mt-1">{conversionProgress.details}</p>
              )}
            </div>
          )}
          
          {/* Helpful information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-800 mb-2">Troubleshooting Tips:</h4>
            <ul className="text-xs text-gray-600 space-y-1 text-left">
              <li>• Ensure the Word document is not corrupted or password-protected</li>
              <li>• Try with a different Word document (.docx or .doc)</li>
              <li>• Check if the document contains text and placeholders like @name, @date</li>
              <li>• Make sure the document is saved in a compatible format</li>
            </ul>
          </div>
          
          <div className="flex justify-center space-x-3">
            <button
              onClick={processWordDocument}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                setConversionError(null);
                setConversionSuccess(false);
                setWordContent({ paragraphs: [] });
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isConverting) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Document Conversion in Progress</h3>
          <p className="text-blue-600 mb-2 font-medium">{conversionProgress.step}</p>
          {conversionProgress.details && (
            <p className="text-sm text-gray-600 mb-4">{conversionProgress.details}</p>
          )}
          <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${conversionProgress.percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-gray-500">{conversionProgress.percentage.toFixed(0)}%</p>
            {conversionProgress.conversionMethod && (
              <p className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
                Using: {conversionProgress.conversionMethod}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="text-blue-500 text-6xl mb-4">📄</div>
          <p className="text-blue-600 text-lg mb-2">Adobe-Quality Word Converter Ready</p>
          <p className="text-gray-600 mb-4">Upload a PDF file to convert to professional Word format with Adobe-quality conversion</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddParagraphModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Paragraph
            </button>
            <button
              onClick={() => {
                setNewParagraphData({ 
                  text: 'This is a placeholder', 
                  isPlaceholder: true, 
                  placeholderName: '@name',
                  style: 'normal'
                });
                setShowAddParagraphModal(true);
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              + Add Placeholder
            </button>
            <button
              onClick={() => setShowWordEditor(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ✏️ Edit with Microsoft Word Online
            </button>
            <button
              onClick={downloadWordDocument}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 Download Word Document
            </button>
          </div>
        </div>
      </div>

              {/* Instructions */}
        <div className="p-6">
          {/* Success Message */}
          {conversionSuccess && conversionProgress.conversionMethod && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">✅ Conversion Successful!</h4>
              <p className="text-sm text-green-700">
                Document converted using <strong>{conversionProgress.conversionMethod}</strong> API
                {conversionProgress.details && ` - ${conversionProgress.details}`}
              </p>
            </div>
          )}
          
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">🚀 Document Conversion Features:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>Smart Conversion</strong> - Cloudmersive primary, LibreOffice CLI fallback, Mock for testing</li>
              <li>• <strong>Table Preservation</strong> - Maintains all tables and formatting</li>
              <li>• <strong>Structure Recognition</strong> - Automatically detects headings, lists, and tables</li>
              <li>• <strong>Interactive Editing</strong> - Edit content directly in the website</li>
              <li>• <strong>Placeholder System</strong> - Add @placeholders for dynamic content</li>
            </ul>
          </div>

        {/* Word Document Preview */}
        <div className="border border-gray-300 rounded-lg bg-white shadow-lg" style={{ minHeight: '800px' }}>
          {/* Word Document Header */}
          <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-sm text-gray-600 font-medium">Microsoft Word - Document1</div>
            <div className="w-8"></div>
          </div>
          
          {/* Word Document Toolbar */}
          <div className="bg-gray-50 border-b border-gray-300 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm">
                <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Home</button>
                <button className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded">Insert</button>
                <button className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded">Design</button>
                <button className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded">Layout</button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  💾 Save Template
                </button>
                <button
                  onClick={downloadWordDocument}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  📥 Download Word
                </button>
              </div>
            </div>
          </div>
          
          {/* Word Document Content Area */}
          <div className="p-8 bg-gray-100" style={{ minHeight: '700px' }}>
            {/* Word Document Page */}
            <div className="max-w-4xl mx-auto bg-white shadow-2xl" style={{ minHeight: '800px', padding: '2.5cm' }}>
              {/* Document Header */}
              <div className="mb-8">
                <div className="text-center border-b border-gray-300 pb-4">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Preview</h1>
                  <p className="text-gray-600">Converted from PDF using Smart Conversion System</p>
                </div>
              </div>
              
              {/* Word Document Content */}
              <div className="space-y-6">
                {wordContent.fullHtml ? (
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: wordContent.fullHtml }}
                  />
                ) : (
                  wordContent.paragraphs.map((paragraph) => (
                    <div
                      key={paragraph.id}
                      className={`transition-all duration-200 ${
                        editingParagraph === paragraph.id 
                          ? 'bg-blue-50 border-2 border-blue-500 rounded p-4' 
                          : 'hover:bg-gray-50 cursor-pointer rounded p-2'
                      } ${paragraph.isPlaceholder ? 'bg-red-50 border border-red-200' : ''}`}
                      onClick={() => startEditing(paragraph)}
                    >
                    {editingParagraph === paragraph.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full border rounded px-3 py-2 resize-none text-gray-900"
                          rows={Math.max(2, editText.split('\n').length)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit(paragraph.id);
                            }
                            if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEdit(paragraph.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            ✅ Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                          >
                            ❌ Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {paragraph.style === 'heading' ? (
                            <h3 className={`font-bold text-gray-900 mb-2 ${
                              paragraph.level === 1 ? 'text-2xl' : 
                              paragraph.level === 2 ? 'text-xl' : 'text-lg'
                            }`}>
                              {paragraph.isPlaceholder ? (
                                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-mono border border-red-300">
                                  @{paragraph.placeholderName}
                                </span>
                              ) : (
                                paragraph.text
                              )}
                            </h3>
                          ) : paragraph.style === 'list' ? (
                            <div className="flex items-start space-x-3">
                              <span className="text-gray-500 mt-1 text-lg">•</span>
                              <span className="text-gray-900 leading-relaxed">
                                {paragraph.isPlaceholder ? (
                                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-mono border border-red-300">
                                    @{paragraph.placeholderName}
                                  </span>
                                ) : (
                                  paragraph.text
                                )}
                              </span>
                            </div>
                          ) : (
                            <p className="text-gray-900 leading-relaxed text-base">
                              {paragraph.isPlaceholder ? (
                                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-mono border border-red-300">
                                  @{paragraph.placeholderName}
                                </span>
                              ) : (
                                paragraph.text
                              )}
                            </p>
                          )}
                          {paragraph.isPlaceholder && (
                            <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded mt-1 inline-block">Placeholder</span>
                          )}
                        </div>
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!paragraph.isPlaceholder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                convertToPlaceholder(paragraph.id);
                              }}
                              className="text-orange-600 hover:text-orange-800 text-sm bg-orange-50 px-2 py-1 rounded"
                            >
                              🔄 Convert to Placeholder
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteParagraph(paragraph.id);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm bg-red-50 px-2 py-1 rounded"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
                )}
              </div>
              
              {/* Document Footer */}
              <div className="mt-12 pt-4 border-t border-gray-300">
                <div className="text-center text-sm text-gray-500">
                  <p>Generated by Adobe PDF Services API</p>
                  <p>Total paragraphs: {wordContent.paragraphs.length} | Placeholders: {wordContent.paragraphs.filter(p => p.isPlaceholder).length}</p>
                </div>
              </div>
              
              {/* Tables */}
              {wordContent.tables && wordContent.tables.length > 0 && (
                <div className="space-y-6 mt-8">
                  <h3 className="text-lg font-semibold text-gray-900">Tables</h3>
                  {(wordContent.tables || []).map((table) => (
                    <div key={table.id} className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-50">
                            <tr>
                              {table.headers.map((header, index) => (
                                <th key={index} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row, rowIndex) => (
                              <tr key={rowIndex} className="hover:bg-gray-50">
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
                                    <span className={cell.startsWith('@') ? 'text-red-600 font-bold' : 'text-gray-900'}>
                                      {cell}
                                    </span>
                                    {cell.startsWith('@') && (
                                      <span className="ml-2 text-xs text-red-500 bg-red-100 px-1 py-0.5 rounded">P</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {wordContent.paragraphs.length === 0 && (!wordContent.tables || wordContent.tables.length === 0) && (
            <div className="max-w-4xl mx-auto bg-white shadow-2xl p-8" style={{ minHeight: '800px' }}>
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📄</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">No Document Content Yet</h2>
                <p className="text-gray-600 mb-6">Upload a PDF file to convert it to Word format using Adobe PDF Services API</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-blue-800 text-sm">
                    <strong>Adobe PDF Services API</strong> will extract all text, formatting, and structure from your PDF and convert it to a Word document format.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Paragraph Modal */}
      {showAddParagraphModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add New Paragraph</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Paragraph Content</label>
                <textarea
                  value={newParagraphData.text}
                  onChange={(e) => setNewParagraphData(prev => ({ ...prev, text: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter your paragraph content here..."
                  rows={3}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Paragraph Style</label>
                <select
                  value={newParagraphData.style}
                  onChange={(e) => setNewParagraphData(prev => ({ ...prev, style: e.target.value as any }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="normal">Normal Text</option>
                  <option value="heading">Heading</option>
                  <option value="list">List Item</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPlaceholder"
                  checked={newParagraphData.isPlaceholder}
                  onChange={(e) => setNewParagraphData(prev => ({ ...prev, isPlaceholder: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isPlaceholder" className="text-sm">This is a placeholder</label>
              </div>

              {newParagraphData.isPlaceholder && (
                <div>
                  <label className="block text-sm font-medium mb-2">Placeholder Name</label>
                  <input
                    type="text"
                    value={newParagraphData.placeholderName}
                    onChange={(e) => setNewParagraphData(prev => ({ ...prev, placeholderName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., @name, @rollno"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddParagraphModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addParagraph}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Paragraph
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Template</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter template name (e.g., Computer Science Lab Manual)"
                  autoFocus
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Template will include:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• All paragraphs and content</li>
                  <li>• Tables and formatting</li>
                  <li>• Placeholders for dynamic content</li>
                  <li>• Ready for student form generation</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={isSaving || !templateName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Microsoft Word Online Editor */}
      {showWordEditor && wordContent.docxBuffer && (
        <MicrosoftWordEditor
          docxBuffer={wordContent.docxBuffer}
          onDocumentEdited={(editedBuffer) => {
            // Update the word content with the edited buffer
            setWordContent(prev => ({
              ...prev,
              docxBuffer: editedBuffer
            }));
            setShowWordEditor(false);
          }}
          onClose={() => setShowWordEditor(false)}
        />
      )}
    </div>
  );
}
