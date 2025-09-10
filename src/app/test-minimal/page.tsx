'use client';

import { useState } from 'react';

export default function TestMinimal() {
  const [formData, setFormData] = useState<Record<string, any>>({ Name: 'Aditya Pandey' });
  const [placeholders, setPlaceholders] = useState<string[]>(['Name']);

  const testDirectAPI = async () => {
    console.log('🧪 Testing direct API call...');
    console.log('🧪 Form data:', formData);
    console.log('🧪 Placeholders:', placeholders);
    
    // Create a simple test DOCX buffer (this is just a placeholder)
    const testDocxBuffer = 'UEsDBBQAAAAIAA==';
    
    try {
      const response = await fetch('/api/templates/preview-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docxBuffer: testDocxBuffer,
          formData: formData,
          placeholders: placeholders
        }),
      });

      const result = await response.json();
      console.log('🧪 API Response:', result);
    } catch (error) {
      console.error('🧪 API Error:', error);
    }
  };

  const testFormDataChange = () => {
    console.log('🧪 Testing form data change...');
    const newData = { Name: 'John Doe', Date: '2024-01-15' };
    setFormData(newData);
    console.log('🧪 New form data set:', newData);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Minimal Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Form Data:
            </label>
            <pre className="bg-gray-100 p-3 rounded text-sm">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Placeholders:
            </label>
            <pre className="bg-gray-100 p-3 rounded text-sm">
              {JSON.stringify(placeholders, null, 2)}
            </pre>
          </div>
          
          <div className="space-x-4">
            <button
              onClick={testDirectAPI}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Test Direct API
            </button>
            
            <button
              onClick={testFormDataChange}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Change Form Data
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Open browser console (F12)</li>
            <li>Click &quot;Test Direct API&quot; to test the API endpoint</li>
            <li>Click &quot;Change Form Data&quot; to test form data updates</li>
            <li>Check console logs for detailed information</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
