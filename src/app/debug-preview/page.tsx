'use client';

import { useState } from 'react';

export default function DebugPreview() {
  const [testData, setTestData] = useState<Record<string, any>>({});
  const [placeholders, setPlaceholders] = useState<string[]>(['Name', 'Date', 'Course']);

  const handleInputChange = (key: string, value: string) => {
    setTestData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const testPreview = async () => {
    console.log('🧪 Testing preview with data:', testData);
    console.log('🧪 Placeholders:', placeholders);
    
    // Create a simple test DOCX buffer (this would normally come from file upload)
    const testDocxBuffer = 'UEsDBBQAAAAIAA=='; // This is a minimal base64 DOCX
    
    try {
      const response = await fetch('/api/templates/preview-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docxBuffer: testDocxBuffer,
          formData: testData,
          placeholders
        }),
      });

      const result = await response.json();
      console.log('🧪 Preview result:', result);
    } catch (error) {
      console.error('🧪 Preview error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Preview</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Data</h2>
          
          {placeholders.map((placeholder, index) => (
            <div key={index} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {placeholder}:
              </label>
              <input
                type="text"
                value={testData[placeholder] || ''}
                onChange={(e) => handleInputChange(placeholder, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter value for ${placeholder}`}
              />
            </div>
          ))}
          
          <button
            onClick={testPreview}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Test Preview
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Current Data</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
            {JSON.stringify(testData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
