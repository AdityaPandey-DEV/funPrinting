'use client';

import { useState } from 'react';

export default function DebugSimple() {
  const [testData, setTestData] = useState<Record<string, any>>({ Name: 'Aditya Pandey' });
  const [placeholders, setPlaceholders] = useState<string[]>(['Name']);

  const testDocxProcessing = async () => {
    console.log('🧪 Testing DOCX processing...');
    console.log('🧪 Test data:', testData);
    console.log('🧪 Placeholders:', placeholders);
    
    // Create a minimal valid DOCX buffer for testing
    // This is a minimal DOCX file with {{Name}} placeholder
    const minimalDocx = `UEsDBBQAAAAIAA==`; // This is just a test - we need a real DOCX
    
    try {
      // Test the docxProcessor directly
      const response = await fetch('/api/templates/preview-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docxBuffer: minimalDocx,
          formData: testData,
          placeholders
        }),
      });

      const result = await response.json();
      console.log('🧪 Processing result:', result);
    } catch (error) {
      console.error('🧪 Processing error:', error);
    }
  };

  const testPlaceholderExtraction = async () => {
    console.log('🧪 Testing placeholder extraction...');
    
    // Create a simple text with placeholders
    const testText = 'Hello {{Name}}, today is {{Date}}, and you are in {{Course}} course.';
    console.log('🧪 Test text:', testText);
    
    // Extract placeholders using the same regex - require placeholder to start with a letter
    const placeholderRegex = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;
    const matches = testText.match(placeholderRegex) || [];
    console.log('🧪 Found matches:', matches);
    
    const extractedPlaceholders = [...new Set(
      matches
        .map(match => {
          const matchResult = match.match(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/);
          return matchResult ? matchResult[1] : '';
        })
        .filter(placeholder => placeholder.length > 0)
    )];
    
    console.log('🧪 Extracted placeholders:', extractedPlaceholders);
    
    // Test data mapping
    const testData: Record<string, string> = { Name: 'Aditya Pandey', Date: '2024-01-15', Course: 'Computer Science' };
    console.log('🧪 Test data:', testData);
    
    // Check if all placeholders have data
    extractedPlaceholders.forEach((placeholder: string) => {
      if (testData[placeholder]) {
        console.log(`✅ Data found for ${placeholder}: ${testData[placeholder]}`);
      } else {
        console.warn(`⚠️ Missing data for ${placeholder}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Simple Debug Test</h1>
        
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
              placeholder="Enter name"
            />
          </div>
          
          <div className="space-x-4">
            <button
              onClick={testPlaceholderExtraction}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Test Placeholder Extraction
            </button>
            
            <button
              onClick={testDocxProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Test DOCX Processing
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Current Data</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
            {JSON.stringify(testData, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Click &quot;Test Placeholder Extraction&quot; to see how placeholders are extracted</li>
            <li>Check the console for detailed logs</li>
            <li>Verify that the data mapping is working correctly</li>
            <li>Click &quot;Test DOCX Processing&quot; to test the full pipeline</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
