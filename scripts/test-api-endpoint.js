const fetch = require('node-fetch');
const FormData = require('form-data');

// Test the actual API endpoint
async function testApiEndpoint() {
  console.log('🧪 Testing API Endpoint Directly...\n');

  try {
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

    // Create FormData
    const formData = new FormData();
    formData.append('file', simplePdf, {
      filename: 'test.pdf',
      contentType: 'application/pdf'
    });

    console.log('📄 Testing PDF to DOCX conversion via API endpoint...');
    console.log('   PDF size:', simplePdf.length, 'bytes');

    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/convert-pdf-to-word', {
      method: 'POST',
      body: formData
    });

    console.log('📊 API Response Status:', response.status, response.statusText);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ API conversion successful!');
      console.log('   Success:', result.success);
      console.log('   Conversion Method:', result.conversionMethod);
      console.log('   Message:', result.message);
      
      if (result.wordContent) {
        console.log('   Word Content:');
        console.log('     - Paragraphs:', result.wordContent.paragraphs?.length || 0);
        console.log('     - Placeholders:', result.wordContent.placeholders?.length || 0);
        console.log('     - Placeholder List:', result.wordContent.placeholders || []);
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ API conversion failed!');
      console.log('   Error:', errorData.error || 'Unknown error');
      console.log('   Details:', errorData.details || 'No details provided');
      console.log('   Message:', errorData.message || 'No message provided');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testApiEndpoint();
}

module.exports = { testApiEndpoint };
