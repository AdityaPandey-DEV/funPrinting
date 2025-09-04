# Adobe PDF Services API Integration Guide

This guide explains the complete PDF to Word conversion workflow using Adobe's PDF Services API, as implemented in this application.

## Overview

The application now supports a complete workflow for converting PDFs to Word documents, editing them with placeholders, and generating personalized documents for users.

## Workflow

### 1. Admin Workflow (Template Creation)

**Step 1: Upload PDF**
- Admin uploads a PDF template through `/admin/templates/dynamic/upload`
- PDF is validated and prepared for conversion

**Step 2: Convert to Word**
- PDF is sent to Adobe PDF Services API via `/api/convert-pdf-to-word`
- Adobe extracts text and structure from the PDF
- A Word document is created with the extracted content

**Step 3: Edit with Placeholders**
- Admin can edit the Word document and add placeholders (e.g., `@studentName`, `@rollNumber`)
- Placeholders are automatically detected and extracted

**Step 4: Save Template**
- Word document is uploaded to cloud storage (Cloudinary)
- Template metadata is saved to MongoDB
- Template is now available for users

### 2. User Workflow (Document Generation)

**Step 1: Select Template**
- User browses available templates at `/templates`
- Each template shows description, category, and required fields

**Step 2: Fill Form**
- User clicks on a template and is redirected to `/templates/custom/[id]`
- Dynamic form is generated based on template placeholders
- User fills in all required information

**Step 3: Generate Document**
- Form data is sent to `/api/templates/generate-custom`
- Word template is downloaded from cloud storage
- Placeholders are replaced with user data via `/api/replace-placeholders`
- Personalized Word document is created

**Step 4: Convert to PDF**
- Word document is sent to Adobe PDF Services API via `/api/convert-word-to-pdf`
- Adobe converts the Word document to a high-quality PDF
- PDF is uploaded to cloud storage

**Step 5: Order**
- User is redirected to `/order` with the generated PDF
- User can preview the document and place an order
- Payment is processed through Razorpay

## API Endpoints

### PDF to Word Conversion
```
POST /api/convert-pdf-to-word
```
- Converts PDF to Word using Adobe PDF Services API
- Extracts text and structure
- Returns structured content with placeholders

### Word to PDF Conversion
```
POST /api/convert-word-to-pdf
```
- Converts Word document to PDF using Adobe PDF Services API
- Preserves formatting and styling
- Returns PDF as binary data

### Placeholder Replacement
```
POST /api/replace-placeholders
```
- Replaces placeholders in Word document with user data
- Uses mammoth.js for Word document processing
- Returns updated Word document

### Dynamic Form Generation
```
POST /api/generate-dynamic-form
```
- Generates form configuration based on placeholders
- Determines field types (text, email, phone, date, etc.)
- Returns form structure for frontend

### Custom Document Generation
```
POST /api/templates/generate-custom
```
- Complete workflow for generating personalized documents
- Downloads template, replaces placeholders, converts to PDF
- Returns PDF URL and order data

### Admin Template Upload
```
POST /api/admin/templates/dynamic/upload
```
- Handles admin template creation workflow
- Converts PDF to Word, uploads to cloud storage
- Saves template metadata to database

## Adobe API Configuration

### Environment Variables
```env
ADOBE_CLIENT_ID=your_client_id
ADOBE_CLIENT_SECRET=your_client_secret
ADOBE_ORG_ID=your_org_id
ADOBE_ACCOUNT_ID=your_account_id
```

### Dependencies
```json
{
  "@adobe/pdfservices-node-sdk": "^4.1.0",
  "docx": "^9.5.1",
  "mammoth": "^1.10.0"
}
```

## Features

### ✅ Implemented Features

1. **Adobe PDF Services API Integration**
   - Real PDF to Word conversion
   - Real Word to PDF conversion
   - Fallback mechanisms for API failures

2. **Dynamic Template System**
   - Admin can upload PDF templates
   - Automatic placeholder detection
   - Cloud storage integration

3. **User-Friendly Interface**
   - Dynamic form generation
   - Real-time validation
   - Progress indicators

4. **Complete Workflow**
   - Template selection → Form filling → Document generation → Order placement
   - Seamless integration with existing order system

5. **Error Handling**
   - Fallback conversion methods
   - Comprehensive error messages
   - Graceful degradation

### 🔧 Technical Implementation

1. **PDF Processing**
   - Uses Adobe PDF Services API for high-quality conversion
   - Fallback to pdf-lib for basic conversion
   - Text extraction and structure preservation

2. **Word Document Handling**
   - Uses docx library for Word document creation
   - mammoth.js for text extraction
   - Placeholder replacement with regex patterns

3. **Cloud Storage**
   - Cloudinary integration for file storage
   - Automatic file upload and URL generation
   - Secure file access

4. **Database Integration**
   - MongoDB for template storage
   - Mongoose for data modeling
   - Efficient querying and indexing

## Usage Examples

### Creating a Template (Admin)
```javascript
// 1. Upload PDF
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('templateData', JSON.stringify({
  name: 'Computer Science Lab Manual',
  description: 'Lab manual for CS students',
  category: 'lab-manual'
}));

const response = await fetch('/api/admin/templates/dynamic/upload', {
  method: 'POST',
  body: formData
});
```

### Generating Custom Document (User)
```javascript
// 1. Fill form and generate document
const response = await fetch('/api/templates/generate-custom', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateId: 'template-id',
    formData: {
      studentName: 'John Doe',
      rollNumber: 'CS2024001',
      email: 'john@example.com'
    }
  })
});

const result = await response.json();
// result.pdfUrl contains the generated PDF
```

## Error Handling

The system includes comprehensive error handling:

1. **Adobe API Failures**
   - Automatic fallback to alternative conversion methods
   - Detailed error logging
   - User-friendly error messages

2. **File Processing Errors**
   - Validation of file formats
   - Size and type checking
   - Graceful error recovery

3. **Network Issues**
   - Retry mechanisms
   - Timeout handling
   - Connection error recovery

## Performance Considerations

1. **Caching**
   - Template metadata cached in database
   - Cloud storage URLs cached
   - Form configurations cached

2. **Optimization**
   - Parallel processing where possible
   - Efficient file handling
   - Minimal memory usage

3. **Scalability**
   - Stateless API design
   - Cloud storage for file handling
   - Database indexing for fast queries

## Security

1. **File Validation**
   - PDF file format validation
   - Size limits and type checking
   - Malicious file detection

2. **Data Protection**
   - Secure file storage
   - Encrypted data transmission
   - User data privacy

3. **API Security**
   - Adobe credentials secured
   - Rate limiting
   - Input sanitization

## Testing

The system includes comprehensive testing:

1. **Unit Tests**
   - API endpoint testing
   - Function testing
   - Error handling testing

2. **Integration Tests**
   - Adobe API integration
   - Database operations
   - File processing

3. **End-to-End Tests**
   - Complete workflow testing
   - User journey testing
   - Error scenario testing

## Deployment

1. **Environment Setup**
   - Adobe credentials configuration
   - Cloud storage setup
   - Database configuration

2. **Dependencies**
   - Node.js packages
   - Adobe SDK
   - Cloud storage libraries

3. **Monitoring**
   - API usage tracking
   - Error monitoring
   - Performance metrics

## Support

For issues or questions:

1. Check the error logs
2. Verify Adobe API credentials
3. Test with sample files
4. Check cloud storage connectivity
5. Review database connections

## Future Enhancements

1. **Advanced Features**
   - Batch processing
   - Template versioning
   - Advanced formatting options

2. **Performance Improvements**
   - Caching strategies
   - CDN integration
   - Database optimization

3. **User Experience**
   - Drag-and-drop interface
   - Real-time preview
   - Mobile optimization
