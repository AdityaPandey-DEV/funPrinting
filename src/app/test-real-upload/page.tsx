'use client';

import { useState } from 'react';

export default function TestRealUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [docxBuffer, setDocxBuffer] = useState<string | null>(null);
  const [uploadLogs, setUploadLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setUploadLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    addLog(`Selected file: ${selectedFile.name} (${selectedFile.size} bytes)`);

    try {
      // Convert file to base64 safely
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      addLog(`ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
      addLog(`Uint8Array size: ${uint8Array.length} bytes`);
      
      // Convert to base64 in chunks to avoid call stack overflow
      let binaryString = '';
      const chunkSize = 8192; // Process in 8KB chunks
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64 = btoa(binaryString);
      addLog(`Base64 length: ${base64.length} characters`);
      addLog(`Base64 first 100 chars: ${base64.substring(0, 100)}`);
      
      setDocxBuffer(base64);
      addLog('✅ File converted to base64 successfully');
      
      // Test the buffer with the API
      addLog('🧪 Testing with API...');
      const response = await fetch('/api/templates/preview-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docxBuffer: base64,
          formData: { Name: 'Aditya Pandey', app: 'MyApp' },
          placeholders: ['Name', 'app']
        }),
      });

      const result = await response.json();
      if (result.success) {
        addLog('✅ API test successful!');
        addLog(`Preview URL: ${result.previewUrl}`);
      } else {
        addLog(`❌ API test failed: ${result.error}`);
      }
      
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Real File Upload</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload Your Real DOCX File</h2>
          
          <input
            type="file"
            accept=".docx,.doc"
            onChange={handleFileUpload}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
          />
          
          {file && (
            <div className="mb-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">File Selected:</h3>
              <p className="text-green-700">Name: {file.name}</p>
              <p className="text-green-700">Size: {file.size} bytes</p>
              <p className="text-green-700">Type: {file.type}</p>
            </div>
          )}
          
          {docxBuffer && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Base64 Buffer:</h3>
              <p className="text-blue-700">Length: {docxBuffer.length} characters</p>
              <p className="text-blue-700">First 100 chars: {docxBuffer.substring(0, 100)}</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Logs</h2>
          <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
            {uploadLogs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Upload a file to see the process.</p>
            ) : (
              uploadLogs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Expected Results</h2>
          <div className="space-y-2 text-gray-700">
            <p><strong>For a real DOCX file (~200KB):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Base64 length should be ~280K characters</li>
              <li>First 100 chars should start with &quot;UEsDBBQAAAAIAA==&quot; or similar</li>
              <li>API test should succeed</li>
              <li>Preview should be generated</li>
            </ul>
            <p className="mt-4"><strong>If you see 16 characters:</strong> The file upload is not working correctly</p>
          </div>
        </div>
      </div>
    </div>
  );
}
