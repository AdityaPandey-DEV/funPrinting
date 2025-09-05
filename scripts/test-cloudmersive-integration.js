const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_PDF_PATH = path.join(__dirname, '..', 'test-files', 'sample.pdf');

async function testCloudmersiveIntegration() {
  console.log('🧪 Testing Cloudmersive Integration...\n');

  try {
    // Test 1: Check if test PDF exists
    console.log('1️⃣ Checking test file...');
    if (!fs.existsSync(TEST_PDF_PATH)) {
      console.log('❌ Test PDF not found. Creating a sample PDF...');
      // Create a simple test PDF (you might want to add a real PDF file)
      console.log('⚠️  Please add a sample PDF file at:', TEST_PDF_PATH);
      return;
    }
    console.log('✅ Test PDF found');

    // Test 2: Upload PDF and convert to DOCX
    console.log('\n2️⃣ Testing PDF upload and conversion...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_PDF_PATH));
    formData.append('name', 'Test Template');
    formData.append('description', 'Test template for Cloudmersive integration');
    formData.append('category', 'other');

    const uploadResponse = await fetch(`${BASE_URL}/api/admin/upload-pdf`, {
      method: 'POST',
      body: formData,
    });

    const uploadResult = await uploadResponse.json();
    
    if (uploadResult.success) {
      console.log('✅ PDF uploaded and converted successfully');
      console.log('   - PDF URL:', uploadResult.data.pdfUrl);
      console.log('   - DOCX URL:', uploadResult.data.docxUrl);
      
      // Test 3: Save template
      console.log('\n3️⃣ Testing template save...');
      const saveResponse = await fetch(`${BASE_URL}/api/admin/save-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: uploadResult.data.name,
          description: uploadResult.data.description,
          category: uploadResult.data.category,
          pdfUrl: uploadResult.data.pdfUrl,
          docxUrl: uploadResult.data.docxUrl,
          placeholders: ['name', 'date', 'email', 'phone'],
          formSchema: [
            { key: 'name', type: 'text', label: 'Name', required: true },
            { key: 'date', type: 'date', label: 'Date', required: true },
            { key: 'email', type: 'email', label: 'Email', required: true },
            { key: 'phone', type: 'tel', label: 'Phone', required: true }
          ]
        }),
      });

      const saveResult = await saveResponse.json();
      
      if (saveResult.success) {
        console.log('✅ Template saved successfully');
        console.log('   - Template ID:', saveResult.data.template.id);
        
        // Test 4: List templates
        console.log('\n4️⃣ Testing template listing...');
        const listResponse = await fetch(`${BASE_URL}/api/templates`);
        const listResult = await listResponse.json();
        
        if (listResult.success) {
          console.log('✅ Templates listed successfully');
          console.log('   - Found', listResult.templates.length, 'templates');
          
          // Test 5: Create template order
          console.log('\n5️⃣ Testing template order creation...');
          const orderResponse = await fetch(`${BASE_URL}/api/orders/template`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              templateId: saveResult.data.template.id,
              formData: {
                name: 'John Doe',
                date: '2024-01-15',
                email: 'john@example.com',
                phone: '+1234567890'
              },
              customerInfo: {
                name: 'John Doe',
                phone: '+1234567890',
                email: 'john@example.com'
              },
              printingOptions: {
                pageSize: 'A4',
                color: 'bw',
                sided: 'single',
                copies: 1,
                pageCount: 1
              },
              deliveryOption: {
                type: 'pickup',
                pickupLocation: 'Main Office'
              }
            }),
          });

          const orderResult = await orderResponse.json();
          
          if (orderResult.success) {
            console.log('✅ Template order created successfully');
            console.log('   - Order ID:', orderResult.data.orderId);
            console.log('   - Amount: ₹', orderResult.data.amount);
            console.log('   - PDF URL:', orderResult.data.filledPdfUrl);
            
            console.log('\n🎉 All tests passed! Cloudmersive integration is working correctly.');
            console.log('\n📋 Test Summary:');
            console.log('   ✅ PDF upload and conversion');
            console.log('   ✅ Template saving');
            console.log('   ✅ Template listing');
            console.log('   ✅ Template order creation');
            console.log('   ✅ DOCX filling and PDF generation');
            
          } else {
            console.log('❌ Template order creation failed:', orderResult.error);
          }
        } else {
          console.log('❌ Template listing failed:', listResult.error);
        }
      } else {
        console.log('❌ Template save failed:', saveResult.error);
      }
    } else {
      console.log('❌ PDF upload failed:', uploadResult.error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testCloudmersiveIntegration();
}

module.exports = { testCloudmersiveIntegration };
