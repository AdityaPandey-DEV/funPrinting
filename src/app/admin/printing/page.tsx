'use client';

import { useState, useEffect } from 'react';
import { useAdminInfo } from '@/hooks/useAdminInfo';

interface PrintJob {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  fileName: string;
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  printerName?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedDuration?: number;
  actualDuration?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  printingOptions: {
    pageSize: string;
    color: string;
    sided: string;
    copies: number;
    pageCount: number;
  };
}

interface Printer {
  _id: string;
  name: string;
  printerModel: string;
  manufacturer: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  currentJob?: string;
  queueLength: number;
  totalPagesPrinted: number;
  autoPrintEnabled: boolean;
  capabilities: {
    supportsColor: boolean;
    supportsDuplex: boolean;
    maxCopies: number;
  };
}

interface QueueStatus {
  totalJobs: number;
  pendingJobs: number;
  printingJobs: number;
  completedJobs: number;
  failedJobs: number;
  availablePrinters: number;
  busyPrinters: number;
}

export default function PrintingDashboard() {
  const { adminInfo } = useAdminInfo();
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'jobs' | 'printers' | 'status'>('status');

  useEffect(() => {
    fetchData();
    // Refresh data every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [jobsResponse, printersResponse, statusResponse] = await Promise.all([
        fetch('/api/printing/jobs?limit=50'),
        fetch('/api/printing/printers'),
        fetch('/api/printing/auto-print')
      ]);

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setPrintJobs(jobsData.jobs || []);
      }

      if (printersResponse.ok) {
        const printersData = await printersResponse.json();
        setPrinters(printersData.printers || []);
      }

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setQueueStatus(statusData.status);
      }
    } catch (error) {
      console.error('Error fetching printing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'printing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrinterStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading printing dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🖨️ Printing Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage print jobs, monitor printers, and track printing status
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'status', label: 'Queue Status', icon: '📊' },
              { id: 'jobs', label: 'Print Jobs', icon: '📄' },
              { id: 'printers', label: 'Printers', icon: '🖨️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Queue Status Tab */}
        {selectedTab === 'status' && queueStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📄</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{queueStatus.totalJobs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">⏳</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{queueStatus.pendingJobs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">🖨️</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Printing</p>
                  <p className="text-2xl font-bold text-gray-900">{queueStatus.printingJobs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{queueStatus.completedJobs}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Jobs Tab */}
        {selectedTab === 'jobs' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Print Jobs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Options
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Printer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {printJobs.map((job) => (
                    <tr key={job._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{job.orderNumber}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(job.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{job.customerName}</div>
                        <div className="text-sm text-gray-500">{job.customerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{job.fileName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.printingOptions.pageSize} • {job.printingOptions.color} • {job.printingOptions.copies} copies
                        </div>
                        <div className="text-sm text-gray-500">
                          {job.printingOptions.pageCount} pages
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        <br />
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.printerName || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.actualDuration ? `${job.actualDuration}m` : 
                         job.estimatedDuration ? `~${job.estimatedDuration}m` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Printers Tab */}
        {selectedTab === 'printers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {printers.map((printer) => (
              <div key={printer._id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{printer.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPrinterStatusColor(printer.status)}`}>
                    {printer.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>Model:</strong> {printer.printerModel}</div>
                  <div><strong>Manufacturer:</strong> {printer.manufacturer}</div>
                  <div><strong>Queue Length:</strong> {printer.queueLength}</div>
                  <div><strong>Total Pages:</strong> {printer.totalPagesPrinted}</div>
                  <div><strong>Auto Print:</strong> {printer.autoPrintEnabled ? '✅ Enabled' : '❌ Disabled'}</div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {printer.capabilities.supportsColor && (
                      <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        Color
                      </span>
                    )}
                    {printer.capabilities.supportsDuplex && (
                      <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        Duplex
                      </span>
                    )}
                    <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      Max {printer.capabilities.maxCopies} copies
                    </span>
                  </div>
                </div>

                {printer.currentJob && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      <strong>Current Job:</strong> {printer.currentJob}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
