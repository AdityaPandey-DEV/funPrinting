# Test Files Directory

This directory contains test files for the Cloudmersive integration.

## Required Files

### sample.pdf
A sample PDF file for testing the PDF to DOCX conversion functionality.

**Instructions:**
1. Add a sample PDF file named `sample.pdf` to this directory
2. The PDF should contain some text content (not just images)
3. The file size should be under 10MB
4. The PDF should not be password-protected

### Creating a Test PDF

You can create a simple test PDF with the following content:

```
Sample Document

Name: @name
Date: @date
Email: @email
Phone: @phone

This is a sample document for testing the Cloudmersive integration.
It contains placeholder text that will be replaced with actual values.
```

## Testing

Run the Cloudmersive integration test:

```bash
npm run test-cloudmersive
```

This will:
1. Upload the sample PDF
2. Convert it to DOCX using Cloudmersive
3. Save it as a template
4. Create a test order with filled data
5. Generate the final PDF

## Notes

- The test script expects a file named `sample.pdf` in this directory
- If the file doesn't exist, the test will fail with a helpful message
- You can use any PDF file for testing, but it's recommended to use a simple one with text content
