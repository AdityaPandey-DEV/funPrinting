const fs = require('fs');
const path = require('path');

// Test DOCX page counting with Computer-Networks-Lab.docx
async function testComputerNetworksLab() {
  console.log('🧪 Testing DOCX Page Counting with Computer-Networks-Lab.docx...\n');

  try {
    // Check if API key is configured
    if (!process.env.CLOUDMERSIVE_API_KEY) {
      console.log('❌ CLOUDMERSIVE_API_KEY not found in environment');
      return;
    }
    console.log('✅ Cloudmersive API key configured');

    // Use the Computer-Networks-Lab.docx file
    const docxPath = './Computer-Networks-Lab.docx';
    
    if (!fs.existsSync(docxPath)) {
      console.log('❌ Computer-Networks-Lab.docx file not found:', docxPath);
      return;
    }

    const docxBuffer = fs.readFileSync(docxPath);
    console.log('📄 Using Computer-Networks-Lab.docx');
    console.log('   File size:', docxBuffer.length, 'bytes');
    console.log('   File size (MB):', (docxBuffer.length / 1024 / 1024).toFixed(2), 'MB');

    // Test DOCX to PDF conversion
    console.log('\n🔄 Converting DOCX to PDF using Cloudmersive API...');
    
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
      console.log('   PDF size (MB):', (pdfBuffer.length / 1024 / 1024).toFixed(2), 'MB');
      
      // Test PDF page counting with pdf-lib
      console.log('\n📊 Counting pages in converted PDF...');
      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      console.log('✅ PDF page counting successful');
      console.log('   📄 ACTUAL PAGE COUNT:', pageCount);
      
      // Also test with mammoth to get text content for comparison
      console.log('\n📝 Extracting text content for analysis...');
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      const text = result.value;
      
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      const charCount = text.length;
      const paragraphCount = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
      
      console.log('📊 Document Analysis:');
      console.log('   Word count:', wordCount);
      console.log('   Character count:', charCount);
      console.log('   Paragraph count:', paragraphCount);
      
      // Estimate pages using our algorithm
      const wordsPerPage = 225;
      const charsPerPage = 900;
      const paragraphsPerPage = 2.5;
      
      const estimatedPagesByWords = Math.max(1, Math.ceil(wordCount / wordsPerPage));
      const estimatedPagesByChars = Math.max(1, Math.ceil(charCount / charsPerPage));
      const estimatedPagesByParagraphs = Math.max(1, Math.ceil(paragraphCount / paragraphsPerPage));
      
      console.log('\n📈 Page Estimation Comparison:');
      console.log('   Actual pages (Cloudmersive):', pageCount);
      console.log('   Estimated by words:', estimatedPagesByWords);
      console.log('   Estimated by characters:', estimatedPagesByChars);
      console.log('   Estimated by paragraphs:', estimatedPagesByParagraphs);
      
      const estimates = [estimatedPagesByWords, estimatedPagesByChars, estimatedPagesByParagraphs];
      estimates.sort((a, b) => a - b);
      const medianEstimate = estimates[Math.floor(estimates.length / 2)];
      console.log('   Median estimate:', medianEstimate);
      
      const accuracy = Math.abs(pageCount - medianEstimate) / pageCount * 100;
      console.log('   Estimation accuracy:', (100 - accuracy).toFixed(1) + '%');
      
    } else {
      console.log('❌ DOCX to PDF conversion failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('   Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testComputerNetworksLab();


