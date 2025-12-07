import { NextRequest, NextResponse } from 'next/server';
import { fillDocxTemplate } from '@/lib/docxProcessor';
import { uploadFile } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Template fill request received');
    
    const { templateId, formData } = await request.json();

    console.log('📝 Template fill - Request data:', {
      templateId: templateId ? 'Present' : 'Missing',
      formData: formData ? `Present (${Object.keys(formData).length} fields)` : 'Missing'
    });

    if (!templateId || !formData) {
      console.error('❌ Missing required fields:', { templateId: !!templateId, formData: !!formData });
      return NextResponse.json(
        { success: false, error: 'templateId and formData are required' },
        { status: 400 }
      );
    }

    // Fetch template details to get the source DOCX URL and name (server requires absolute URL)
    console.log(`🔍 Fetching template details for: ${templateId}`);
    const origin = new URL(request.url).origin;
    const templateUrl = `${origin}/api/admin/save-template?id=${encodeURIComponent(templateId)}`;
    console.log(`🔗 Template API URL: ${templateUrl}`);
    
    let templateRes: Response;
    try {
      templateRes = await fetch(templateUrl);
    } catch (fetchError) {
      console.error('❌ Error fetching template details:', fetchError);
      if (fetchError instanceof Error) {
        console.error('Fetch error details:', {
          message: fetchError.message,
          stack: fetchError.stack,
          name: fetchError.name
        });
      }
      return NextResponse.json(
        { success: false, error: `Failed to fetch template details: ${fetchError instanceof Error ? fetchError.message : 'Network error'}` },
        { status: 500 }
      );
    }

    if (!templateRes.ok) {
      const errorText = await templateRes.text().catch(() => 'Unknown error');
      console.error(`❌ Template fetch failed with status ${templateRes.status}:`, errorText);
      return NextResponse.json(
        { success: false, error: `Failed to fetch template details (${templateRes.status})` },
        { status: templateRes.status === 404 ? 404 : 500 }
      );
    }

    let templateJson: any;
    try {
      templateJson = await templateRes.json();
    } catch (parseError) {
      console.error('❌ Error parsing template response:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid template response format' },
        { status: 500 }
      );
    }

    if (!templateJson.success || !templateJson.data?.template?.wordUrl) {
      console.error('❌ Template or wordUrl not found in response:', {
        success: templateJson.success,
        hasData: !!templateJson.data,
        hasTemplate: !!templateJson.data?.template,
        hasWordUrl: !!templateJson.data?.template?.wordUrl
      });
      return NextResponse.json(
        { success: false, error: 'Template or wordUrl not found' },
        { status: 404 }
      );
    }

    const template = templateJson.data.template as { name: string; wordUrl: string };
    console.log(`✅ Template found: ${template.name}`);
    console.log(`🔗 Template wordUrl: ${template.wordUrl}`);

    // Fetch the DOCX file from the wordUrl
    console.log('📥 Fetching DOCX file from storage...');
    let sourceRes: Response;
    try {
      sourceRes = await fetch(template.wordUrl);
    } catch (fetchError) {
      console.error('❌ Error fetching DOCX file:', fetchError);
      if (fetchError instanceof Error) {
        console.error('DOCX fetch error details:', {
          message: fetchError.message,
          stack: fetchError.stack,
          name: fetchError.name
        });
      }
      return NextResponse.json(
        { success: false, error: `Failed to fetch source DOCX: ${fetchError instanceof Error ? fetchError.message : 'Network error'}` },
        { status: 500 }
      );
    }

    if (!sourceRes.ok) {
      const errorText = await sourceRes.text().catch(() => 'Unknown error');
      console.error(`❌ DOCX fetch failed with status ${sourceRes.status}:`, errorText);
      return NextResponse.json(
        { success: false, error: `Failed to fetch source DOCX (${sourceRes.status})` },
        { status: sourceRes.status === 404 ? 404 : 500 }
      );
    }

    let sourceBuffer: Buffer;
    try {
      const arrayBuffer = await sourceRes.arrayBuffer();
      sourceBuffer = Buffer.from(arrayBuffer);
      console.log(`✅ DOCX file fetched: ${sourceBuffer.length} bytes`);
    } catch (bufferError) {
      console.error('❌ Error converting DOCX to buffer:', bufferError);
      if (bufferError instanceof Error) {
        console.error('Buffer conversion error details:', {
          message: bufferError.message,
          stack: bufferError.stack,
          name: bufferError.name
        });
      }
      return NextResponse.json(
        { success: false, error: `Failed to process DOCX file: ${bufferError instanceof Error ? bufferError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Fill the DOCX with form data
    console.log('🔄 Filling DOCX template with form data...');
    console.log('📝 Form data keys:', Object.keys(formData));
    let filledBuffer: Buffer;
    try {
      filledBuffer = await fillDocxTemplate(sourceBuffer, formData);
      console.log(`✅ DOCX template filled: ${filledBuffer.length} bytes`);
    } catch (fillError) {
      console.error('❌ Error filling DOCX template:', fillError);
      if (fillError instanceof Error) {
        console.error('Fill error details:', {
          message: fillError.message,
          stack: fillError.stack,
          name: fillError.name
        });
      }
      return NextResponse.json(
        { success: false, error: `Failed to fill template: ${fillError instanceof Error ? fillError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Upload filled Word document to cloud storage
    console.log('☁️ Uploading filled document to storage...');
    let wordUrl: string;
    try {
      wordUrl = await uploadFile(
        filledBuffer,
        'filled-documents',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      console.log('✅ Filled Word document uploaded to storage:', wordUrl);
    } catch (uploadError) {
      console.error('❌ Error uploading filled document:', uploadError);
      if (uploadError instanceof Error) {
        console.error('Upload error details:', {
          message: uploadError.message,
          stack: uploadError.stack,
          name: uploadError.name
        });
      }
      return NextResponse.json(
        { success: false, error: `Failed to upload document: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      wordUrl: wordUrl,
      message: 'Word document generated and uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Error generating filled Word document:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Handle specific error types
      if (error.message.includes('template') || error.message.includes('Template')) {
        return NextResponse.json(
          { success: false, error: `Template error: ${error.message}` },
          { status: 404 }
        );
      }
      
      if (error.message.includes('storage') || error.message.includes('upload') || error.message.includes('Cloudinary') || error.message.includes('Oracle')) {
        return NextResponse.json(
          { success: false, error: `Storage error: ${error.message}` },
          { status: 500 }
        );
      }
      
      if (error.message.includes('DOCX') || error.message.includes('docx') || error.message.includes('document')) {
        return NextResponse.json(
          { success: false, error: `Document processing error: ${error.message}` },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `Failed to generate document: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}

