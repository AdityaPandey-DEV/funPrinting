# HTTPS API Implementation Guide

This guide explains the HTTPS API implementation for PDF upload, fetch, and processing operations in the application.

## Overview

The application now supports secure HTTPS API endpoints for all PDF operations, providing a more robust and secure way to handle file uploads, downloads, and conversions.

## HTTPS API Endpoints

### 1. PDF Upload API
```
POST /api/pdf/upload
```

**Purpose**: Upload PDF files securely via HTTPS API

**Request**:
- `file`: PDF file (multipart/form-data)
- `metadata`: Optional metadata (JSON string)

**Response**:
```json
{
  "success": true,
  "fileId": "unique-file-id",
  "pdfUrl": "https://cloudinary.com/...",
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "uploadDate": "2024-01-01T00:00:00.000Z",
  "message": "PDF uploaded successfully via HTTPS API"
}
```

### 2. PDF Fetch API
```
GET /api/pdf/fetch?url=<pdf_url>
POST /api/pdf/fetch
```

**Purpose**: Fetch PDF files securely via HTTPS API

**GET Request**:
- `url`: PDF URL to fetch

**POST Request**:
```json
{
  "pdfUrl": "https://cloudinary.com/...",
  "fileId": "optional-file-id"
}
```

**Response**: PDF binary data or metadata

### 3. PDF to Word Conversion API
```
POST /api/convert-pdf-to-word
```

**Purpose**: Convert PDF to Word using Adobe API via HTTPS

**Request**:
- `file`: PDF file (multipart/form-data) OR
- `pdfUrl`: PDF URL to fetch and convert

**Response**:
```json
{
  "success": true,
  "wordContent": {
    "paragraphs": [...],
    "totalParagraphs": 10,
    "placeholders": ["studentName", "rollNumber"]
  },
  "message": "PDF converted to Word using Adobe PDF Services API via HTTPS"
}
```

### 4. Word to PDF Conversion API
```
POST /api/convert-word-to-pdf
```

**Purpose**: Convert Word to PDF using Adobe API via HTTPS

**Request**:
- `wordFile`: Word file (multipart/form-data) OR
- `wordUrl`: Word document URL to fetch and convert

**Response**: PDF binary data

### 5. Placeholder Replacement API
```
POST /api/replace-placeholders
```

**Purpose**: Replace placeholders in Word documents via HTTPS

**Request**:
```json
{
  "wordFile": "base64-encoded-word-content",
  "placeholders": {
    "studentName": "John Doe",
    "rollNumber": "CS2024001"
  }
}
```

**Response**:
```json
{
  "success": true,
  "wordFile": "base64-encoded-updated-word-content",
  "message": "Placeholders replaced successfully"
}
```

### 6. Dynamic Form Generation API
```
POST /api/generate-dynamic-form
```

**Purpose**: Generate dynamic forms based on placeholders via HTTPS

**Request**:
```json
{
  "placeholders": ["studentName", "rollNumber", "email"]
}
```

**Response**:
```json
{
  "success": true,
  "formConfig": {
    "title": "Fill Template Details",
    "description": "Please fill in all the required details...",
    "fields": [...],
    "submitText": "Generate Document",
    "validation": {
      "required": ["studentName", "rollNumber", "email"]
    }
  },
  "message": "Dynamic form generated successfully"
}
```

### 7. Custom Document Generation API
```
POST /api/templates/generate-custom
```

**Purpose**: Complete workflow for generating personalized documents via HTTPS

**Request**:
```json
{
  "templateId": "template-id",
  "formData": {
    "studentName": "John Doe",
    "rollNumber": "CS2024001",
    "email": "john@example.com"
  }
}
```

**Response**:
```json
{
  "success": true,
  "orderData": {...},
  "pdfUrl": "https://cloudinary.com/...",
  "message": "Custom document generated successfully"
}
```

## HTTPS API Client

### PDFApiClient Class

The application includes a comprehensive HTTPS API client for easy integration:

```typescript
import { PDFApiClient } from '@/lib/pdfApiClient';

const client = new PDFApiClient('https://your-domain.com');

// Upload PDF
const uploadResult = await client.uploadPDF(file, { folder: 'templates' });

// Fetch PDF
const pdfBlob = await client.fetchPDF(uploadResult.pdfUrl);

// Convert PDF to Word
const conversionResult = await client.convertPDFToWord(undefined, uploadResult.pdfUrl);

// Convert Word to PDF
const pdfBlob = await client.convertWordToPDF(wordFile);

// Replace placeholders
const updatedWord = await client.replacePlaceholders(wordContent, placeholders);

// Generate dynamic form
const formConfig = await client.generateDynamicForm(placeholders);

// Generate custom document
const customDoc = await client.generateCustomDocument(templateId, formData);
```

## Security Features

### 1. HTTPS Encryption
- All API communications are encrypted using HTTPS
- Secure file transfer protocols
- Encrypted data transmission

### 2. File Validation
- PDF file format validation
- File size limits and type checking
- Malicious file detection

### 3. Access Control
- Secure API endpoints
- Authentication and authorization
- Rate limiting and request validation

### 4. Data Protection
- Secure file storage in cloud
- Encrypted data transmission
- User data privacy protection

## Performance Optimizations

### 1. Caching
- API response caching
- File metadata caching
- Cloud storage URL caching

### 2. Compression
- File compression for uploads
- Response compression
- Efficient data transfer

### 3. Parallel Processing
- Concurrent API calls
- Batch operations
- Asynchronous processing

## Error Handling

### 1. Network Errors
- Connection timeout handling
- Retry mechanisms
- Fallback strategies

### 2. API Errors
- Comprehensive error messages
- Status code handling
- Graceful degradation

### 3. File Processing Errors
- Validation error handling
- Conversion error recovery
- User-friendly error messages

## Testing

### 1. Unit Tests
- API endpoint testing
- Function testing
- Error handling testing

### 2. Integration Tests
- HTTPS API integration
- File processing testing
- End-to-end workflow testing

### 3. Performance Tests
- Load testing
- Stress testing
- Response time testing

## Usage Examples

### 1. Upload PDF via HTTPS
```javascript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('metadata', JSON.stringify({ folder: 'templates' }));

const response = await fetch('/api/pdf/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Uploaded PDF URL:', result.pdfUrl);
```

### 2. Fetch PDF via HTTPS
```javascript
const response = await fetch(`/api/pdf/fetch?url=${encodeURIComponent(pdfUrl)}`);
const pdfBlob = await response.blob();

// Use the PDF blob
const pdfUrl = URL.createObjectURL(pdfBlob);
```

### 3. Convert PDF to Word via HTTPS
```javascript
const formData = new FormData();
formData.append('pdfUrl', pdfUrl);

const response = await fetch('/api/convert-pdf-to-word', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Extracted placeholders:', result.wordContent.placeholders);
```

### 4. Generate Custom Document via HTTPS
```javascript
const response = await fetch('/api/templates/generate-custom', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateId: 'template-id',
    formData: {
      studentName: 'John Doe',
      rollNumber: 'CS2024001'
    }
  })
});

const result = await response.json();
console.log('Generated PDF URL:', result.pdfUrl);
```

## Deployment

### 1. Environment Setup
- HTTPS certificate configuration
- API endpoint configuration
- Cloud storage setup

### 2. Security Configuration
- SSL/TLS configuration
- CORS settings
- Authentication setup

### 3. Monitoring
- API usage tracking
- Error monitoring
- Performance metrics

## Troubleshooting

### 1. Common Issues
- HTTPS certificate problems
- API endpoint accessibility
- File upload/download issues

### 2. Debug Steps
- Check network connectivity
- Verify API endpoints
- Test with sample files
- Review error logs

### 3. Support
- Check error logs
- Verify HTTPS configuration
- Test API endpoints
- Review network connectivity

## Future Enhancements

### 1. Advanced Features
- Batch file processing
- Real-time progress updates
- Advanced caching strategies

### 2. Performance Improvements
- CDN integration
- Database optimization
- API response optimization

### 3. Security Enhancements
- Advanced authentication
- File encryption
- Audit logging

## Conclusion

The HTTPS API implementation provides a secure, robust, and scalable solution for PDF operations. It ensures data security, improves performance, and provides a better user experience through encrypted communications and efficient file handling.

The system is now ready for production use with comprehensive error handling, security features, and performance optimizations.
