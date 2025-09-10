const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testAPIResponse() {
  try {
    // Create a test PDF file
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
/Length 200
>>
stream
BT
/F1 12 Tf
72 720 Td
(Computer Science Syllabus) Tj
0 -20 Td
(Department: @department) Tj
0 -20 Td
(Course: @courseName) Tj
0 -20 Td
(Instructor: @instructorName) Tj
0 -20 Td
(Student Name: @studentName) Tj
0 -20 Td
(Roll Number: @rollNumber) Tj
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
453
%%EOF`;

    // Write test PDF to file
    fs.writeFileSync('test.pdf', testPdfContent);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test.pdf'));
    
    console.log('📤 Sending PDF to API...');
    
    // Send to API
    const response = await fetch('http://localhost:3001/api/convert-pdf-to-word', {
      method: 'POST',
      body: formData,
    });
    
    console.log('📥 API Response Status:', response.status);
    console.log('📥 API Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.json();
    
    console.log('\n📋 FULL API RESPONSE:');
    console.log('==================');
    console.log(JSON.stringify(responseData, null, 2));
    
    console.log('\n📊 RESPONSE ANALYSIS:');
    console.log('====================');
    console.log('Success:', responseData.success);
    console.log('Message:', responseData.message);
    console.log('Conversion Method:', responseData.conversionMethod);
    
    if (responseData.wordContent) {
      console.log('\n📄 WORD CONTENT:');
      console.log('Total Paragraphs:', responseData.wordContent.totalParagraphs);
      console.log('Paragraphs Array Length:', responseData.wordContent.paragraphs?.length || 0);
      console.log('Placeholders:', responseData.wordContent.placeholders);
      console.log('Has DOCX Buffer:', !!responseData.wordContent.docxBuffer);
      console.log('DOCX Buffer Length:', responseData.wordContent.docxBuffer?.length || 0);
      console.log('Has Full HTML:', !!responseData.wordContent.fullHtml);
      console.log('Full HTML Length:', responseData.wordContent.fullHtml?.length || 0);
      
      if (responseData.wordContent.paragraphs && responseData.wordContent.paragraphs.length > 0) {
        console.log('\n📝 FIRST FEW PARAGRAPHS:');
        responseData.wordContent.paragraphs.slice(0, 5).forEach((p, i) => {
          console.log(`${i + 1}. [${p.style}] ${p.text.substring(0, 100)}${p.text.length > 100 ? '...' : ''}`);
        });
      }
      
      if (responseData.wordContent.fullHtml) {
        console.log('\n🌐 HTML PREVIEW (first 500 chars):');
        console.log(responseData.wordContent.fullHtml.substring(0, 500));
      }
    }
    
    // Clean up
    fs.unlinkSync('test.pdf');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPIResponse();
