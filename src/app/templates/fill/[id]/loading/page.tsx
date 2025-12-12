'use client';

import { useState, useEffect, useCallback } from 'react';
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

  // Function to start generation from form data
  const startGeneration = useCallback(async (storedData: string, templateIdParam: string) => {
    try {
      const { templateId, formData } = JSON.parse(storedData);
      
      // Clear stored data immediately
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pendingTemplateFormData');
      }
      
      console.log('🔄 Making API call to generate document...');
      console.log('[LOADING] Template ID:', templateId);
      console.log('[LOADING] Form data keys:', Object.keys(formData));
      
      // Start progress animation immediately (don't wait for API response)
      setCurrentMessage('Generating file...');
      setStatus(prev => ({ ...prev, status: 'processing', progress: 0 }));
      
      // Make API call
      const response = await fetch('/api/templates/generate-fill-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          formData
        }),
      });

      // Handle error response
      if (!response.ok) {
        let errorMessage = 'Failed to generate document';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text().catch(() => 'Unknown error');
          errorMessage = errorText || errorMessage;
        }
        console.error('❌ Generation error:', errorMessage);
        setError(errorMessage);
        setStatus(prev => ({ ...prev, status: 'failed', progress: 0 }));
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Generation API call successful');
        console.log('[LOADING] Job ID:', result.jobId);
        console.log('[LOADING] Status:', result.status);
        
        // Set jobId to trigger polling
        if (result.jobId) {
          setJobId(result.jobId);
        }
        
        // If already complete, redirect immediately
        if (result.status === 'completed' && result.pdfUrl) {
          console.log('✅ Generation completed immediately, redirecting to complete page');
          setStatus(prev => ({ ...prev, status: 'completed', progress: 100 }));
          setTimeout(() => {
            router.push(`/templates/fill/${templateIdParam}/complete?pdfUrl=${encodeURIComponent(result.pdfUrl)}&wordUrl=${encodeURIComponent(result.wordUrl || '')}`);
          }, 500);
          return;
        } else if (result.status === 'failed' && result.wordUrl) {
          console.log('⚠️ Generation failed but Word file available, redirecting to complete page');
          setStatus(prev => ({ ...prev, status: 'failed', progress: 50 }));
          setTimeout(() => {
            router.push(`/templates/fill/${templateIdParam}/complete?wordUrl=${encodeURIComponent(result.wordUrl)}&error=${encodeURIComponent(result.error || 'PDF conversion failed. You can still download the Word document.')}`);
          }, 500);
          return;
        } else if (result.wordUrl) {
          // Store wordUrl for fallback during polling
          setStatus(prev => ({ ...prev, wordUrl: result.wordUrl, progress: 50 }));
          setCurrentMessage('Converting to PDF...');
        }
        
        // If we have a jobId, the polling useEffect will handle the rest
        // If not, we'll continue with the progress animation
      } else {
        setError(result.error || 'Failed to generate document');
        setStatus(prev => ({ ...prev, status: 'failed', progress: 0 }));
      }
    } catch (error) {
      console.error('❌ Error starting generation:', error);
      setError('Failed to start document generation. Please try again.');
      setStatus(prev => ({ ...prev, status: 'failed', progress: 0 }));
    }
  }, [router]);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setTemplateId(resolvedParams.id);
      
      const jobIdParam = searchParams.get('jobId');
      const statusParam = searchParams.get('status');
      const pdfUrlParam = searchParams.get('pdfUrl');
      const wordUrlParam = searchParams.get('wordUrl');
      const errorParam = searchParams.get('error');
      
      // Check if we have a jobId from URL params (existing flow)
      if (jobIdParam) {
        setJobId(jobIdParam);
        
        // If status, URLs, or error are provided in URL params, use them immediately
        // This handles the case where generation completed synchronously
        if (statusParam === 'completed' && pdfUrlParam) {
          // Already complete - redirect immediately
          setTimeout(() => {
            router.push(`/templates/fill/${resolvedParams.id}/complete?pdfUrl=${encodeURIComponent(pdfUrlParam)}&wordUrl=${encodeURIComponent(wordUrlParam || '')}`);
          }, 500);
          return;
        } else if (statusParam === 'failed' && wordUrlParam) {
          // Failed but has Word file - redirect immediately
          setTimeout(() => {
            router.push(`/templates/fill/${resolvedParams.id}/complete?wordUrl=${encodeURIComponent(wordUrlParam)}&error=${encodeURIComponent(errorParam || 'PDF conversion failed. You can still download the Word document.')}`);
          }, 500);
          return;
        } else if (wordUrlParam) {
          // Store wordUrl for fallback
          setStatus(prev => ({ ...prev, wordUrl: wordUrlParam }));
        }
      } else {
        // No jobId in URL - check for form data in sessionStorage (new immediate redirect flow)
        if (typeof window !== 'undefined') {
          const storedData = sessionStorage.getItem('pendingTemplateFormData');
          if (storedData) {
            // We have form data - make API call
            console.log('📝 Found form data in sessionStorage, starting generation...');
            startGeneration(storedData, resolvedParams.id);
            return;
          }
        }
        
        // No jobId and no stored data - show error
        setError('Job ID or form data not found. Please go back and try again.');
      }
    };
    getParams();
  }, [params, searchParams, router, startGeneration]);

  // Start progress animation immediately when page loads (for immediate redirect flow)
  // This runs while waiting for the API response (before jobId is set)
  useEffect(() => {
    // Only start animation if we don't have a jobId yet (waiting for API response)
    if (jobId) return;
    
    let progressInterval: NodeJS.Timeout | undefined;
    let currentProgress = 0;
    
    // Animate progress from 0 to 50% (Word generation phase)
    const animateProgress = () => {
      progressInterval = setInterval(() => {
        currentProgress += 1.5; // Increment progress
        if (currentProgress >= 50) {
          currentProgress = 50; // Cap at 50%
          clearInterval(progressInterval);
        }
        setStatus(prev => {
          // Only update if we haven't reached 50% yet
          if (prev.progress < 50) {
            return { ...prev, progress: Math.min(currentProgress, 50) };
          }
          return prev;
        });
      }, 150);
    };

    // Start animation immediately
    animateProgress();

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [jobId]); // Only depend on jobId, not status.progress

  useEffect(() => {
    if (!jobId) return;

    // Simulate progress animation while checking status
    let progressInterval: NodeJS.Timeout | undefined;
    let currentProgress = status.progress || 50; // Start from 50% if Word is done
    const startTime = Date.now();
    const MAX_WAIT_TIME = 120000; // 2 minutes timeout

    // Animate progress from 50 to 100% (PDF conversion phase)
    const animateProgress = () => {
      // If we're already at 50%, continue to 100%
      if (currentProgress >= 50 && currentProgress < 100) {
        progressInterval = setInterval(() => {
          if (currentProgress < 100) {
            currentProgress += 1;
            setStatus(prev => ({ ...prev, progress: Math.min(currentProgress, 100) }));
          } else {
            clearInterval(progressInterval);
          }
        }, 200);
      }
    };

    animateProgress();

    // Start polling for status
    const pollStatus = async () => {
      try {
        // Check timeout
        if (Date.now() - startTime > MAX_WAIT_TIME) {
          console.warn('⏱️ Timeout reached, redirecting with Word file');
          if (progressInterval) clearInterval(progressInterval);
          clearInterval(statusInterval);
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
            if (progressInterval) clearInterval(progressInterval);
            clearInterval(statusInterval);
            setTimeout(() => {
              router.push(`/templates/fill/${templateId}/complete?pdfUrl=${encodeURIComponent(result.pdfUrl)}&wordUrl=${encodeURIComponent(result.wordUrl || '')}`);
            }, 1000);
            return; // Exit early
          } else if (result.status === 'failed') {
            if (progressInterval) clearInterval(progressInterval);
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
            if (progressInterval) clearInterval(progressInterval);
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
    const statusInterval = setInterval(pollStatus, 2000);

    // Cleanup intervals on unmount
    return () => {
      if (progressInterval) clearInterval(progressInterval);
      clearInterval(statusInterval);
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

