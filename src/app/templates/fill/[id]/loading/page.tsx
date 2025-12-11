'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface GenerationStatus {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  pdfUrl?: string;
  wordUrl?: string;
  error?: string;
}

export default function TemplateLoadingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>({
    status: 'processing',
    progress: 0,
  });
  const [currentMessage, setCurrentMessage] = useState('Generating file...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setTemplateId(resolvedParams.id);
    };
    getParams();
    
    const jobIdParam = searchParams.get('jobId');
    if (jobIdParam) {
      setJobId(jobIdParam);
    } else {
      setError('Job ID not found. Please go back and try again.');
    }
  }, [params, searchParams]);

  useEffect(() => {
    if (!jobId) return;

    // Simulate progress animation while checking status
    let progressInterval: NodeJS.Timeout | undefined;
    let statusInterval: NodeJS.Timeout | undefined;
    let currentProgress = 0;
    const startTime = Date.now();
    const MAX_WAIT_TIME = 120000; // 2 minutes timeout

    // Animate progress from 0 to 50% (Word generation)
    const animateProgress = () => {
      progressInterval = setInterval(() => {
        if (currentProgress < 50) {
          currentProgress += 2;
          setStatus(prev => ({ ...prev, progress: currentProgress }));
        } else {
          clearInterval(progressInterval);
        }
      }, 100);
    };

    animateProgress();

    // Start polling for status
    const pollStatus = async () => {
      try {
        // Check timeout
        if (Date.now() - startTime > MAX_WAIT_TIME) {
          console.warn('⏱️ Timeout reached, redirecting with Word file');
          clearInterval(progressInterval);
          // Try to get wordUrl from last status check
          try {
            const lastResponse = await fetch(`/api/templates/generation-status/${jobId}`);
            const lastResult = await lastResponse.json();
            if (lastResult.wordUrl) {
              router.push(`/templates/fill/${templateId}/complete?wordUrl=${encodeURIComponent(lastResult.wordUrl)}&error=${encodeURIComponent('PDF conversion is taking longer than expected. You can continue with the Word document.')}`);
              return;
            }
          } catch (e) {
            console.error('Error fetching final status:', e);
          }
          setError('PDF conversion is taking longer than expected. Please try again or contact support.');
          return;
        }

        const response = await fetch(`/api/templates/generation-status/${jobId}`);
        const result = await response.json();

        if (result.success) {
          // Update progress - if we got a real status, use it; otherwise continue animation
          if (result.progress !== undefined && result.progress > currentProgress) {
            currentProgress = result.progress;
            clearInterval(progressInterval);
          }

          setStatus({
            status: result.status,
            progress: result.progress || currentProgress,
            pdfUrl: result.pdfUrl,
            wordUrl: result.wordUrl,
            error: result.error,
          });

          // Update message based on progress
          const finalProgress = result.progress || currentProgress;
          if (finalProgress < 50) {
            setCurrentMessage('Generating file...');
          } else if (finalProgress < 100) {
            setCurrentMessage('Converting to PDF...');
            // Animate from 50 to 100
            if (finalProgress >= 50 && finalProgress < 100 && !progressInterval) {
              const pdfProgressInterval = setInterval(() => {
                if (currentProgress < 100) {
                  currentProgress += 2;
                  setStatus(prev => ({ ...prev, progress: currentProgress }));
                } else {
                  clearInterval(pdfProgressInterval);
                }
              }, 150);
            }
          } else {
            setCurrentMessage('Complete!');
          }

          // If completed, redirect to completion page
          if (result.status === 'completed' && result.pdfUrl) {
            clearInterval(progressInterval);
            clearInterval(statusInterval);
            setTimeout(() => {
              router.push(`/templates/fill/${templateId}/complete?pdfUrl=${encodeURIComponent(result.pdfUrl)}&wordUrl=${encodeURIComponent(result.wordUrl || '')}`);
            }, 1000);
            return; // Exit early
          } else if (result.status === 'failed') {
            clearInterval(progressInterval);
            clearInterval(statusInterval);
            // If failed but we have wordUrl, still redirect but show warning
            if (result.wordUrl) {
              setTimeout(() => {
                router.push(`/templates/fill/${templateId}/complete?wordUrl=${encodeURIComponent(result.wordUrl)}&error=${encodeURIComponent(result.error || 'PDF conversion failed. You can still download the Word document.')}`);
              }, 1000);
              return; // Exit early
            } else {
              setError(result.error || 'Generation failed. Please try again.');
            }
          }
          
          // If processing but we have wordUrl and it's been more than 30 seconds, allow user to continue
          if (result.status === 'processing' && result.wordUrl && (Date.now() - startTime > 30000)) {
            console.log('⏱️ Processing for more than 30s, allowing user to continue with Word file');
            // Don't redirect yet, but update message to show option
            setCurrentMessage('PDF conversion is taking longer. You can continue with Word document...');
          }
        } else {
          // If status check fails, check if we have wordUrl from previous successful check
          if (status.wordUrl) {
            console.warn('⚠️ Status check failed but we have wordUrl, redirecting...');
            clearInterval(progressInterval);
            clearInterval(statusInterval);
            router.push(`/templates/fill/${templateId}/complete?wordUrl=${encodeURIComponent(status.wordUrl)}&error=${encodeURIComponent('Status check failed. You can still download the Word document.')}`);
            return;
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
        // Continue polling even on error, but check timeout
        if (Date.now() - startTime > MAX_WAIT_TIME) {
          if (progressInterval) clearInterval(progressInterval);
          if (statusInterval) clearInterval(statusInterval);
          // Try to get wordUrl from status state
          if (status.wordUrl) {
            router.push(`/templates/fill/${templateId}/complete?wordUrl=${encodeURIComponent(status.wordUrl)}&error=${encodeURIComponent('Status check error. You can still download the Word document.')}`);
          } else {
            // Try one more fetch before showing error
            try {
              const lastResponse = await fetch(`/api/templates/generation-status/${jobId}`);
              const lastResult = await lastResponse.json();
              if (lastResult.wordUrl) {
                router.push(`/templates/fill/${templateId}/complete?wordUrl=${encodeURIComponent(lastResult.wordUrl)}&error=${encodeURIComponent('Status check error. You can still download the Word document.')}`);
                return;
              }
            } catch (e) {
              console.error('Error in final fetch:', e);
            }
            setError('Failed to check status. Please try again or contact support.');
          }
          return;
        }
      }
    };

    // Poll immediately, then every 2 seconds
    pollStatus();
    statusInterval = setInterval(pollStatus, 2000);

    // Cleanup intervals on unmount
    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [jobId, templateId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl w-full">
        <div className="text-center">
          {/* Animated Spinner */}
          <div className="mb-8">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">{currentMessage}</span>
              <span className="text-sm font-bold text-blue-600">{status.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-center"
                style={{ width: `${status.progress}%` }}
              >
                {status.progress > 10 && (
                  <span className="text-xs font-semibold text-white">{status.progress}%</span>
                )}
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <div className="space-y-2 mb-6">
            <div className={`flex items-center justify-center space-x-2 ${status.progress >= 50 ? 'text-green-600' : 'text-gray-600'}`}>
              {status.progress >= 50 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              )}
              <span className="text-sm font-medium">Generating file</span>
            </div>
            
            <div className={`flex items-center justify-center space-x-2 ${status.progress >= 100 ? 'text-green-600' : status.progress >= 50 ? 'text-blue-600' : 'text-gray-400'}`}>
              {status.progress >= 100 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : status.progress >= 50 ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full"></div>
              )}
              <span className="text-sm font-medium">Converting to PDF</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Cancel Button */}
          <Link
            href={`/templates/fill/${templateId}`}
            className="inline-block text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Cancel and go back
          </Link>
        </div>
      </div>
    </div>
  );
}

