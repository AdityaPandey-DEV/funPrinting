const fs = require('fs');
const fetch = require('node-fetch');

async function testCloudmersiveDocxConversion() {
  try {
    console.log('🔍 Testing Cloudmersive PDF→DOCX conversion directly...');
    
    // Create a simple test PDF buffer (same as in the logs)
    const testPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Computer Science Syllabus) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

    const pdfBuffer = Buffer.from(testPdfContent, 'utf8');
    console.log('📄 Test PDF buffer size:', pdfBuffer.length, 'bytes');
    
    // Test PDF→DOCX conversion
    console.log('🔄 Calling Cloudmersive PDF→DOCX API...');
    const response = await fetch('https://api.cloudmersive.com/convert/pdf/to/docx', {
      method: 'POST',
      headers: {
        'Apikey': '7c36c419-d157-4bc0-a1ac-02d4fe3fb767',
        'Content-Type': 'application/octet-stream',
      },
      body: pdfBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cloudmersive API error:', response.status, errorText);
      return;
    }

    const docxBuffer = Buffer.from(await response.arrayBuffer());
    console.log('✅ DOCX conversion successful');
    console.log('📄 DOCX buffer size:', docxBuffer.length, 'bytes');
    
    // Save the DOCX file for inspection
    fs.writeFileSync('test-cloudmersive-output.docx', docxBuffer);
    console.log('💾 Saved DOCX file: test-cloudmersive-output.docx');
    
    // Check DOCX content using mammoth
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    console.log('📖 DOCX text content length:', result.value.length);
    console.log('📖 DOCX text content:', result.value);
    
    if (result.value.length === 0) {
      console.log('🚨 ISSUE CONFIRMED: Cloudmersive creates empty DOCX files!');
      console.log('💡 This is why all pages appear empty in the download');
    } else {
      console.log('✅ DOCX contains content');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCloudmersiveDocxConversion();
