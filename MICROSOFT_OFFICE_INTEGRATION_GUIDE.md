# Microsoft Office Online Integration Guide

## Current Issue
The "We can't process this request" error occurs because Microsoft Office Online requires:
1. **Publicly accessible URLs** - Documents must be accessible via HTTPS
2. **Proper authentication** - Microsoft account or Azure AD
3. **Correct file format** - Must be valid Office documents

## Solutions

### Option 1: Microsoft Graph API (Recommended)
```typescript
// Requires Azure AD app registration
const graphUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`;
const embedUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/workbook/worksheets`;
```

### Option 2: Public Cloud Storage
```typescript
// Upload to public cloud storage (Cloudinary, AWS S3, etc.)
const publicUrl = `https://res.cloudinary.com/your-cloud/raw/upload/v1234567890/${fileName}`;
const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;
```

### Option 3: WOPI (Web Application Open Platform Interface)
```typescript
// Implement WOPI protocol for Office Online
const wopiUrl = `https://your-domain.com/wopi/files/${fileId}`;
const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(wopiUrl)}`;
```

### Option 4: Alternative Online Editors
- **Google Docs**: `https://docs.google.com/document/d/${docId}/edit`
- **OnlyOffice**: Self-hosted office suite
- **LibreOffice Online**: Open-source alternative

## Implementation Steps

### Step 1: Make Documents Publicly Accessible
```typescript
// In your document proxy route
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('id');
  
  // Fetch document from database
  const document = await getDocument(docId);
  
  // Return document with proper headers
  return new NextResponse(document.buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `inline; filename="${document.name}"`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

### Step 2: Update Microsoft Word Editor Component
```typescript
// Use public URL instead of local proxy
const documentUrl = `https://your-domain.com/api/document-proxy?id=${docId}`;
const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`;
```

### Step 3: Add Authentication (Optional)
```typescript
// For Microsoft Graph API
const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
const token = await getAccessToken();
```

## Quick Fix for Current Implementation

1. **Make your document proxy publicly accessible**
2. **Use HTTPS instead of HTTP**
3. **Add proper CORS headers**
4. **Ensure document URLs are publicly accessible**

## Testing
```bash
# Test if document is publicly accessible
curl -I https://your-domain.com/api/document-proxy?id=test-doc-id

# Should return 200 OK with proper headers
```

## Fallback Strategy
If Microsoft Office Online doesn't work:
1. Provide download option
2. Link to Google Docs
3. Link to Microsoft Office Online directly
4. Use local editor (if available)
