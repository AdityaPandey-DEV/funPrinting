import { NextRequest, NextResponse } from 'next/server';

// Document proxy endpoint to serve documents to Microsoft Word Online
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');
    const base64Data = searchParams.get('data');
    
    if (!docId && !base64Data) {
      return NextResponse.json({ error: 'Document ID or data required' }, { status: 400 });
    }
    
    // If we have base64 data, decode and serve it
    if (base64Data) {
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `inline; filename="document-${docId || 'temp'}.docx"`,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (decodeError) {
        console.error('Error decoding base64 data:', decodeError);
        return NextResponse.json({ error: 'Invalid document data' }, { status: 400 });
      }
    }
    
    // For document ID, you would typically fetch from database/storage
    // For now, return a placeholder
    return NextResponse.json({
      message: 'Document proxy working',
      docId: docId,
      status: 'ready',
      note: 'This endpoint serves documents for Microsoft Office Online integration'
    });
    
  } catch (error) {
    console.error('Document proxy error:', error);
    return NextResponse.json(
      { error: 'Document proxy error' },
      { status: 500 }
    );
  }
}
