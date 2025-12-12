import { NextRequest, NextResponse } from 'next/server';
import { checkConversionStatus } from '@/lib/renderPdfService';
import { jobStore } from '@/lib/jobStore';

/**
 * Check generation and conversion status
 * This endpoint checks the status of PDF conversion
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking generation status for job: ${jobId}`);

    // Check in-memory job store first
    const job = jobStore.get(jobId);
    
    if (job) {
      // Job found in store - calculate progress based on status
      let progress = 50; // Word generation done
      if (job.status === 'completed' && job.pdfUrl) {
        progress = 100; // PDF conversion complete
      } else if (job.status === 'processing' && job.wordUrl && !job.pdfUrl) {
        // PDF conversion in progress - estimate progress based on elapsed time
        const elapsed = Date.now() - job.createdAt;
        // Progress from 50% to 90% over 60 seconds
        progress = 50 + Math.min((elapsed / 60000) * 40, 40);
      } else if (job.status === 'failed') {
        progress = 50; // Word done, PDF failed
      }
      
      console.log(`✅ Job found in store: ${jobId}, status: ${job.status}, progress: ${progress}%, hasWordUrl: ${!!job.wordUrl}, hasPdfUrl: ${!!job.pdfUrl}`);
      
      return NextResponse.json({
        success: true,
        status: job.status,
        progress,
        pdfUrl: job.pdfUrl,
        wordUrl: job.wordUrl, // Always return wordUrl, even if PDF conversion failed
        error: job.error,
      });
    }
    
    console.log(`⚠️ Job not found in store: ${jobId}, checking Render service...`);

    // Job not found in store - might be from async conversion
    // Check Render service for async job status
    const conversionStatus = await checkConversionStatus(jobId);
    
    if (conversionStatus.status === 'completed' || conversionStatus.status === 'failed') {
      const progress = conversionStatus.status === 'completed' ? 100 : 50;
      return NextResponse.json({
        success: true,
        status: conversionStatus.status,
        progress,
        pdfUrl: conversionStatus.pdfUrl,
        wordUrl: conversionStatus.wordUrl,
        error: conversionStatus.error,
      });
    }

    // Default: Assume processing
    return NextResponse.json({
      success: true,
      status: 'processing',
      progress: 50, // Word generation done, PDF processing
      error: conversionStatus.error,
    });

  } catch (error) {
    console.error('❌ Error checking generation status:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to check status' 
      },
      { status: 500 }
    );
  }
}

