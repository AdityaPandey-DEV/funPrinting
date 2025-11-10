'use client';

import { useState, useCallback, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun } from 'docx';

interface WordEditorProps {
  pdfUrl: string | null;
  onPlaceholdersExtracted: (placeholders: string[]) => void;
}

interface WordContent {
  paragraphs: Array<{
    id: string;
    text: string;
    isPlaceholder: boolean;
    placeholderName: string;
  }>;
}

export default function WordEditor({ pdfUrl, onPlaceholdersExtracted }: WordEditorProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [wordContent, setWordContent] = useState<WordContent>({ paragraphs: [] });
  const [selectedParagraph, setSelectedParagraph] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddParagraphModal, setShowAddParagraphModal] = useState(false);
  const [newParagraphData, setNewParagraphData] = useState({
    text: '',
    isPlaceholder: false,
    placeholderName: ''
  });
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionSuccess, setConversionSuccess] = useState(false);

  const convertPDFToWord = useCallback(async () => {
    if (!pdfUrl) return;

    setIsConverting(true);
    setConversionError(null);
    setConversionSuccess(false);

    try {
      console.log('Starting PDF to Word conversion...');
      console.log('PDF URL:', pdfUrl);
      
      // Import PDF.js to extract text from the actual PDF
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      
      console.log('Loading PDF document for text extraction...');
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      
      console.log('PDF loaded successfully. Pages:', pdf.numPages);
      
      const extractedContent: WordContent = { paragraphs: [] };
      let paragraphId = 1;
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Processing page ${pageNum}...`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        console.log(`Page ${pageNum} has ${textContent.items.length} text items`);
        
        // Group text items by their vertical position (y-coordinate)
        const textGroups: { [key: string]: string[] } = {};
        
        for (const item of textContent.items) {
          if (item.str && item.str.trim()) {
            // Round y-coordinate to group items on the same line
            const yKey = Math.round(item.transform[5] * 100) / 100;
            if (!textGroups[yKey]) {
              textGroups[yKey] = [];
            }
            textGroups[yKey].push(item.str);
          }
        }
        
        // Convert grouped text to paragraphs
        const sortedYKeys = Object.keys(textGroups).sort((a, b) => parseFloat(b) - parseFloat(a));
        
        for (const yKey of sortedYKeys) {
          const lineText = textGroups[yKey].join(' ').trim();
          if (lineText) {
            console.log(`Adding paragraph: "${lineText}"`);
            extractedContent.paragraphs.push({
              id: paragraphId.toString(),
              text: lineText,
              isPlaceholder: false,
              placeholderName: ''
            });
            paragraphId++;
          }
        }
      }
      
      console.log('Text extraction completed. Total paragraphs:', extractedContent.paragraphs.length);
      
      // If no text was extracted, show a message
      if (extractedContent.paragraphs.length === 0) {
        console.log('No text content found, adding fallback message');
        extractedContent.paragraphs.push({
          id: '1',
          text: 'No text content found in PDF. You can add paragraphs manually.',
          isPlaceholder: false,
          placeholderName: ''
        });
      }
      
      setWordContent(extractedContent);
      setConversionSuccess(true);
      console.log('PDF to Word conversion completed successfully');
      
      // Extract any existing placeholders
      const placeholders = extractedContent.paragraphs
        .filter(p => p.isPlaceholder)
        .map(p => p.placeholderName);
      
      if (placeholders.length > 0) {
        onPlaceholdersExtracted(placeholders);
      }
      
    } catch (error) {
      console.error('Error converting PDF to Word:', error);
      setConversionError(`Failed to convert PDF: ${error}`);
    } finally {
      setIsConverting(false);
    }
  }, [pdfUrl, onPlaceholdersExtracted]);

  const addParagraph = () => {
    if (!newParagraphData.text.trim()) return;

    const newParagraph = {
      id: Date.now().toString(),
      text: newParagraphData.text,
      isPlaceholder: newParagraphData.isPlaceholder,
      placeholderName: newParagraphData.isPlaceholder ? newParagraphData.placeholderName : ''
    };

    setWordContent(prev => ({
      paragraphs: [...prev.paragraphs, newParagraph]
    }));

    setShowAddParagraphModal(false);
    setNewParagraphData({ text: '', isPlaceholder: false, placeholderName: '' });
  };

  const updateParagraph = (id: string, newText: string) => {
    setWordContent(prev => ({
      paragraphs: prev.paragraphs.map(p => 
        p.id === id ? { ...p, text: newText } : p
      )
    }));
    setSelectedParagraph(null);
    setEditText('');
  };

  const deleteParagraph = (id: string) => {
    setWordContent(prev => ({
      paragraphs: prev.paragraphs.filter(p => p.id !== id)
    }));
    setSelectedParagraph(null);
  };

  const convertToPlaceholder = (id: string) => {
    const paragraph = wordContent.paragraphs.find(p => p.id === id);
    if (!paragraph) return;

    const placeholderName = `{{${paragraph.text.toLowerCase().replace(/\s+/g, '')}}}`;
    
    setWordContent(prev => ({
      paragraphs: prev.paragraphs.map(p => 
        p.id === id ? { ...p, isPlaceholder: true, placeholderName } : p
      )
    }));

    // Extract placeholders
    const placeholders = wordContent.paragraphs
      .filter(p => p.isPlaceholder)
      .map(p => p.placeholderName);
    
    onPlaceholdersExtracted(placeholders);
  };

  const downloadWordDocument = async () => {
    try {
      // Create Word document using docx library
      const doc = new Document({
        sections: [{
          properties: {},
          children: wordContent.paragraphs.map(p => 
            new Paragraph({
              children: [
                new TextRun({
                  text: p.isPlaceholder ? p.placeholderName : p.text,
                  color: p.isPlaceholder ? 'FF0000' : '000000', // Red for placeholders
                  bold: p.isPlaceholder
                })
              ]
            })
          )
        }]
      });

      // Generate and download the document
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template.docx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document');
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
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Converting PDF to Word...</h3>
          <p className="text-blue-600">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="text-blue-500 text-6xl mb-4">📄</div>
          <p className="text-blue-600 text-lg mb-2">Word Editor Ready</p>
          <p className="text-gray-600 mb-4">Upload a PDF file to convert to Word and start editing</p>
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
                  placeholderName: '{{name}}' 
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
              📥 Download Word
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-6">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 How to Edit Your Word Document:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>Click on any paragraph</strong> to edit the text</li>
            <li>• <strong>Use the &quot;Convert to Placeholder&quot; button</strong> to make text dynamic</li>
            <li>• <strong>Add new paragraphs</strong> with the + Add Paragraph button</li>
            <li>• <strong>Use {{placeholders}}</strong> like {{name}}, {{rollno}} for dynamic content</li>
            <li>• <strong>Download the final Word document</strong> when finished</li>
          </ul>
        </div>

        {/* Word Document Content */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-semibold mb-4">Word Document Content</h3>
          <div className="space-y-3">
            {wordContent.paragraphs.map((paragraph) => (
              <div
                key={paragraph.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedParagraph === paragraph.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${paragraph.isPlaceholder ? 'bg-red-50 border-red-200' : ''}`}
                onClick={() => {
                  setSelectedParagraph(paragraph.id);
                  setEditText(paragraph.text);
                }}
              >
                {selectedParagraph === paragraph.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 border rounded px-2 py-1"
                      autoFocus
                    />
                    <button
                      onClick={() => updateParagraph(paragraph.id, editText)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setSelectedParagraph(null)}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className={`${paragraph.isPlaceholder ? 'text-red-600 font-bold' : 'text-gray-900'}`}>
                        {paragraph.isPlaceholder ? paragraph.placeholderName : paragraph.text}
                      </span>
                      {paragraph.isPlaceholder && (
                        <span className="ml-2 text-xs text-red-500">(Placeholder)</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {!paragraph.isPlaceholder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            convertToPlaceholder(paragraph.id);
                          }}
                          className="text-orange-600 hover:text-orange-800 text-sm"
                        >
                          Convert to Placeholder
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteParagraph(paragraph.id);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {wordContent.paragraphs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No content yet. Add paragraphs to start building your Word document.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Paragraph Modal */}
      {showAddParagraphModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Paragraph</h3>
            
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
                    placeholder="e.g., {{name}}, {{rollno}}"
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
    </div>
  );
}
