import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfUrl = searchParams.get('url');
    const fileId = searchParams.get('fileId');

    if (!pdfUrl && !fileId) {
      return NextResponse.json(
        { success: false, error: 'PDF URL or file ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Fetching PDF via HTTPS API...');
    console.log('📄 PDF URL:', pdfUrl);
    console.log('📄 File ID:', fileId);

    let targetUrl = pdfUrl;
    
    // If fileId is provided, resolve it to URL (you can implement file ID to URL mapping)
    if (fileId && !pdfUrl) {
      // For now, we'll use the fileId as a direct URL
      // In a real implementation, you'd look up the fileId in a database
      targetUrl = `https://res.cloudinary.com/your-cloud-name/image/upload/${fileId}`;
    }

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: 'Could not resolve PDF URL' },
        { status: 404 }
      );
    }

    try {
      // Fetch PDF from the URL
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }

      const pdfBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/pdf';
      
      console.log('✅ PDF fetched successfully:', pdfBuffer.byteLength, 'bytes');

      // Return PDF as binary data
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': pdfBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });

    } catch (fetchError) {
      console.error('❌ Error fetching PDF:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch PDF from URL' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ PDF fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PDF' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { pdfUrl, fileId, metadata } = await request.json();

    if (!pdfUrl && !fileId) {
      return NextResponse.json(
        { success: false, error: 'PDF URL or file ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Fetching PDF metadata via HTTPS API...');
    console.log('📄 PDF URL:', pdfUrl);
    console.log('📄 File ID:', fileId);

    let targetUrl = pdfUrl;
    
    // If fileId is provided, resolve it to URL
    if (fileId && !pdfUrl) {
      targetUrl = `https://res.cloudinary.com/your-cloud-name/image/upload/${fileId}`;
    }

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: 'Could not resolve PDF URL' },
        { status: 404 }
      );
    }

    try {
      // Fetch PDF metadata (HEAD request)
      const response = await fetch(targetUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF metadata: ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      const lastModified = response.headers.get('last-modified');

      console.log('✅ PDF metadata fetched successfully');

      return NextResponse.json({
        success: true,
        fileId: fileId,
        pdfUrl: targetUrl,
        metadata: {
          size: contentLength ? parseInt(contentLength) : null,
          type: contentType,
          lastModified: lastModified,
          fetchDate: new Date().toISOString()
        },
        message: 'PDF metadata fetched successfully via HTTPS API'
      });

    } catch (fetchError) {
      console.error('❌ Error fetching PDF metadata:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch PDF metadata' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ PDF metadata fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PDF metadata' },
      { status: 500 }
    );
  }
}
