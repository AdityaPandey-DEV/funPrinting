const fs = require('fs');
const path = require('path');

// Test DOCX page counting with Cloudmersive API
async function testDocxPageCount() {
  console.log('🧪 Testing DOCX Page Counting with Cloudmersive API...\n');

  try {
    // Check if API key is configured
    if (!process.env.CLOUDMERSIVE_API_KEY) {
      console.log('❌ CLOUDMERSIVE_API_KEY not found in environment');
      return;
    }
    console.log('✅ Cloudmersive API key configured');

    // Create a simple DOCX file for testing
    console.log('\n📄 Creating test DOCX file...');
    
    // This is a minimal DOCX structure for testing
    const testDocxContent = Buffer.from([
      0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00,
      // Add more bytes to make it a valid DOCX structure
      ...Array(1000).fill(0x20) // Fill with spaces to simulate content
    ]);

    // Test DOCX to PDF conversion
    console.log('🔄 Testing DOCX to PDF conversion...');
    
    const response = await fetch('https://api.cloudmersive.com/convert/docx/to/pdf', {
      method: 'POST',
      headers: {
        'Apikey': process.env.CLOUDMERSIVE_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: testDocxContent,
    });

    if (response.ok) {
      const pdfBuffer = await response.buffer();
      console.log('✅ DOCX to PDF conversion successful');
      console.log('   DOCX size:', testDocxContent.length, 'bytes');
      console.log('   PDF size:', pdfBuffer.length, 'bytes');
      
      // Test PDF page counting with pdf-lib
      console.log('\n📊 Testing PDF page counting...');
      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      console.log('✅ PDF page counting successful');
      console.log('   Page count:', pageCount);
      
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


