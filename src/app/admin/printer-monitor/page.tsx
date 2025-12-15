'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import AdminGoogleAuth from '@/components/admin/AdminGoogleAuth';
import AdminNavigation from '@/components/admin/AdminNavigation';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import NotificationProvider from '@/components/admin/NotificationProvider';
import { showError, showSuccess } from '@/lib/adminNotifications';
import { PrinterIcon, RefreshIcon, ErrorIcon } from '@/components/SocialIcons';

interface PrintSegment {
  segmentId: string;
  pageRange?: {
    start: number;
    end: number;
  };
  printMode?: 'color' | 'bw';
  copies?: number;
  paperSize?: 'A4' | 'A3';
  duplex?: boolean;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  printJobId?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  executionOrder?: number;
}

interface Order {
  _id: string;
  orderId: string;
  fileName: string;
  fileNames: string[];
  printStatus: 'pending' | 'printing' | 'printed';
  printerName: string;
  createdAt: string;
  printStartedAt?: string;
  printCompletedAt?: string;
  errorMessage?: string;
  printSegments?: PrintSegment[];
}

interface Printer {
  _id: string;
  name: string;
  printer_id?: string;
  printer_name?: string;
  status: 'online' | 'offline' | 'busy' | 'error' | 'maintenance';
  connectionType: string;
  queue_length: number;
  last_seen_at?: string;
  last_successful_print_at?: string;
  error_message?: string;
  driver_name?: string;
  system_name?: string;
}

interface MonitorData {
  orders: {
    pending: Order[];
    printing: Order[];
    printed: Order[];
  };
  printers: Printer[];
  recentLogs: Array<{
    action: string;
    orderId: string;
    printJobId?: string;
    adminEmail?: string;
    previousStatus?: string;
    newStatus?: string;
    reason?: string;
    timestamp: string;
  }>;
  metrics?: {
    prints_per_hour: number;
    failures_per_hour: number;
    average_print_start_delay: number;
    printer_offline_duration: number;
    timestamp: string;
  } | null;
  timestamp: string;
}

function PrinterMonitorContent() {
  const { data: session } = useSession();
  const [data, setData] = useState<MonitorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3); // seconds
  const [adminEmail, setAdminEmail] = useState<string>('');

  useEffect(() => {
    // Get admin email from session (Google auth) or localStorage
    const email = session?.user?.email || localStorage.getItem('adminEmail') || 'adityapandey.dev.in@gmail.com';
    setAdminEmail(email);
    
    // Store in localStorage if from session
    if (session?.user?.email && !localStorage.getItem('adminEmail')) {
      localStorage.setItem('adminEmail', session.user.email);
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/printer-monitor-data?t=${Date.now()}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        showError('Failed to fetch monitor data');
      }
    } catch (error) {
      console.error('Error fetching monitor data:', error);
      showError('Error fetching monitor data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleReprint = async (orderId: string) => {
    if (!confirm(`Reprint order ${orderId}?`)) return;

    try {
      const response = await fetch('/api/admin/print-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({ orderId, reason: 'Admin requested reprint' }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Order reset to pending for reprinting');
        fetchData();
      } else {
        showError(result.error || 'Failed to reprint order');
      }
    } catch (error) {
      showError('Error reprinting order');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm(`Cancel order ${orderId}?`)) return;

    try {
      const response = await fetch('/api/admin/print-actions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({ orderId, reason: 'Admin cancelled order' }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Order cancelled');
        fetchData();
      } else {
        showError(result.error || 'Failed to cancel order');
      }
    } catch (error) {
      showError('Error cancelling order');
    }
  };

  const handleReset = async (orderId: string) => {
    if (!confirm(`Reset order ${orderId} from printing to pending?`)) return;

    try {
      const response = await fetch('/api/admin/print-actions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({ orderId, reason: 'Admin reset stuck order' }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Order reset to pending');
        fetchData();
      } else {
        showError(result.error || 'Failed to reset order');
      }
    } catch (error) {
      showError('Error resetting order');
    }
  };

  const handleForcePrinted = async (orderId: string) => {
    if (!confirm(`Force mark order ${orderId} as printed? This should only be used if the order was already printed manually.`)) return;

    try {
      const response = await fetch('/api/admin/print-actions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({ 
          orderId, 
          reason: 'Admin force marked as printed',
          confirmed: true 
        }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Order marked as printed');
        fetchData();
      } else {
        showError(result.error || 'Failed to mark order as printed');
      }
    } catch (error) {
      showError('Error marking order as printed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'offline':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrintStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'printing':
        return 'bg-blue-100 text-blue-800';
      case 'printed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && !data) {
    return <LoadingSpinner message="Loading printer monitor data..." />;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <ErrorIcon size={48} className="mx-auto text-red-500 mb-4" />
          <p className="text-gray-600">Failed to load monitor data</p>
          <button
            onClick={fetchData}
            className="mt-4 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminNavigation
          title="Printer Monitor"
          subtitle="Real-time printing status from MongoDB"
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
                    <option value={2}>2s</option>
                    <option value={3}>3s</option>
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                  </select>
                </div>
              )}
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm"
              >
                <span className="flex items-center gap-2">
                  <RefreshIcon size={16} className="w-4 h-4" />
                  Refresh
                </span>
              </button>
            </div>
          }
        />

        {/* Printer Health Panel */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.printers.map((printer) => (
            <div key={printer._id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{printer.printer_name || printer.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(printer.status)}`}>
                  {printer.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Connection:</span>
                  <span className="text-gray-900">{printer.connectionType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Queue Length:</span>
                  <span className="text-gray-900 font-medium">{printer.queue_length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Seen:</span>
                  <span className="text-gray-900">{formatDate(printer.last_seen_at)}</span>
                </div>
                {printer.last_successful_print_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Print:</span>
                    <span className="text-gray-900">{formatDate(printer.last_successful_print_at)}</span>
                  </div>
                )}
                {printer.error_message && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-xs">
                    {printer.error_message}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Orders by Status */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Orders */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
              <h2 className="text-xl font-semibold text-yellow-900">
                Pending ({data.orders.pending.length})
              </h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {data.orders.pending.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No pending orders</p>
              ) : (
                <div className="space-y-3">
                  {data.orders.pending.map((order) => (
                    <div key={order._id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <a
                          href={`/admin/orders/${order._id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          {order.orderId}
                        </a>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPrintStatusColor(order.printStatus)}`}>
                          {order.printStatus}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{order.fileName}</p>
                      <p className="text-xs text-gray-500 mb-2">Created: {formatDate(order.createdAt)}</p>
                      {order.errorMessage && (
                        <p className="text-xs text-red-600 mb-2">{order.errorMessage}</p>
                      )}
                      {order.printSegments && order.printSegments.length > 0 && (
                        <div className="mt-2 mb-2 p-2 bg-gray-50 rounded text-xs">
                          <p className="font-medium text-gray-700 mb-1">Print Segments ({order.printSegments.length}):</p>
                          <div className="space-y-1">
                            {order.printSegments.map((seg) => (
                              <div key={seg.segmentId} className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  seg.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  seg.status === 'printing' ? 'bg-blue-100 text-blue-800' :
                                  seg.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {seg.status}
                                </span>
                                {seg.pageRange && (
                                  <span className="text-gray-600">
                                    Pages {seg.pageRange.start}-{seg.pageRange.end}
                                  </span>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  seg.printMode === 'color' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {seg.printMode === 'color' ? 'Color' : 'B&W'}
                                </span>
                                {seg.executionOrder && (
                                  <span className="text-gray-500">Order: {seg.executionOrder}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleReprint(order.orderId)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          Reprint
                        </button>
                        <button
                          onClick={() => handleCancel(order.orderId)}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Printing Orders */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <h2 className="text-xl font-semibold text-blue-900">
                Printing ({data.orders.printing.length})
              </h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {data.orders.printing.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No orders printing</p>
              ) : (
                <div className="space-y-3">
                  {data.orders.printing.map((order) => (
                    <div key={order._id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <a
                          href={`/admin/orders/${order._id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          {order.orderId}
                        </a>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPrintStatusColor(order.printStatus)}`}>
                          {order.printStatus}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{order.fileName}</p>
                      <p className="text-xs text-gray-500 mb-1">Printer: {order.printerName || 'N/A'}</p>
                      <p className="text-xs text-gray-500 mb-1">Started: {formatDate(order.printStartedAt)}</p>
                      {order.printSegments && order.printSegments.length > 0 && (
                        <div className="mt-2 mb-2 p-2 bg-blue-50 rounded text-xs border border-blue-200">
                          <p className="font-medium text-blue-900 mb-1">Print Segments ({order.printSegments.length}):</p>
                          <div className="space-y-1">
                            {order.printSegments.map((seg) => (
                              <div key={seg.segmentId} className="flex items-center gap-2 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  seg.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  seg.status === 'printing' ? 'bg-blue-100 text-blue-800' :
                                  seg.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {seg.status}
                                </span>
                                {seg.pageRange && (
                                  <span className="text-gray-700 font-medium">
                                    Pages {seg.pageRange.start}-{seg.pageRange.end}
                                  </span>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  seg.printMode === 'color' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {seg.printMode === 'color' ? 'Color' : 'B&W'}
                                </span>
                                {seg.executionOrder && (
                                  <span className="text-blue-600 font-medium">Exec: #{seg.executionOrder}</span>
                                )}
                                {seg.error && (
                                  <span className="text-red-600 text-xs">Error: {seg.error}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleReset(order.orderId)}
                          className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => handleForcePrinted(order.orderId)}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          Mark Printed
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Printed Orders */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
              <h2 className="text-xl font-semibold text-green-900">
                Printed ({data.orders.printed.length})
              </h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {data.orders.printed.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No printed orders (last 24h)</p>
              ) : (
                <div className="space-y-3">
                  {data.orders.printed.map((order) => (
                    <div key={order._id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <a
                          href={`/admin/orders/${order._id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          {order.orderId}
                        </a>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPrintStatusColor(order.printStatus)}`}>
                          {order.printStatus}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{order.fileName}</p>
                      <p className="text-xs text-gray-500 mb-1">Printer: {order.printerName || 'N/A'}</p>
                      <p className="text-xs text-gray-500">Completed: {formatDate(order.printCompletedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Dashboard */}
        {data.metrics && (
          <div className="mt-8 bg-white rounded-lg shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">System Metrics</h2>
              <p className="text-sm text-gray-600 mt-1">Last updated: {formatDate(data.metrics.timestamp)}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-600">Prints per Hour</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{data.metrics.prints_per_hour}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-600">Failures per Hour</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{data.metrics.failures_per_hour}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-yellow-600">Avg. Print Delay</p>
                  <p className="text-2xl font-bold text-yellow-900 mt-1">
                    {data.metrics.average_print_start_delay.toFixed(1)}s
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-orange-600">Printer Offline</p>
                  <p className="text-2xl font-bold text-orange-900 mt-1">
                    {Math.round(data.metrics.printer_offline_duration)}s
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Last updated: {formatDate(data.timestamp)}
        </div>
      </div>
    </div>
  );
}

export default function PrinterMonitorPage() {
  return (
    <AdminGoogleAuth
      title="Printer Monitor"
      subtitle="Real-time printing status from MongoDB"
    >
      <NotificationProvider>
        <PrinterMonitorContent />
      </NotificationProvider>
    </AdminGoogleAuth>
  );
}
