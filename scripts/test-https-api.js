#!/usr/bin/env node

/**
 * Test script for HTTPS API PDF operations
 * This script tests the HTTPS API endpoints for PDF upload, fetch, and conversion
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const TEST_PDF_PATH = path.join(__dirname, '..', 'Resources.pdf');

async function testHTTPSAPI() {
  console.log('🧪 Testing HTTPS API for PDF Operations...\n');

  try {
    // Test 1: PDF Upload via HTTPS API
    console.log('📤 Test 1: PDF Upload via HTTPS API');
    console.log('=====================================');
    
    if (!fs.existsSync(TEST_PDF_PATH)) {
      console.log('❌ Test PDF file not found at:', TEST_PDF_PATH);
      console.log('   Please ensure Resources.pdf exists in the project root');
      return;
    }

    const pdfBuffer = fs.readFileSync(TEST_PDF_PATH);
    console.log(`✅ Test PDF loaded: ${pdfBuffer.length} bytes`);

    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: 'test.pdf',
      contentType: 'application/pdf'
    });
    formData.append('metadata', JSON.stringify({
      folder: 'test-uploads',
      description: 'Test PDF for HTTPS API'
    }));

    const uploadResponse = await fetch(`${BASE_URL}/api/pdf/upload`, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`PDF upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ PDF uploaded successfully via HTTPS API');
    console.log(`   File ID: ${uploadResult.fileId}`);
    console.log(`   PDF URL: ${uploadResult.pdfUrl}`);
    console.log(`   File Size: ${uploadResult.fileSize} bytes`);

    // Test 2: PDF Fetch via HTTPS API
    console.log('\n📥 Test 2: PDF Fetch via HTTPS API');
    console.log('=====================================');

    const fetchResponse = await fetch(`${BASE_URL}/api/pdf/fetch?url=${encodeURIComponent(uploadResult.pdfUrl)}`);
    
    if (!fetchResponse.ok) {
      throw new Error(`PDF fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
    }

    const fetchedPdfBuffer = await fetchResponse.buffer();
    console.log('✅ PDF fetched successfully via HTTPS API');
    console.log(`   Fetched size: ${fetchedPdfBuffer.length} bytes`);

    // Test 3: PDF Metadata via HTTPS API
    console.log('\n📊 Test 3: PDF Metadata via HTTPS API');
    console.log('=====================================');

    const metadataResponse = await fetch(`${BASE_URL}/api/pdf/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pdfUrl: uploadResult.pdfUrl,
        fileId: uploadResult.fileId
      })
    });

    if (!metadataResponse.ok) {
      throw new Error(`PDF metadata fetch failed: ${metadataResponse.status} ${metadataResponse.statusText}`);
    }

    const metadataResult = await metadataResponse.json();
    console.log('✅ PDF metadata fetched successfully via HTTPS API');
    console.log(`   File Size: ${metadataResult.metadata.size} bytes`);
    console.log(`   Content Type: ${metadataResult.metadata.type}`);
    console.log(`   Last Modified: ${metadataResult.metadata.lastModified}`);

    // Test 4: PDF to Word Conversion via HTTPS API
    console.log('\n🔄 Test 4: PDF to Word Conversion via HTTPS API');
    console.log('===============================================');

    const convertFormData = new FormData();
    convertFormData.append('pdfUrl', uploadResult.pdfUrl);

    const convertResponse = await fetch(`${BASE_URL}/api/convert-pdf-to-word`, {
      method: 'POST',
      body: convertFormData
    });

    if (!convertResponse.ok) {
      throw new Error(`PDF to Word conversion failed: ${convertResponse.status} ${convertResponse.statusText}`);
    }

    const convertResult = await convertResponse.json();
    console.log('✅ PDF to Word conversion successful via HTTPS API');
    console.log(`   Placeholders found: ${convertResult.wordContent.placeholders.length}`);
    console.log(`   Total paragraphs: ${convertResult.wordContent.totalParagraphs}`);

    // Test 5: Word to PDF Conversion via HTTPS API
    console.log('\n📄 Test 5: Word to PDF Conversion via HTTPS API');
    console.log('===============================================');

    // Create a simple Word document for testing
    const testWordContent = Buffer.from('Test Word Document Content for HTTPS API');
    const wordFormData = new FormData();
    wordFormData.append('wordFile', testWordContent, {
      filename: 'test.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const wordToPdfResponse = await fetch(`${BASE_URL}/api/convert-word-to-pdf`, {
      method: 'POST',
      body: wordFormData
    });

    if (!wordToPdfResponse.ok) {
      throw new Error(`Word to PDF conversion failed: ${wordToPdfResponse.status} ${wordToPdfResponse.statusText}`);
    }

    const pdfResult = await wordToPdfResponse.buffer();
    console.log('✅ Word to PDF conversion successful via HTTPS API');
    console.log(`   Generated PDF size: ${pdfResult.length} bytes`);

    // Test 6: Dynamic Form Generation via HTTPS API
    console.log('\n📝 Test 6: Dynamic Form Generation via HTTPS API');
    console.log('===============================================');

    const formResponse = await fetch(`${BASE_URL}/api/generate-dynamic-form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        placeholders: ['studentName', 'rollNumber', 'email', 'phone']
      })
    });

    if (!formResponse.ok) {
      throw new Error(`Form generation failed: ${formResponse.status} ${formResponse.statusText}`);
    }

    const formResult = await formResponse.json();
    console.log('✅ Dynamic form generation successful via HTTPS API');
    console.log(`   Form fields generated: ${formResult.formConfig.fields.length}`);

    // Test 7: Placeholder Replacement via HTTPS API
    console.log('\n🔄 Test 7: Placeholder Replacement via HTTPS API');
    console.log('===============================================');

    const replaceResponse = await fetch(`${BASE_URL}/api/replace-placeholders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wordFile: Buffer.from('Test Word Content with @studentName and @rollNumber').toString('base64'),
        placeholders: {
          studentName: 'John Doe',
          rollNumber: 'CS2024001'
        }
      })
    });

    if (!replaceResponse.ok) {
      throw new Error(`Placeholder replacement failed: ${replaceResponse.status} ${replaceResponse.statusText}`);
    }

    const replaceResult = await replaceResponse.json();
    console.log('✅ Placeholder replacement successful via HTTPS API');

    // Summary
    console.log('\n🎉 HTTPS API Test Summary');
    console.log('=========================');
    console.log('✅ PDF Upload via HTTPS: Working');
    console.log('✅ PDF Fetch via HTTPS: Working');
    console.log('✅ PDF Metadata via HTTPS: Working');
    console.log('✅ PDF to Word Conversion via HTTPS: Working');
    console.log('✅ Word to PDF Conversion via HTTPS: Working');
    console.log('✅ Dynamic Form Generation via HTTPS: Working');
    console.log('✅ Placeholder Replacement via HTTPS: Working');
    
    console.log('\n🚀 All HTTPS API operations are working correctly!');
    console.log('   The system now supports:');
    console.log('   - PDF upload and fetch via HTTPS endpoints');
    console.log('   - Document conversion via HTTPS API calls');
    console.log('   - Secure file operations over HTTPS');

  } catch (error) {
    console.error('\n❌ HTTPS API test failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Ensure the Next.js server is running');
    console.error('   2. Check that all API endpoints are accessible');
    console.error('   3. Verify HTTPS configuration');
    console.error('   4. Check network connectivity');
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testHTTPSAPI();
}

module.exports = { testHTTPSAPI };
