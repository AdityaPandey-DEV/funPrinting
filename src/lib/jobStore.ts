/**
 * Shared in-memory job store for PDF generation status
 * Note: In production, use Redis or database for shared state across serverless functions
 */

export interface JobStatus {
  jobId: string;
  wordUrl: string;
  pdfUrl?: string;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: number;
}

// Shared in-memory store for job results
export const jobStore = new Map<string, JobStatus>();

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

