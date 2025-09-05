import { NextRequest, NextResponse } from 'next/server';

// Document proxy endpoint to serve documents to Microsoft Word Online
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');
    
    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }
    
    // In a real implementation, you would:
    // 1. Retrieve the document from your storage (Cloudinary, database, etc.)
    // 2. Return the document with proper headers for Microsoft Word Online
    
    // For now, we'll return a placeholder response
    return NextResponse.json({
      message: 'Document proxy working',
      docId: docId,
      status: 'ready'
    });
    
  } catch (error) {
    console.error('Document proxy error:', error);
    return NextResponse.json(
      { error: 'Document proxy error' },
      { status: 500 }
    );
  }
}
