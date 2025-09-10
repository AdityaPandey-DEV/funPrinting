# Cloudmersive Integration Setup Guide

This guide will help you set up the Cloudmersive Document Conversion API integration for the funPrinting application.

## Prerequisites

1. **Cloudmersive Account**: Sign up at [cloudmersive.com](https://cloudmersive.com/)
2. **Cloudinary Account**: For file storage (already configured)
3. **MongoDB Atlas**: For database (already configured)

## Step 1: Get Cloudmersive API Key

1. Go to [cloudmersive.com](https://cloudmersive.com/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Go to "API Keys" section
5. Copy your API key

## Step 2: Update Environment Variables

Add the following to your `.env.local` file:

```bash
# Cloudmersive Document Conversion API Configuration (FREE - 800 conversions/month)
CLOUDMERSIVE_API_KEY=your_cloudmersive_api_key_here
```

## Step 3: Install Dependencies

The required dependencies are already installed:

```bash
npm install cloudmersive-convert-api-client docxtemplater pizzip
```

## Step 4: API Endpoints Overview

### Admin Endpoints

1. **POST /api/admin/upload-pdf**
   - Upload PDF file
   - Convert to DOCX using Cloudmersive
   - Store both files in Cloudinary

2. **POST /api/admin/save-template**
   - Extract placeholders from DOCX
   - Generate form schema
   - Save template to MongoDB

### User Endpoints

1. **GET /api/templates**
   - List all available templates with form schemas

2. **POST /api/orders/template**
   - Fill DOCX template with user data
   - Convert filled DOCX to PDF
   - Create order with both files

## Step 5: Workflow Overview

### Admin Workflow
1. Admin uploads PDF via `/admin/templates/upload`
2. System converts PDF → DOCX using Cloudmersive
3. Admin reviews and adds placeholders
4. System extracts placeholders and generates form schema
5. Template is saved to database

### User Workflow
1. User browses templates at `/templates`
2. User selects template and fills form at `/templates/fill/[id]`
3. System fills DOCX with user data using docxtemplater
4. System converts filled DOCX → PDF using Cloudmersive
5. User is redirected to order page with PDF preview

## Step 6: Testing the Integration

### Test PDF Upload
```bash
curl -X POST http://localhost:3000/api/admin/upload-pdf \
  -F "file=@sample.pdf" \
  -F "name=Test Template" \
  -F "description=Test Description" \
  -F "category=other"
```

### Test Template Creation
```bash
curl -X POST http://localhost:3000/api/admin/save-template \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "description": "Test Description",
    "category": "other",
    "pdfUrl": "https://cloudinary.com/...",
    "docxUrl": "https://cloudinary.com/...",
    "placeholders": ["name", "date", "email"]
  }'
```

## Step 7: API Usage Monitoring

Cloudmersive provides 800 free conversions per month. Monitor your usage:

1. Log into your Cloudmersive dashboard
2. Check the "Usage" section
3. Monitor conversion counts

## Step 8: Error Handling

The integration includes comprehensive error handling for:

- Invalid API keys
- Quota exceeded
- File format errors
- Network issues
- Conversion failures

## Step 9: File Storage Structure

Files are organized in Cloudinary as follows:

```
templates/
├── pdf/           # Original PDF files
├── docx/          # Converted DOCX files
└── normalized/    # DOCX with {placeholder} format

orders/
├── filled-docx/   # User-filled DOCX files
└── filled-pdf/    # Final PDF files
```

## Step 10: Security Considerations

1. **API Key Security**: Never commit API keys to version control
2. **File Validation**: Only PDF files are accepted for upload
3. **Size Limits**: 10MB maximum file size
4. **Rate Limiting**: Consider implementing rate limiting for production

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Verify your API key is correct
   - Check if the key is active in Cloudmersive dashboard

2. **"Quota exceeded" error**
   - Check your monthly usage in Cloudmersive dashboard
   - Consider upgrading your plan if needed

3. **Conversion failures**
   - Ensure the PDF is not password-protected
   - Check if the PDF contains text (not just images)
   - Verify file size is under 10MB

4. **Placeholder extraction issues**
   - Ensure placeholders use @placeholder format
   - Check if DOCX contains the expected placeholders

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

## Production Deployment

1. **Environment Variables**: Set all required environment variables
2. **API Limits**: Monitor Cloudmersive usage
3. **Error Monitoring**: Implement proper error tracking
4. **Backup Strategy**: Ensure Cloudinary and MongoDB backups

## Support

- **Cloudmersive Documentation**: [docs.cloudmersive.com](https://docs.cloudmersive.com/)
- **API Status**: Check [status.cloudmersive.com](https://status.cloudmersive.com/)
- **Support**: Contact Cloudmersive support for API-related issues

## Cost Optimization

1. **Batch Processing**: Process multiple files together when possible
2. **Caching**: Cache converted files to avoid re-conversion
3. **File Optimization**: Compress files before conversion
4. **Usage Monitoring**: Track usage to avoid overage charges
