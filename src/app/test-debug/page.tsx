'use client';

import { useState } from 'react';

export default function TestDebug() {
  const [testData, setTestData] = useState<Record<string, any>>({ Name: 'Aditya Pandey', app: 'MyApp' });
  const [placeholders, setPlaceholders] = useState<string[]>(['Name', 'app']);

  const testTemplateProcessing = async () => {
    console.log('🧪 Testing template processing...');
    console.log('🧪 Test data:', testData);
    console.log('🧪 Placeholders:', placeholders);
    
    // Create a simple test DOCX buffer
    const testDocxBuffer = 'UEsDBBQAAAAIAA==';
    
    try {
      const response = await fetch('/api/templates/preview-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docxBuffer: testDocxBuffer,
          formData: testData,
          placeholders: placeholders
        }),
      });

      const result = await response.json();
      console.log('🧪 Template processing result:', result);
    } catch (error) {
      console.error('🧪 Template processing error:', error);
    }
  };

  const testDataMapping = () => {
    console.log('🧪 Testing data mapping...');
    console.log('🧪 Test data:', testData);
    console.log('🧪 Placeholders:', placeholders);
    
    // Simulate what the template processor does
    const documentPlaceholders = ['{{Name}}', '{{app}}'];
    console.log('🧪 Document placeholders:', documentPlaceholders);
    
    documentPlaceholders.forEach(placeholder => {
      const key = placeholder.replace(/[{}]/g, '');
      console.log(`🔍 Placeholder: ${placeholder} -> Key: ${key}`);
      if (testData[key]) {
        console.log(`✅ Data found for ${key}: ${testData[key]}`);
      } else {
        console.warn(`⚠️ Missing data for ${key}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Template Processing</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Data</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name:
              </label>
              <input
                type="text"
                value={testData.Name || ''}
                onChange={(e) => setTestData(prev => ({ ...prev, Name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App:
              </label>
              <input
                type="text"
                value={testData.app || ''}
                onChange={(e) => setTestData(prev => ({ ...prev, app: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter app name"
              />
            </div>
          </div>
          
          <div className="space-x-4">
            <button
              onClick={testDataMapping}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Test Data Mapping
            </button>
            
            <button
              onClick={testTemplateProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Test Template Processing
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Form Data:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm">
                {JSON.stringify(testData, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Placeholders:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm">
                {JSON.stringify(placeholders, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Expected Behavior</h2>
          <div className="space-y-2 text-gray-700">
            <p><strong>Document contains:</strong> &quot;Hello {`{{Name}}`}, welcome to {`{{app}}`}!&quot;</p>
            <p><strong>Form data:</strong> {JSON.stringify(testData)}</p>
            <p><strong>Expected result:</strong> &quot;Hello {testData.Name}, welcome to {testData.app}!&quot;</p>
          </div>
        </div>
      </div>
    </div>
  );
}
