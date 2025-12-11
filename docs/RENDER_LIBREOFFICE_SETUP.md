# LibreOffice Setup on Render

This guide explains how to set up a Render service with LibreOffice for DOCX to PDF conversion.

## Overview

The Render service handles asynchronous DOCX to PDF conversion. When a template order is created on Vercel, the DOCX file is sent to Render for conversion. Render uses LibreOffice headless mode to convert the document, then sends the PDF back via webhook.

## Prerequisites

- Render account
- Basic knowledge of Node.js/Express or Python/Flask
- Understanding of webhooks

## Step 1: Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your repository or create a new one

## Step 2: Install LibreOffice

### For Node.js/Express Service

Add to your `Dockerfile` or use build commands:

```dockerfile
FROM node:18-slim

# Install LibreOffice
RUN apt-get update && \
    apt-get install -y libreoffice && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 10000
CMD ["node", "server.js"]
```

### For Python/Flask Service

```dockerfile
FROM python:3.11-slim

# Install LibreOffice
RUN apt-get update && \
    apt-get install -y libreoffice && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

EXPOSE 10000
CMD ["python", "app.py"]
```

### Alternative: Using Build Commands

If you prefer not to use Docker, add build commands in Render:

**Build Command:**
```bash
apt-get update && apt-get install -y libreoffice && npm install
```

**Start Command:**
```bash
node server.js
```

## Step 3: Service Implementation

### Node.js/Express Example

```javascript
const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const execAsync = promisify(exec);

// Convert DOCX to PDF using LibreOffice
async function convertDocxToPdf(docxUrl, orderId) {
  const tempDir = os.tmpdir();
  const inputFile = path.join(tempDir, `input_${orderId}_${Date.now()}.docx`);
  const outputDir = path.join(tempDir, `output_${orderId}_${Date.now()}`);
  
  try {
    // Download DOCX file
    console.log(`Downloading DOCX from: ${docxUrl}`);
    const response = await fetch(docxUrl);
    const buffer = await response.buffer();
    await fs.writeFile(inputFile, buffer);
    
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });
    
    // Convert using LibreOffice headless
    const command = `libreoffice --headless --convert-to pdf --outdir "${outputDir}" "${inputFile}"`;
    console.log(`Running: ${command}`);
    await execAsync(command);
    
    // Find generated PDF
    const files = await fs.readdir(outputDir);
    const pdfFile = files.find(f => f.endsWith('.pdf'));
    
    if (!pdfFile) {
      throw new Error('PDF file not generated');
    }
    
    const pdfPath = path.join(outputDir, pdfFile);
    const pdfBuffer = await fs.readFile(pdfPath);
    
    // Cleanup
    await fs.unlink(inputFile);
    await fs.rm(outputDir, { recursive: true, force: true });
    
    return pdfBuffer;
  } catch (error) {
    // Cleanup on error
    try {
      await fs.unlink(inputFile).catch(() => {});
      await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
    } catch {}
    throw error;
  }
}

// POST /api/convert - Receive conversion request
app.post('/api/convert', async (req, res) => {
  try {
    const { docxUrl, orderId, callbackUrl } = req.body;
    
    if (!docxUrl || !orderId || !callbackUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: docxUrl, orderId, callbackUrl'
      });
    }
    
    // Generate job ID
    const jobId = `job_${orderId}_${Date.now()}`;
    
    // Start conversion asynchronously (don't wait)
    convertDocxToPdf(docxUrl, orderId)
      .then(async (pdfBuffer) => {
        // Send PDF to webhook
        const base64Pdf = pdfBuffer.toString('base64');
        
        await fetch(callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-render-webhook-secret': process.env.RENDER_WEBHOOK_SECRET || ''
          },
          body: JSON.stringify({
            orderId,
            jobId,
            pdfBuffer: base64Pdf,
            status: 'completed'
          })
        });
        
        console.log(`✅ Conversion completed and sent to webhook for order: ${orderId}`);
      })
      .catch(async (error) => {
        console.error(`❌ Conversion failed for order ${orderId}:`, error);
        
        // Send failure notification
        try {
          await fetch(callbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-render-webhook-secret': process.env.RENDER_WEBHOOK_SECRET || ''
            },
            body: JSON.stringify({
              orderId,
              jobId,
              status: 'failed',
              error: error.message
            })
          });
        } catch (webhookError) {
          console.error('Failed to send failure webhook:', webhookError);
        }
      });
    
    // Return immediately with job ID
    res.json({
      success: true,
      jobId,
      message: 'Conversion job started'
    });
    
  } catch (error) {
    console.error('Error starting conversion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/status/:jobId - Check conversion status (optional)
app.get('/api/status/:jobId', (req, res) => {
  // Implement status checking if needed
  res.json({
    success: true,
    status: 'processing'
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Render service running on port ${PORT}`);
});
```

### Python/Flask Example

```python
from flask import Flask, request, jsonify
import subprocess
import os
import tempfile
import requests
import base64

app = Flask(__name__)

def convert_docx_to_pdf(docx_url, order_id):
    """Convert DOCX to PDF using LibreOffice"""
    temp_dir = tempfile.gettempdir()
    input_file = os.path.join(temp_dir, f'input_{order_id}_{os.getpid()}.docx')
    output_dir = os.path.join(temp_dir, f'output_{order_id}_{os.getpid()}')
    
    try:
        # Download DOCX
        response = requests.get(docx_url)
        with open(input_file, 'wb') as f:
            f.write(response.content)
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Convert using LibreOffice
        cmd = f'libreoffice --headless --convert-to pdf --outdir "{output_dir}" "{input_file}"'
        subprocess.run(cmd, shell=True, check=True)
        
        # Find PDF
        pdf_files = [f for f in os.listdir(output_dir) if f.endswith('.pdf')]
        if not pdf_files:
            raise Exception('PDF not generated')
        
        pdf_path = os.path.join(output_dir, pdf_files[0])
        with open(pdf_path, 'rb') as f:
            pdf_buffer = f.read()
        
        # Cleanup
        os.remove(input_file)
        os.rmdir(output_dir)
        
        return pdf_buffer
    except Exception as e:
        # Cleanup on error
        try:
            if os.path.exists(input_file):
                os.remove(input_file)
            if os.path.exists(output_dir):
                os.rmdir(output_dir)
        except:
            pass
        raise e

@app.route('/api/convert', methods=['POST'])
def convert():
    data = request.json
    docx_url = data.get('docxUrl')
    order_id = data.get('orderId')
    callback_url = data.get('callbackUrl')
    
    if not all([docx_url, order_id, callback_url]):
        return jsonify({
            'success': False,
            'error': 'Missing required fields'
        }), 400
    
    job_id = f'job_{order_id}_{int(time.time())}'
    
    # Start conversion asynchronously
    import threading
    def convert_async():
        try:
            pdf_buffer = convert_docx_to_pdf(docx_url, order_id)
            base64_pdf = base64.b64encode(pdf_buffer).decode('utf-8')
            
            requests.post(callback_url, json={
                'orderId': order_id,
                'jobId': job_id,
                'pdfBuffer': base64_pdf,
                'status': 'completed'
            }, headers={
                'x-render-webhook-secret': os.getenv('RENDER_WEBHOOK_SECRET', '')
            })
        except Exception as e:
            requests.post(callback_url, json={
                'orderId': order_id,
                'jobId': job_id,
                'status': 'failed',
                'error': str(e)
            }, headers={
                'x-render-webhook-secret': os.getenv('RENDER_WEBHOOK_SECRET', '')
            })
    
    threading.Thread(target=convert_async).start()
    
    return jsonify({
        'success': True,
        'jobId': job_id,
        'message': 'Conversion job started'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 10000)))
```

## Step 4: Environment Variables

Set these in Render dashboard → Environment:

- `RENDER_WEBHOOK_SECRET` (optional but recommended) - Secret for webhook verification
- `PORT` - Port number (default: 10000)

## Step 5: Configure Vercel Environment Variables

Add to your Vercel project:

- `RENDER_SERVICE_URL` - Your Render service URL (e.g., `https://your-service.onrender.com`)
- `RENDER_API_KEY` (optional) - API key for authentication
- `RENDER_WEBHOOK_SECRET` - Same secret as in Render (for webhook verification)

## Step 6: Webhook Endpoint

The webhook endpoint is already implemented at:
- `POST /api/webhooks/render`

It expects:
```json
{
  "orderId": "string",
  "jobId": "string",
  "pdfBuffer": "base64_string",  // or "pdfUrl": "string"
  "status": "completed" | "failed",
  "error": "string"  // if status is "failed"
}
```

## Step 7: Testing

1. **Test LibreOffice installation:**
   ```bash
   libreoffice --version
   ```

2. **Test conversion locally:**
   ```bash
   libreoffice --headless --convert-to pdf --outdir ./output ./test.docx
   ```

3. **Test Render service:**
   ```bash
   curl -X POST https://your-service.onrender.com/api/convert \
     -H "Content-Type: application/json" \
     -d '{
       "docxUrl": "https://example.com/test.docx",
       "orderId": "test123",
       "callbackUrl": "https://your-vercel-app.vercel.app/api/webhooks/render"
     }'
   ```

## Troubleshooting

### LibreOffice not found
- Ensure LibreOffice is installed in the Docker image
- Check PATH environment variable
- Use full path: `/usr/bin/libreoffice`

### Conversion fails silently
- Check Render logs for errors
- Ensure DOCX file is accessible from Render
- Verify file permissions

### Webhook not received
- Check webhook URL is correct
- Verify `RENDER_WEBHOOK_SECRET` matches
- Check Vercel logs for webhook requests

### Timeout issues
- Render free tier has request timeout limits
- Consider using background jobs or queue system
- Increase timeout settings if on paid plan

## Performance Tips

1. **Use Render paid plans** for better performance and no cold starts
2. **Cache LibreOffice** - it takes time to start on first request
3. **Use background workers** for long-running conversions
4. **Monitor memory usage** - LibreOffice can be memory-intensive

## Security

1. Always verify webhook secrets
2. Validate input URLs (ensure they're from trusted sources)
3. Set up rate limiting
4. Use HTTPS for all communications
5. Sanitize file names and paths

## Alternative: Using Render Background Workers

For better performance, consider using Render Background Workers:

1. Create a Background Worker service
2. Use a message queue (Redis, RabbitMQ) or database polling
3. Process conversions in background
4. Send webhook when complete

This approach is better for production as it avoids timeout issues.

