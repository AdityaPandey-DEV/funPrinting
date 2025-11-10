'use client';

import { useState } from 'react';

export default function TestPlaceholder() {
  const [testData, setTestData] = useState<Record<string, any>>({});
  const [placeholders, setPlaceholders] = useState<string[]>(['Name']);

  const testTemplate = async () => {
    console.log('🧪 Testing template with data:', testData);
    console.log('🧪 Placeholders:', placeholders);
    
    // Create a simple test DOCX with {{Name}} placeholder
    const testDocxContent = `
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:t>Hello {{Name}}, welcome to our system!</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:document>
    `;
    
    // Convert to base64 (simplified)
    const testDocxBuffer = btoa(testDocxContent);
    
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
      console.log('🧪 Template result:', result);
    } catch (error) {
      console.error('🧪 Template error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Placeholder Replacement</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Data</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name:
            </label>
            <input
              type="text"
              value={testData.Name || ''}
              onChange={(e) => setTestData(prev => ({ ...prev, Name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter name (e.g., Aditya Pandey)"
            />
          </div>
          
          <button
            onClick={testTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Test Template
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Current Data</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
            {JSON.stringify(testData, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Expected Behavior</h2>
          <p className="text-gray-700 mb-2">
            <strong>Document contains:</strong> &quot;Hello {'{{'}Name{'}}'}, welcome to our system!&quot;
          </p>
          <p className="text-gray-700 mb-2">
            <strong>Form data:</strong> {JSON.stringify(testData)}
          </p>
          <p className="text-gray-700">
            <strong>Expected result:</strong> &quot;Hello {testData.Name || `{{Name}}`}, welcome to our system!&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
