import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfUrl = searchParams.get('url');
    const orderId = searchParams.get('orderId');
    const filename = searchParams.get('filename') || 'document';

    if (!pdfUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    console.log('📄 File Viewer: Fetching from URL:', pdfUrl);

    // If orderId is provided, get file type from database
    let fileType = 'application/octet-stream';
    let originalFileName = filename;
    
    if (orderId) {
      try {
        await connectDB();
        const order = await Order.findOne({ orderId });
        
        if (order && order.fileType) {
          fileType = order.fileType;
          originalFileName = order.originalFileName || filename;
          console.log('📄 File Viewer: Found file type from database:', fileType);
          console.log('📄 File Viewer: Original filename from database:', order.originalFileName);
          console.log('📄 File Viewer: Using filename:', originalFileName);
        } else {
          console.log('📄 File Viewer: No file type found in database, using default:', fileType);
          console.log('📄 File Viewer: Using filename:', originalFileName);
        }
      } catch (dbError) {
        console.error('📄 File Viewer: Error fetching order from database:', dbError);
        // Continue with default file type
      }
    }

    // Fetch the file from Cloudinary
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      console.log('❌ File Viewer: Failed to fetch file, status:', response.status);
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 404 });
    }

    const fileBuffer = await response.arrayBuffer();
    console.log('✅ File Viewer: Successfully fetched file, size:', fileBuffer.byteLength, 'bytes');

    // Determine if this is an image file that can be displayed inline
    const isImage = fileType.startsWith('image/');
    const isPDF = fileType === 'application/pdf';
    const isText = fileType.startsWith('text/');
    
    // For images, we can serve them directly
    if (isImage) {
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': fileType,
          'Content-Disposition': `inline; filename="${originalFileName}"`,
          'Content-Length': fileBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    
    // For PDFs, serve with PDF content type
    if (isPDF) {
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${originalFileName}"`,
          'Content-Length': fileBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    
    // For text files, serve as text
    if (isText) {
      const textContent = new TextDecoder().decode(fileBuffer);
      return new NextResponse(textContent, {
        status: 200,
        headers: {
          'Content-Type': fileType,
          'Content-Disposition': `inline; filename="${originalFileName}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    
    // For other files (docx, xlsx, etc.), try to serve inline for preview
    // but some browsers may still download them
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': fileType,
        'Content-Disposition': `inline; filename="${originalFileName}"`,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('❌ File Viewer: Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
