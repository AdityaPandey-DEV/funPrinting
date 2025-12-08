'use client';

import { useState, useEffect } from 'react';
import AdminGoogleAuth from '@/components/admin/AdminGoogleAuth';
import AdminNavigation from '@/components/admin/AdminNavigation';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import NotificationProvider from '@/components/admin/NotificationProvider';
import { showError } from '@/lib/adminNotifications';
import { PrinterIcon, TrashIcon } from '@/components/SocialIcons';

interface PrinterStatus {
  success: boolean;
  printerIndex: number;
  printerUrl: string;
  printerApi: {
    health: {
      status: string;
      printer?: {
        available: boolean;
        message: string;
      };
      queue?: {
        total: number;
        pending: number;
      };
      timestamp?: string;
      error?: string;
    };
    queue: {
      total: number;
      pending: number;
      isPaused?: boolean;
      jobs: Array<{
        id: string;
        job: {
          fileName: string;
          deliveryNumber: string;
          orderId?: string;
          customerInfo?: {
            name: string;
            email: string;
            phone: string;
          };
        };
        attempts: number;
        createdAt: string;
        lastAttemptAt?: string;
      }>;
    };
  };
  funPrinting: {
    printerHealth: {
      available: boolean;
      message: string;
    };
    retryQueue: {
      total: number;
      jobs: Array<{ timestamp: Date }>;
    };
  };
  timestamp: string;
  error?: string;
}

function PrinterMonitorContent() {
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/printer-status?t=${Date.now()}`);
      const data = await response.json();
      
      // Ensure data has the expected structure
      if (data && data.success !== undefined) {
        setStatus(data);
      } else {
        // Handle unexpected response structure
        setStatus({
          success: false,
          printerIndex: 1,
          printerUrl: data?.printerUrl || '',
          printerApi: {
            health: data?.printerApi?.health || { status: 'unknown' },
            queue: data?.printerApi?.queue || { total: 0, pending: 0, jobs: [] }
          },
          funPrinting: {
            printerHealth: data?.funPrinting?.printerHealth || { available: false, message: 'Unknown status' },
            retryQueue: data?.funPrinting?.retryQueue || { total: 0, jobs: [] }
          },
          timestamp: new Date().toISOString(),
          error: 'Unexpected response format'
        });
      }
    } catch (error) {
      console.error('Error fetching printer status:', error);
      setStatus({
        success: false,
        printerIndex: 1,
        printerUrl: '',
        printerApi: {
          health: { status: 'error' },
          queue: { total: 0, pending: 0, jobs: [] }
        },
        funPrinting: {
          printerHealth: { available: false, message: 'Error fetching status' },
          retryQueue: { total: 0, jobs: [] }
        },
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoading && !status) {
    return <LoadingSpinner message="Loading printer status..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminNavigation
          title="Printer Monitor"
          subtitle="Monitor printer API status and print queue"
          actions={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Auto Refresh:</label>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4"
                />
              </div>
              {autoRefresh && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Interval:</label>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                  </select>
                </div>
              )}
              <button
                onClick={fetchStatus}
                disabled={isLoading}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm"
              >
                {isLoading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
          }
        />

        {status && (
          <div className="space-y-6 mt-6">
            {/* Status Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Printer API Status</p>
                    <p className={`text-2xl font-bold mt-2 ${
                      status.printerApi?.health?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {status.printerApi?.health?.status === 'healthy' ? '✅ Online' : '❌ Offline'}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <PrinterIcon size={32} className="w-8 h-8" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Queue Total</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {status.printerApi?.queue?.total || 0}
                    </p>
                  </div>
                  <div className="text-3xl">📋</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Jobs</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-2">
                      {status.printerApi?.queue?.pending || 0}
                    </p>
                  </div>
                  <div className="text-3xl">⏳</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Retry Queue</p>
                    <p className="text-2xl font-bold text-orange-600 mt-2">
                      {status.funPrinting?.retryQueue?.total || 0}
                    </p>
                  </div>
                  <div className="text-3xl">🔄</div>
                </div>
              </div>
            </div>

            {/* Printer API Details */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900">Printer API Details</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Connection</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">URL:</span>
                        <span className="text-sm font-mono text-gray-900">{status.printerUrl || 'Not configured'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Printer Index:</span>
                        <span className="text-sm font-medium text-gray-900">{status.printerIndex || 1}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`text-sm font-medium ${
                          status.printerApi?.health?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {status.printerApi?.health?.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Printer Status</h3>
                    <div className="space-y-2">
                      {status.printerApi?.health?.printer && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Available:</span>
                            <span className={`text-sm font-medium ${
                              status.printerApi.health.printer.available ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {status.printerApi.health.printer.available ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Message:</span>
                            <span className="text-sm text-gray-900">{status.printerApi.health.printer.message}</span>
                          </div>
                        </>
                      )}
                      {status.printerApi?.health?.error && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-red-600">Error:</span>
                          <span className="text-sm text-red-600">{status.printerApi.health.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Queue */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Print Queue ({status.printerApi?.queue?.pending || 0} pending)
                </h2>
                  {status.printerApi?.queue?.isPaused && (
                    <p className="text-sm text-yellow-600 mt-1">⏸️ Queue is paused</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {status.printerApi?.queue?.isPaused ? (
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/admin/printer-queue/resume', {
                            method: 'POST'
                          });
                          const data = await response.json();
                          if (data.success) {
                            fetchStatus();
                          } else {
                            showError('Failed to resume queue: ' + (data.error || 'Unknown error'));
                          }
                        } catch (error) {
                          console.error('Error resuming queue:', error);
                          showError('Failed to resume queue');
                        }
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      ▶️ Resume
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to pause the queue?')) {
                          try {
                            const response = await fetch('/api/admin/printer-queue/pause', {
                              method: 'POST'
                            });
                            const data = await response.json();
                            if (data.success) {
                              fetchStatus();
                            } else {
                              showError('Failed to pause queue: ' + (data.error || 'Unknown error'));
                            }
                          } catch (error) {
                            console.error('Error pausing queue:', error);
                            showError('Failed to pause queue');
                          }
                        }
                      }}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                    >
                      ⏸️ Pause
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                {status.printerApi?.queue?.jobs && status.printerApi.queue.jobs.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Delivery Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attempts
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Attempt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {status.printerApi?.queue?.jobs?.map((job: any) => (
                        <tr key={job.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {job.id.substring(0, 20)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {job.job.orderId ? (
                              <a 
                                href={`/admin/orders/${job.job.orderId}`}
                                className="text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                {job.job.orderId}
                              </a>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {job.job.customerInfo ? (
                              <div>
                                <div className="font-medium">{job.job.customerInfo.name}</div>
                                <div className="text-xs text-gray-500">{job.job.customerInfo.email}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {job.job.fileName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {job.job.deliveryNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              job.attempts > 3 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {job.attempts}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(job.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {job.lastAttemptAt ? formatDate(job.lastAttemptAt) : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete job ${job.id}?\n\nFile: ${job.job.fileName}\nOrder: ${job.job.orderId || 'N/A'}`)) {
                                  try {
                                    const response = await fetch(`/api/admin/printer-queue/job/${job.id}`, {
                                      method: 'DELETE'
                                    });
                                    const data = await response.json();
                                    if (data.success) {
                                      fetchStatus();
                                    } else {
                                      showError('Failed to delete job: ' + (data.error || 'Unknown error'));
                                    }
                                  } catch (error) {
                                    console.error('Error deleting job:', error);
                                    showError('Failed to delete job');
                                  }
                                }
                              }}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors text-xs"
                            >
                              <span className="flex items-center gap-1">
                                <TrashIcon size={14} className="w-3.5 h-3.5" />
                                Delete
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No jobs in queue
                  </div>
                )}
              </div>
            </div>

            {/* Retry Queue (funPrinting) */}
            {status.funPrinting?.retryQueue && status.funPrinting.retryQueue.total > 0 && (
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-orange-50">
                  <h2 className="text-xl font-semibold text-orange-900">
                    Retry Queue ({status.funPrinting.retryQueue.total} jobs)
                  </h2>
                  <p className="text-sm text-orange-700 mt-1">
                    Jobs waiting to be sent to printer API
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {status.funPrinting.retryQueue.jobs?.map((job: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">
                          Queued at: {formatDate(job.timestamp.toString())}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="text-center text-sm text-gray-500">
              Last updated: {formatDate(status.timestamp)}
            </div>
          </div>
        )}

        {status && !status.success && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
            <p className="text-red-700">{status.error || 'Failed to fetch printer status'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrinterMonitorPage() {
  return (
    <AdminGoogleAuth
      title="Printer Monitor"
      subtitle="Monitor printer API status and print queue"
    >
      <NotificationProvider>
        <PrinterMonitorContent />
      </NotificationProvider>
    </AdminGoogleAuth>
  );
}

