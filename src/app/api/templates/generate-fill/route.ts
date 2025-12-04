import { NextRequest, NextResponse } from 'next/server';
import { fillDocxTemplate } from '@/lib/docxProcessor';
import { uploadFile } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { templateId, formData } = await request.json();

    if (!templateId || !formData) {
      return NextResponse.json(
        { success: false, error: 'templateId and formData are required' },
        { status: 400 }
      );
    }

    // Fetch template details to get the source DOCX URL and name (server requires absolute URL)
    const origin = new URL(request.url).origin;
    const templateRes = await fetch(`${origin}/api/admin/save-template?id=${encodeURIComponent(templateId)}`);
    if (!templateRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch template details' },
        { status: 404 }
      );
    }
    const templateJson = await templateRes.json();
    if (!templateJson.success || !templateJson.data?.template?.wordUrl) {
      return NextResponse.json(
        { success: false, error: 'Template or wordUrl not found' },
        { status: 404 }
      );
    }

    const template = templateJson.data.template as { name: string; wordUrl: string };

    // Fetch the DOCX file from the wordUrl
    const sourceRes = await fetch(template.wordUrl);
    if (!sourceRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch source DOCX' },
        { status: 400 }
      );
    }
    const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer());

    // Fill the DOCX with form data
    const filledBuffer = await fillDocxTemplate(sourceBuffer, formData);

    // Upload filled Word document to cloud storage
    const wordUrl = await uploadFile(
      filledBuffer,
      'filled-documents',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    console.log('✅ Filled Word document uploaded to storage:', wordUrl);

    return NextResponse.json({
      success: true,
      wordUrl: wordUrl,
      message: 'Word document generated and uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Error generating filled Word document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}

