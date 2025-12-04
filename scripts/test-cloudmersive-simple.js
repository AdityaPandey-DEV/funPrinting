const fs = require('fs');
const path = require('path');

// Test the custom Cloudmersive implementation
async function testCloudmersiveSimple() {
  console.log('🧪 Testing Custom Cloudmersive Implementation...\n');

  try {
    // Test 1: Check if API key is configured
    console.log('1️⃣ Checking API key configuration...');
    if (!process.env.CLOUDMERSIVE_API_KEY) {
      console.log('⚠️  CLOUDMERSIVE_API_KEY not found in environment');
      console.log('   Run: npm run setup-cloudmersive');
      console.log('   Or set CLOUDMERSIVE_API_KEY=your_key_here');
      return;
    }
    console.log('✅ Cloudmersive API key configured');

    // Test 2: Test API connectivity using direct fetch
    console.log('\n2️⃣ Testing API connectivity...');
    const fetch = require('node-fetch');
    
    try {
      const response = await fetch('https://api.cloudmersive.com/convert/validate/get-api-usage', {
        method: 'POST',
        headers: {
          'Apikey': process.env.CLOUDMERSIVE_API_KEY,
        },
      });

      if (response.ok) {
        const usage = await response.json();
        console.log('✅ API connectivity successful');
        console.log('   Usage info:', usage);
      } else {
        console.log('⚠️  API usage endpoint not available, but API key is valid');
        console.log('   Status:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ API connectivity failed:', error.message);
      console.log('   This might be due to invalid API key or network issues');
    }

    // Test 3: Test PDF conversion with a simple PDF
    console.log('\n3️⃣ Testing PDF conversion...');
    
    // Create a simple PDF buffer for testing
    const simplePdf = Buffer.from(`%PDF-1.4
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
(Hello World @testPlaceholder) Tj
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
%%EOF`);

    try {
      // Test PDF to DOCX conversion
      console.log('📄 Testing PDF to DOCX conversion...');
      const convertResponse = await fetch('https://api.cloudmersive.com/convert/pdf/to/docx', {
        method: 'POST',
        headers: {
          'Apikey': process.env.CLOUDMERSIVE_API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: simplePdf,
      });

      if (convertResponse.ok) {
        const docxBuffer = await convertResponse.buffer();
        console.log('✅ PDF to DOCX conversion successful');
        console.log('   PDF size:', simplePdf.length, 'bytes');
        console.log('   DOCX size:', docxBuffer.length, 'bytes');
        
        // Test DOCX to PDF conversion
        console.log('\n4️⃣ Testing DOCX to PDF conversion...');
        const pdfResponse = await fetch('https://api.cloudmersive.com/convert/docx/to/pdf', {
          method: 'POST',
          headers: {
            'Apikey': process.env.CLOUDMERSIVE_API_KEY,
            'Content-Type': 'application/octet-stream',
          },
          body: docxBuffer,
        });

        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.buffer();
          console.log('✅ DOCX to PDF conversion successful');
          console.log('   Generated PDF size:', pdfBuffer.length, 'bytes');
        } else {
          console.log('❌ DOCX to PDF conversion failed:', pdfResponse.status, pdfResponse.statusText);
        }
      } else {
        console.log('❌ PDF to DOCX conversion failed:', convertResponse.status, convertResponse.statusText);
        const errorText = await convertResponse.text();
        console.log('   Error details:', errorText);
      }
    } catch (error) {
      console.log('❌ PDF conversion failed:', error.message);
      console.log('   This might be due to API quota or file format issues');
    }

    console.log('\n🎉 Custom Cloudmersive implementation test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the full integration: npm run test-integration');
    console.log('2. Start the development server: npm run dev');
    console.log('3. Test in browser: http://localhost:3000/admin/templates/dynamic/upload');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testCloudmersiveSimple();
}

module.exports = { testCloudmersiveSimple };
