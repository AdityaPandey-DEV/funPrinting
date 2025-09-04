'use client';

import { useState, useCallback, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';

interface ProfessionalWordConverterProps {
  pdfUrl: string | null;
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
  }>;
  tables: Array<{
    id: string;
    title: string;
    headers: string[];
    rows: string[][];
  }>;
}

export default function ProfessionalWordConverter({ pdfUrl, onPlaceholdersExtracted }: ProfessionalWordConverterProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [wordContent, setWordContent] = useState<WordContent>({ paragraphs: [], tables: [] });
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionSuccess, setConversionSuccess] = useState(false);
  const [conversionProgress, setConversionProgress] = useState({
    step: '',
    percentage: 0
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

  const convertPDFToWord = useCallback(async () => {
    if (!pdfUrl) return;

    setIsConverting(true);
    setConversionError(null);
    setConversionSuccess(false);
    setConversionProgress({ step: 'Starting Adobe-quality conversion...', percentage: 0 });

    try {
      console.log('Starting Adobe-quality PDF to Word conversion...');
      
      // Convert blob URL back to file for API call
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const file = new File([blob], 'document.pdf', { type: 'application/pdf' });
      
      setConversionProgress({ step: 'Sending to Adobe conversion service...', percentage: 20 });
      
      // Call our Adobe-quality conversion API
      const formData = new FormData();
      formData.append('file', file);
      
      const apiResponse = await fetch('/api/convert-pdf-to-word', {
        method: 'POST',
        body: formData
      });
      
      if (!apiResponse.ok) {
        throw new Error('API conversion failed');
      }
      
      setConversionProgress({ step: 'Processing conversion results...', percentage: 60 });
      
      const result = await apiResponse.json();
      console.log('🔍 API Response received:', result);
      console.log('🔍 Word content:', result.wordContent);
      console.log('🔍 Paragraphs count:', result.wordContent?.paragraphs?.length);
      
      if (result.success && result.wordContent && result.wordContent.paragraphs) {
        console.log('✅ Setting word content:', result.wordContent);
        setWordContent(result.wordContent);
        setConversionSuccess(true);
        setConversionProgress({ step: 'Adobe-quality conversion completed!', percentage: 100 });
        console.log('Adobe-quality PDF to Word conversion completed successfully');
        
        // Extract placeholders with proper null checks
        const placeholders = result.wordContent.paragraphs
          .filter((p: any) => p && p.isPlaceholder && p.placeholderName)
          .map((p: any) => p.placeholderName);
        
        if (placeholders.length > 0) {
          onPlaceholdersExtracted(placeholders);
        }
      } else {
        throw new Error(result.error || 'Conversion failed');
      }
      
    } catch (error) {
      console.error('Error converting PDF to Word:', error);
      setConversionError(`Failed to convert PDF: ${error}`);
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
      setConversionProgress({ step: 'Generating professional Word document...', percentage: 50 });
      
      // Create professional Word document using docx library
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Add paragraphs
            ...wordContent.paragraphs.map(p => {
              if (p.style === 'heading') {
                return new Paragraph({
                  heading: p.level === 1 ? HeadingLevel.HEADING_1 : 
                           p.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
                  children: [
                    new TextRun({
                      text: p.isPlaceholder ? p.placeholderName : p.text,
                      color: p.isPlaceholder ? 'FF0000' : '000000',
                      bold: true,
                      size: p.level === 1 ? 32 : p.level === 2 ? 28 : 24
                    })
                  ]
                });
              } else if (p.style === 'list') {
                return new Paragraph({
                  children: [
                    new TextRun({
                      text: p.isPlaceholder ? p.placeholderName : p.text,
                      color: p.isPlaceholder ? 'FF0000' : '000000',
                      size: 24
                    })
                  ]
                });
              } else {
                return new Paragraph({
                  children: [
                    new TextRun({
                      text: p.isPlaceholder ? p.placeholderName : p.text,
                      color: p.isPlaceholder ? 'FF0000' : '000000',
                      size: 24
                    })
                  ]
                });
              }
            }),
            
            // Add tables
            ...wordContent.tables.map(table => 
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  // Header row
                  new TableRow({
                    children: table.headers.map(header => 
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: header,
                                bold: true,
                                size: 20,
                                color: '000000'
                              })
                            ]
                          })
                        ]
                      })
                    )
                  }),
                  // Data rows
                  ...table.rows.map(row => 
                    new TableRow({
                      children: row.map(cell => 
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: cell.startsWith('@') ? cell : cell,
                                  color: cell.startsWith('@') ? 'FF0000' : '000000',
                                  bold: cell.startsWith('@'),
                                  size: 18
                                })
                              ]
                            })
                          ]
                        })
                      )
                    })
                  )
                ]
              })
            )
          ]
        }]
      });

      setConversionProgress({ step: 'Finalizing document...', percentage: 80 });
      
      // Generate and download the document
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'professional-lab-manual.docx';
      link.click();
      window.URL.revokeObjectURL(url);
      
      setConversionProgress({ step: 'Download completed!', percentage: 100 });
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document');
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
      wordContent.tables.forEach(table => {
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
      convertPDFToWord();
    }
  }, [pdfUrl, convertPDFToWord, conversionSuccess]);

  if (conversionError) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Conversion Error</h3>
          <p className="text-red-600 mb-4">{conversionError}</p>
          <button
            onClick={convertPDFToWord}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isConverting) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Adobe-Quality PDF to Word Conversion</h3>
          <p className="text-blue-600 mb-2">{conversionProgress.step}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${conversionProgress.percentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{conversionProgress.percentage.toFixed(0)}%</p>
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
              onClick={downloadWordDocument}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 Download Professional Word
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-6">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">🚀 Adobe-Quality PDF to Word Converter Features:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>Professional Conversion</strong> - Adobe-quality PDF to Word conversion</li>
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
                  <p className="text-gray-600">Converted from PDF using Adobe PDF Services API</p>
                </div>
              </div>
              
              {/* Word Document Content */}
              <div className="space-y-6">
                {wordContent.paragraphs.map((paragraph) => (
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
                ))}
              </div>
              
              {/* Document Footer */}
              <div className="mt-12 pt-4 border-t border-gray-300">
                <div className="text-center text-sm text-gray-500">
                  <p>Generated by Adobe PDF Services API</p>
                  <p>Total paragraphs: {wordContent.paragraphs.length} | Placeholders: {wordContent.paragraphs.filter(p => p.isPlaceholder).length}</p>
                </div>
              </div>
              
              {/* Tables */}
              {wordContent.tables.length > 0 && (
                <div className="space-y-6 mt-8">
                  <h3 className="text-lg font-semibold text-gray-900">Tables</h3>
                  {wordContent.tables.map((table) => (
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
          
          {wordContent.paragraphs.length === 0 && wordContent.tables.length === 0 && (
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
    </div>
  );
}
