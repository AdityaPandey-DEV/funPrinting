const fs = require('fs');
const path = require('path');

// Test DOCX page counting with real DOCX file
async function testDocxPageCount() {
  console.log('🧪 Testing DOCX Page Counting with Real DOCX File...\n');

  try {
    // Check if API key is configured
    if (!process.env.CLOUDMERSIVE_API_KEY) {
      console.log('❌ CLOUDMERSIVE_API_KEY not found in environment');
      return;
    }
    console.log('✅ Cloudmersive API key configured');

    // Use an existing DOCX file from mammoth test data
    const docxPath = './node_modules/mammoth/test/test-data/tables.docx';
    
    if (!fs.existsSync(docxPath)) {
      console.log('❌ Test DOCX file not found:', docxPath);
      return;
    }

    const docxBuffer = fs.readFileSync(docxPath);
    console.log('📄 Using test DOCX file:', docxPath);
    console.log('   DOCX size:', docxBuffer.length, 'bytes');

    // Test DOCX to PDF conversion
    console.log('\n🔄 Testing DOCX to PDF conversion...');
    
    const response = await fetch('https://api.cloudmersive.com/convert/docx/to/pdf', {
      method: 'POST',
      headers: {
        'Apikey': process.env.CLOUDMERSIVE_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: docxBuffer,
    });

    if (response.ok) {
      const pdfBuffer = Buffer.from(await response.arrayBuffer());
      console.log('✅ DOCX to PDF conversion successful');
      console.log('   PDF size:', pdfBuffer.length, 'bytes');
      
      // Test PDF page counting with pdf-lib
      console.log('\n📊 Testing PDF page counting...');
      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      console.log('✅ PDF page counting successful');
      console.log('   Page count:', pageCount);
      
      // Test the parse-docx-structure API
      console.log('\n🔧 Testing parse-docx-structure API...');
      
      const formData = new FormData();
      const blob = new Blob([docxBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      formData.append('file', blob, 'test.docx');
      
      const apiResponse = await fetch('http://localhost:3000/api/parse-docx-structure', {
        method: 'POST',
        body: formData,
      });
      
      if (apiResponse.ok) {
        const result = await apiResponse.json();
        console.log('✅ parse-docx-structure API successful');
        console.log('   API page count:', result.totalPages);
        console.log('   Word count:', result.wordCount);
        console.log('   Character count:', result.charCount);
      } else {
        console.log('⚠️ parse-docx-structure API not available (server not running)');
        console.log('   Status:', apiResponse.status);
      }
      
    } else {
      console.log('❌ DOCX to PDF conversion failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('   Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDocxPageCount();
