'use client';

import { useState } from 'react';

export default function TestPlaceholderFix() {
  const [testData, setTestData] = useState<Record<string, any>>({ Name: 'Aditya Pandey', app: 'MyApp' });
  const [placeholders, setPlaceholders] = useState<string[]>(['Name', 'app']);

  const testPlaceholderMapping = () => {
    console.log('🧪 Testing placeholder mapping...');
    console.log('🧪 Test data:', testData);
    console.log('🧪 Placeholders:', placeholders);
    
    // Simulate what happens in the document
    const documentPlaceholders = ['{{Name}}', '{{app}}'];
    console.log('🧪 Document placeholders:', documentPlaceholders);
    
    // Create mapping like the fixed code does
    const placeholderMapping: Record<string, any> = {};
    
    documentPlaceholders.forEach(placeholder => {
      const key = placeholder.replace(/[{}]/g, '');
      console.log(`🔍 Processing placeholder: ${placeholder} -> key: ${key}`);
      
      if (testData[key]) {
        placeholderMapping[key] = testData[key];
        console.log(`✅ Data found for ${key}: ${testData[key]}`);
      } else {
        console.warn(`⚠️ Missing data for placeholder: ${key}`);
        console.warn(`⚠️ Available data keys: ${Object.keys(testData).join(', ')}`);
        
        // Try case-insensitive matching
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(testData).find(k => k.toLowerCase() === lowerKey);
        if (foundKey) {
          placeholderMapping[key] = testData[foundKey];
          console.log(`✅ Found case-insensitive match: ${key} -> ${foundKey}: ${testData[foundKey]}`);
        }
      }
    });
    
    console.log('🧪 Final placeholder mapping:', placeholderMapping);
    console.log('🧪 Mapping keys:', Object.keys(placeholderMapping));
    console.log('🧪 Mapping values:', Object.values(placeholderMapping));
  };

  const testWithDifferentCase = () => {
    console.log('🧪 Testing with different case...');
    const testDataWithCase: Record<string, string> = { name: 'Aditya Pandey', APP: 'MyApp' };
    console.log('🧪 Test data with different case:', testDataWithCase);
    
    const documentPlaceholders = ['{{Name}}', '{{app}}'];
    const placeholderMapping: Record<string, any> = {};
    
    documentPlaceholders.forEach((placeholder: string) => {
      const key = placeholder.replace(/[{}]/g, '');
      console.log(`🔍 Processing placeholder: ${placeholder} -> key: ${key}`);
      
      if (testDataWithCase[key]) {
        placeholderMapping[key] = testDataWithCase[key];
        console.log(`✅ Exact match found for ${key}: ${testDataWithCase[key]}`);
      } else {
        console.warn(`⚠️ No exact match for ${key}`);
        
        // Try case-insensitive matching
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(testDataWithCase).find(k => k.toLowerCase() === lowerKey);
        if (foundKey) {
          placeholderMapping[key] = testDataWithCase[foundKey];
          console.log(`✅ Case-insensitive match: ${key} -> ${foundKey}: ${testDataWithCase[foundKey]}`);
        } else {
          console.error(`❌ No match found for ${key}`);
        }
      }
    });
    
    console.log('🧪 Final mapping with case handling:', placeholderMapping);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Placeholder Fix</h1>
        
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
              onClick={testPlaceholderMapping}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Test Placeholder Mapping
            </button>
            
            <button
              onClick={testWithDifferentCase}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Test Case Handling
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
            <p><strong>Key insight:</strong> The mapping should convert {`{{Name}}`} → Name key in form data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
