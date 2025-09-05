const fetch = require('node-fetch');

// Test Cloudmersive API directly
async function testCloudmersiveDirect() {
  console.log('🧪 Testing Cloudmersive API Directly...\n');

  const apiKey = process.env.CLOUDMERSIVE_API_KEY;
  
  if (!apiKey) {
    console.log('❌ CLOUDMERSIVE_API_KEY not found in environment');
    return;
  }

  console.log('✅ Cloudmersive API key found:', apiKey.substring(0, 8) + '...');

  try {
    // Test 1: Check API usage
    console.log('\n1️⃣ Testing API usage endpoint...');
    const usageResponse = await fetch('https://api.cloudmersive.com/convert/validate/get-api-usage', {
      method: 'POST',
      headers: {
        'Apikey': apiKey,
      },
    });

    if (usageResponse.ok) {
      const usageData = await usageResponse.json();
      console.log('✅ API connectivity successful');
      console.log('📊 Usage info:', JSON.stringify(usageData, null, 2));
    } else {
      console.log('❌ API usage check failed:', usageResponse.status, usageResponse.statusText);
      const errorText = await usageResponse.text();
      console.log('Error details:', errorText);
    }

    // Test 2: Test PDF to DOCX conversion with a simple PDF
    console.log('\n2️⃣ Testing PDF to DOCX conversion...');
    
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

    const convertResponse = await fetch('https://api.cloudmersive.com/convert/pdf/to/docx', {
      method: 'POST',
      headers: {
        'Apikey': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: simplePdf,
    });

    if (convertResponse.ok) {
      const docxBuffer = await convertResponse.buffer();
      console.log('✅ PDF to DOCX conversion successful');
      console.log('📄 Generated DOCX size:', docxBuffer.length, 'bytes');
      
      // Test DOCX to PDF conversion
      console.log('\n3️⃣ Testing DOCX to PDF conversion...');
      const pdfResponse = await fetch('https://api.cloudmersive.com/convert/docx/to/pdf', {
        method: 'POST',
        headers: {
          'Apikey': apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: docxBuffer,
      });

      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.buffer();
        console.log('✅ DOCX to PDF conversion successful');
        console.log('📄 Generated PDF size:', pdfBuffer.length, 'bytes');
      } else {
        console.log('❌ DOCX to PDF conversion failed:', pdfResponse.status, pdfResponse.statusText);
        const errorText = await pdfResponse.text();
        console.log('Error details:', errorText);
      }
    } else {
      console.log('❌ PDF to DOCX conversion failed:', convertResponse.status, convertResponse.statusText);
      const errorText = await convertResponse.text();
      console.log('Error details:', errorText);
    }

    console.log('\n🎉 Cloudmersive API test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testCloudmersiveDirect();
}

module.exports = { testCloudmersiveDirect };
