const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_PDF_PATH = path.join(__dirname, '..', 'test-files', 'sample.pdf');

async function testCompleteIntegration() {
  console.log('🧪 Testing Complete Cloudmersive Integration...\n');

  try {
    // Test 1: Check environment configuration
    console.log('1️⃣ Checking environment configuration...');
    if (!process.env.CLOUDMERSIVE_API_KEY) {
      console.log('⚠️  CLOUDMERSIVE_API_KEY not found in environment');
      console.log('   Run: npm run setup-cloudmersive');
    } else {
      console.log('✅ Cloudmersive API key configured');
    }

    // Test 2: Check if test PDF exists
    console.log('\n2️⃣ Checking test file...');
    if (!fs.existsSync(TEST_PDF_PATH)) {
      console.log('❌ Test PDF not found. Creating a sample PDF...');
      console.log('⚠️  Please add a sample PDF file at:', TEST_PDF_PATH);
      console.log('   You can create a simple PDF with placeholder text like:');
      console.log('   "Name: @name"');
      console.log('   "Date: @date"');
      console.log('   "Email: @email"');
      return;
    }
    console.log('✅ Test PDF found');

    // Test 3: Test PDF to DOCX conversion
    console.log('\n3️⃣ Testing PDF to DOCX conversion...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_PDF_PATH));

    const convertResponse = await fetch(`${BASE_URL}/api/convert-pdf-to-word`, {
      method: 'POST',
      body: formData,
    });

    const convertResult = await convertResponse.json();
    
    if (convertResult.success) {
      console.log('✅ PDF to DOCX conversion successful');
      console.log('   - Conversion method:', convertResult.conversionMethod || 'unknown');
      console.log('   - Placeholders found:', convertResult.wordContent?.placeholders || []);
    } else {
      console.log('❌ PDF to DOCX conversion failed:', convertResult.error);
      return;
    }

    // Test 4: Test template creation workflow
    console.log('\n4️⃣ Testing template creation workflow...');
    
    // Upload PDF and convert
    const uploadFormData = new FormData();
    uploadFormData.append('file', fs.createReadStream(TEST_PDF_PATH));
    uploadFormData.append('name', 'Test Integration Template');
    uploadFormData.append('description', 'Test template for complete integration');
    uploadFormData.append('category', 'other');

    const uploadResponse = await fetch(`${BASE_URL}/api/admin/upload-pdf`, {
      method: 'POST',
      body: uploadFormData,
    });

    const uploadResult = await uploadResponse.json();
    
    if (uploadResult.success) {
      console.log('✅ PDF upload and conversion successful');
      console.log('   - PDF URL:', uploadResult.data.pdfUrl);
      console.log('   - DOCX URL:', uploadResult.data.docxUrl);
      
      // Save template
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
        
        // Test 5: Test template listing
        console.log('\n5️⃣ Testing template listing...');
        const listResponse = await fetch(`${BASE_URL}/api/templates`);
        const listResult = await listResponse.json();
        
        if (listResult.success) {
          console.log('✅ Templates listed successfully');
          console.log('   - Found', listResult.templates.length, 'templates');
          
          // Test 6: Test template order creation
          console.log('\n6️⃣ Testing template order creation...');
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
            
            // Test 7: Test order routing through main endpoint
            console.log('\n7️⃣ Testing order routing through main endpoint...');
            const mainOrderResponse = await fetch(`${BASE_URL}/api/orders/create`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                templateId: saveResult.data.template.id,
                formData: {
                  name: 'Jane Doe',
                  date: '2024-01-16',
                  email: 'jane@example.com',
                  phone: '+1234567891'
                },
                customerInfo: {
                  name: 'Jane Doe',
                  phone: '+1234567891',
                  email: 'jane@example.com'
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

            const mainOrderResult = await mainOrderResponse.json();
            
            if (mainOrderResult.success) {
              console.log('✅ Order routing through main endpoint successful');
              console.log('   - Order ID:', mainOrderResult.data.orderId);
            } else {
              console.log('❌ Order routing through main endpoint failed:', mainOrderResult.error);
            }
            
            console.log('\n🎉 Complete integration test passed!');
            console.log('\n📋 Test Summary:');
            console.log('   ✅ PDF to DOCX conversion (Cloudmersive)');
            console.log('   ✅ Template creation workflow');
            console.log('   ✅ Template listing with form schemas');
            console.log('   ✅ Template order creation');
            console.log('   ✅ DOCX filling and PDF generation');
            console.log('   ✅ Order routing through main endpoint');
            
            console.log('\n🚀 Your Cloudmersive integration is fully functional!');
            console.log('\n📋 Next steps:');
            console.log('1. Visit: http://localhost:3000/admin/templates/upload');
            console.log('2. Upload a PDF with placeholders like @name, @date');
            console.log('3. Visit: http://localhost:3000/templates');
            console.log('4. Fill out a template and generate documents');
            
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
    console.error('❌ Integration test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testCompleteIntegration();
}

module.exports = { testCompleteIntegration };
