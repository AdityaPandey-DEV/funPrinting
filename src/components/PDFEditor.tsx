'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WarningIcon, DocumentIcon } from '@/components/SocialIcons';

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  isPlaceholder: boolean;
  placeholderName: string;
}

interface PDFEditorProps {
  pdfUrl: string | null;
  onPlaceholdersExtracted: (placeholders: string[]) => void;
}

export default function PDFEditor({ pdfUrl, onPlaceholdersExtracted }: PDFEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedOverlay, setSelectedOverlay] = useState<TextOverlay | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [newTextData, setNewTextData] = useState({
    text: '',
    isPlaceholder: false,
    placeholderName: ''
  });
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLCanvasElement>(null);

  const drawTextOverlays = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw text overlays for current page
    textOverlays
      .filter(overlay => overlay.page === currentPage)
      .forEach(overlay => {
        const isSelected = selectedOverlay?.id === overlay.id;
        
        // Draw background for selected overlay
        if (isSelected) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
          ctx.fillRect(overlay.x * zoom, overlay.y * zoom, overlay.width * zoom, overlay.height * zoom);
        }

        // Draw text
        ctx.fillStyle = overlay.isPlaceholder ? '#dc2626' : '#1f2937';
        ctx.font = `${14 * zoom}px Arial`;
        ctx.fillText(overlay.text, overlay.x * zoom, overlay.y * zoom + 15 * zoom);

        // Draw border
        ctx.strokeStyle = overlay.isPlaceholder ? '#dc2626' : (isSelected ? '#3b82f6' : '#d1d5db');
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(overlay.x * zoom, overlay.y * zoom, overlay.width * zoom, overlay.height * zoom);
      });
  }, [textOverlays, currentPage, selectedOverlay, zoom]);

  const renderPage = useCallback(async (pdf: any, pageNum: number) => {
    if (!canvasRef.current) return;
    
    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        console.error('Could not get canvas context');
        return;
      }
      
      // Calculate viewport with better scaling
      const viewport = page.getViewport({ scale: zoom });
      console.log('Rendering page:', pageNum, 'Viewport:', viewport.width, 'x', viewport.height);
      
      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      console.log('Starting PDF render...');
      await page.render(renderContext).promise;
      console.log('PDF render completed');
      
      // Draw text overlays on top
      drawTextOverlays();
      
      setPdfLoaded(true);
      setPdfError(null);
    } catch (error) {
      console.error('Error rendering page:', error);
      setPdfError(`Failed to render page: ${error}`);
    }
  }, [zoom, drawTextOverlays]);

  const loadPDF = useCallback(async () => {
    if (!pdfUrl) return;
    
    console.log('Starting PDF load for URL:', pdfUrl);
    setIsLoading(true);
    setPdfError(null);
    setPdfLoaded(false);
    
    try {
      // Dynamically import PDF.js
      console.log('Importing PDF.js...');
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      console.log('PDF.js worker source set');
      
      // Load the PDF document
      console.log('Loading PDF document...');
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      console.log('PDF loaded successfully, pages:', pdf.numPages);
      
      // Set total pages
      setTotalPages(pdf.numPages);
      
      // Render first page
      console.log('Rendering first page...');
      await renderPage(pdf, 1);
      
      setIsLoading(false);
      console.log('PDF loading completed');
    } catch (error) {
      console.error('Error loading PDF:', error);
      setPdfError(`Failed to load PDF: ${error}`);
      setIsLoading(false);
    }
  }, [pdfUrl, renderPage]);

  useEffect(() => {
    if (pdfUrl) {
      loadPDF();
    }
  }, [pdfUrl, loadPDF]);

  useEffect(() => {
    // Extract placeholders from text overlays
    const placeholders = textOverlays
      .filter(overlay => overlay.isPlaceholder)
      .map(overlay => overlay.placeholderName);
    
    if (placeholders.length > 0) {
      onPlaceholdersExtracted(placeholders);
    }
  }, [textOverlays, onPlaceholdersExtracted]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Check if clicking on existing overlay
    const clickedOverlay = textOverlays.find(overlay => 
      overlay.page === currentPage &&
      x >= overlay.x && x <= overlay.x + overlay.width &&
      y >= overlay.y && y <= overlay.y + overlay.height
    );

    if (clickedOverlay) {
      setSelectedOverlay(clickedOverlay);
      setEditText(clickedOverlay.text);
      setIsEditing(true);
    } else {
      // Add new text overlay at click position
      setNewTextData({ 
        text: 'New Text', 
        isPlaceholder: false, 
        placeholderName: '' 
      });
      setShowAddTextModal(true);
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Create a new text overlay immediately at double-click position
    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: 'Double-click to edit',
      x: x,
      y: y,
      width: 120,
      height: 20,
      page: currentPage,
      isPlaceholder: false,
      placeholderName: ''
    };

    setTextOverlays(prev => [...prev, newOverlay]);
    setSelectedOverlay(newOverlay);
    setEditText(newOverlay.text);
    setIsEditing(true);
  };

  const addTextOverlay = () => {
    if (!newTextData.text.trim()) return;

    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: newTextData.text,
      x: 100,
      y: 100,
      width: newTextData.text.length * 8,
      height: 20,
      page: currentPage,
      isPlaceholder: newTextData.isPlaceholder,
      placeholderName: newTextData.isPlaceholder ? newTextData.placeholderName : ''
    };

    setTextOverlays(prev => [...prev, newOverlay]);
    setShowAddTextModal(false);
    setNewTextData({ text: '', isPlaceholder: false, placeholderName: '' });
    
    // Redraw overlays
    drawTextOverlays();
  };

  const updateTextOverlay = () => {
    if (!selectedOverlay) return;

    setTextOverlays(prev => prev.map(overlay => 
      overlay.id === selectedOverlay.id 
        ? { ...overlay, text: editText }
        : overlay
    ));

    setIsEditing(false);
    setSelectedOverlay(null);
    
    // Redraw overlays
    drawTextOverlays();
  };

  const deleteTextOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(overlay => overlay.id !== id));
    setSelectedOverlay(null);
    setIsEditing(false);
    
    // Redraw overlays
    drawTextOverlays();
  };

  const changePage = async (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      
      // Re-render the new page
      try {
        const pdfjsLib = await import('pdfjs-dist');
        const loadingTask = pdfjsLib.getDocument(pdfUrl!);
        const pdf = await loadingTask.promise;
        await renderPage(pdf, newPage);
      } catch (error) {
        console.error('Error changing page:', error);
      }
    }
  };

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(0.5, Math.min(3, newZoom));
    setZoom(clampedZoom);
    
    // Re-render current page with new zoom
    if (pdfUrl) {
      loadPDF();
    }
  };

  useEffect(() => {
    // Redraw overlays when they change
    if (canvasRef.current && !isLoading) {
      drawTextOverlays();
    }
  }, [textOverlays, selectedOverlay, currentPage, zoom]);

  // Show error state
  if (pdfError) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <WarningIcon size={64} className="w-16 h-16 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">PDF Loading Error</h3>
          <p className="text-red-600 mb-4">{pdfError}</p>
          <button
            onClick={loadPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <DocumentIcon size={64} className="w-16 h-16 text-blue-500" />
          </div>
          <p className="text-blue-600 text-lg mb-2">PDF Editor Ready</p>
          <p className="text-gray-600 mb-4">Upload a PDF file to start editing</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-700">
              💡 <strong>How it works:</strong><br/>
              • Upload a PDF file<br/>
              • Click anywhere to add text<br/>
              • Use {'{{'}placeholders{'}}'} like {'{{'}name{'}}'}, {'{{'}rollno{'}}'}<br/>
              • Create dynamic templates
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (!pdfLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Rendering PDF...</p>
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
              onClick={() => setShowAddTextModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Text
            </button>
            <button
              onClick={() => {
                setNewTextData({ 
                  text: 'This is a placeholder', 
                  isPlaceholder: true, 
                  placeholderName: '{{name}}' 
                });
                setShowAddTextModal(true);
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              + Add Placeholder
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                ←
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                →
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleZoomChange(zoom - 0.1)}
                className="px-3 py-1 border rounded"
              >
                -
              </button>
              <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => handleZoomChange(zoom + 0.1)}
                className="px-3 py-1 border rounded"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Display Area */}
      <div className="p-6">
        {/* Instructions */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 How to Edit Your PDF:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>Click anywhere</strong> on the PDF to add new text</li>
            <li>• <strong>Double-click anywhere</strong> to quickly add editable text</li>
            <li>• <strong>Click on existing text</strong> to edit it</li>
            <li>• <strong>Use {'{{'}placeholders{'}}'}</strong> like {'{{'}name{'}}'}, {'{{'}rollno{'}}'} for dynamic content</li>
          </ul>
        </div>
        
        <div
          ref={containerRef}
          className="flex justify-center overflow-auto"
          style={{ maxHeight: '600px' }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onDoubleClick={handleCanvasDoubleClick}
            className="border border-gray-300 cursor-crosshair"
            style={{ cursor: 'crosshair' }}
          />
        </div>
      </div>

      {/* Text Overlays List */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-3">Text Elements (Page {currentPage})</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {textOverlays
            .filter(overlay => overlay.page === currentPage)
            .map(overlay => (
              <div
                key={overlay.id}
                className={`flex items-center justify-between p-2 rounded ${
                  selectedOverlay?.id === overlay.id ? 'bg-blue-100' : 'bg-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    overlay.isPlaceholder ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {overlay.isPlaceholder ? 'Placeholder' : 'Text'}
                  </span>
                  <span className="text-sm font-mono">
                    {overlay.isPlaceholder ? overlay.placeholderName : overlay.text}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setSelectedOverlay(overlay);
                      setEditText(overlay.text);
                      setIsEditing(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTextOverlay(overlay.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add Text Modal */}
      {showAddTextModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Text Element</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Text Content</label>
                <textarea
                  value={newTextData.text}
                  onChange={(e) => setNewTextData(prev => ({ ...prev, text: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter your text content here..."
                  rows={3}
                  autoFocus
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPlaceholder"
                  checked={newTextData.isPlaceholder}
                  onChange={(e) => setNewTextData(prev => ({ ...prev, isPlaceholder: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isPlaceholder" className="text-sm">This is a placeholder</label>
              </div>

              {newTextData.isPlaceholder && (
                <div>
                  <label className="block text-sm font-medium mb-2">Placeholder Name</label>
                  <input
                    type="text"
                    value={newTextData.placeholderName}
                    onChange={(e) => setNewTextData(prev => ({ ...prev, placeholderName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., {'{{'}name{'}}'}, {'{{'}rollno{'}}'}"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddTextModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addTextOverlay}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Text Modal */}
      {isEditing && selectedOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Text Element</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Text Content</label>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={updateTextOverlay}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
