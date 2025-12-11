import { NextRequest, NextResponse } from 'next/server';
import { fillDocxTemplate } from '@/lib/docxProcessor';
import { uploadFile } from '@/lib/storage';
import { convertDocxToPdfSync, checkServiceHealth } from '@/lib/renderPdfService';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for job results (for status polling)
// In production, use Redis or database
// Note: This is a simple in-memory store. For production, use a shared cache like Redis
const jobStore = new Map<string, {
  jobId: string;
  wordUrl: string;
  pdfUrl?: string;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: number;
}>();

// Cleanup old jobs (older than 1 hour)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [jobId, job] of jobStore.entries()) {
      if (job.createdAt < oneHourAgo) {
        jobStore.delete(jobId);
      }
    }
  }, 10 * 60 * 1000); // Run cleanup every 10 minutes
}

/**
 * Generate filled Word document and convert to PDF
 * This endpoint generates the Word file first, then converts it to PDF using Render service
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📝 Template fill with PDF conversion request received');
    
    const { templateId, formData } = await request.json();

    if (!templateId || !formData) {
      return NextResponse.json(
        { success: false, error: 'templateId and formData are required' },
        { status: 400 }
      );
    }

    // Check if Render service is available
    const healthCheck = await checkServiceHealth();
    if (!healthCheck.available) {
      console.warn('⚠️ Render service not available, will use Word file only');
    }

    // Generate unique job ID
    const jobId = uuidv4();

    // Step 1: Generate Word document (reuse existing logic)
    console.log('📄 Step 1: Generating Word document...');
    
    // Fetch template details
    const origin = new URL(request.url).origin;
    const templateUrl = `${origin}/api/admin/save-template?id=${encodeURIComponent(templateId)}`;
    
    const templateRes = await fetch(templateUrl);
    if (!templateRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch template details' },
        { status: templateRes.status === 404 ? 404 : 500 }
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
    console.log(`✅ Template found: ${template.name}`);

    // Fetch the DOCX file
    const sourceRes = await fetch(template.wordUrl);
    if (!sourceRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch source DOCX' },
        { status: sourceRes.status === 404 ? 404 : 500 }
      );
    }

    const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer());
    console.log(`✅ DOCX file fetched: ${sourceBuffer.length} bytes`);

    // Fill the DOCX with form data
    console.log('🔄 Filling DOCX template with form data...');
    const filledBuffer = await fillDocxTemplate(sourceBuffer, formData);
    console.log(`✅ DOCX template filled: ${filledBuffer.length} bytes`);

    // Upload filled Word document to cloud storage
    console.log('☁️ Uploading filled Word document to storage...');
    const wordUrl = await uploadFile(
      filledBuffer,
      `filled-documents/${jobId}`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    console.log('✅ Filled Word document uploaded:', wordUrl);

    // Step 2: Convert to PDF if service is available
    let pdfUrl: string | undefined;
    let status: 'processing' | 'completed' | 'failed' = 'completed';
    let error: string | undefined;

    if (healthCheck.available) {
      console.log('📄 Step 2: Converting Word to PDF...');
      
      const conversionResult = await convertDocxToPdfSync(wordUrl, 60000);
      
      if (conversionResult.success && conversionResult.pdfBuffer) {
        // Upload PDF to storage
        const pdfBuffer = Buffer.from(conversionResult.pdfBuffer, 'base64');
        pdfUrl = await uploadFile(
          pdfBuffer,
          `filled-documents/${jobId}`,
          'application/pdf'
        );
        console.log('✅ PDF uploaded to storage:', pdfUrl);
        status = 'completed';
      } else {
        console.warn('⚠️ PDF conversion failed, using Word file:', conversionResult.error);
        status = 'failed';
        error = conversionResult.error;
        // Continue with Word file - don't fail the request
      }
    } else {
      console.log('⚠️ Render service not available, skipping PDF conversion');
      status = 'failed';
      error = 'PDF conversion service not available';
    }

    // Store job status temporarily (for status polling)
    // In a production system, you might want to store this in a database
    // For now, we'll return the status immediately since we're using sync conversion

    // Store job result for status polling (always store, even if PDF conversion failed)
    // This ensures the loading page can retrieve the Word URL even if PDF fails
    jobStore.set(jobId, {
      jobId,
      wordUrl, // Always store wordUrl, even if PDF conversion failed
      pdfUrl,
      status,
      error,
      createdAt: Date.now(),
    });
    
    console.log(`✅ Job stored in jobStore: ${jobId}, status: ${status}, hasWordUrl: ${!!wordUrl}, hasPdfUrl: ${!!pdfUrl}`);
    
    return NextResponse.json({
      success: true,
      jobId,
      wordUrl,
      pdfUrl,
      status,
      error,
      message: pdfUrl 
        ? 'Document generated and converted to PDF successfully'
        : 'Document generated successfully (PDF conversion unavailable)'
    });

  } catch (error) {
    console.error('❌ Error generating document with PDF conversion:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate document' 
      },
      { status: 500 }
    );
  }
}

