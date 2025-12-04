'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavigation from '@/components/admin/AdminNavigation';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import AdminGoogleAuth from '@/components/admin/AdminGoogleAuth';
import NotificationProvider from '@/components/admin/NotificationProvider';
import { showSuccess, showError } from '@/lib/adminNotifications';
import { buttonClasses } from '@/lib/adminUtils';

interface CreatorEarning {
  _id: string;
  creatorUserId: {
    _id: string;
    name: string;
    email: string;
  } | string;
  templateId: string;
  orderId: string;
  razorpayPaymentId?: string;
  amount: number;
  platformShareAmount?: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  payoutMethod?: 'upi' | 'bank';
  payoutDestination?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  platformEarnings: number;
  totalCount: number;
  pendingCount: number;
  paidCount: number;
}

function AdminCreatorEarningsContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [earnings, setEarnings] = useState<CreatorEarning[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    platformEarnings: 0,
    totalCount: 0,
    pendingCount: 0,
    paidCount: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processing, setProcessing] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string>('');

  const fetchEarnings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      
      const response = await fetch(`/api/admin/creator-earnings?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setEarnings(data.earnings || []);
        setSummary(data.summary || {
          totalEarnings: 0,
          pendingEarnings: 0,
          paidEarnings: 0,
          platformEarnings: 0,
          totalCount: 0,
          pendingCount: 0,
          paidCount: 0,
        });
      } else {
        showError('Failed to fetch earnings');
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
      showError('An error occurred while fetching earnings');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const handleProcessPayout = async (earningId: string) => {
    setProcessing(earningId);
    try {
      const response = await fetch('/api/admin/creator-earnings/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earningId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSuccess('Payout processed successfully!');
        fetchEarnings();
      } else {
        showError(data.error || 'Failed to process payout');
      }
    } catch (error) {
      showError('An error occurred while processing payout');
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkAsPaid = async (earningId: string) => {
    setMarkingPaid(earningId);
    try {
      const response = await fetch('/api/admin/creator-earnings/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          earningId, 
          markAsPaid: true,
          transactionId: transactionId || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSuccess('Marked as paid successfully!');
        setTransactionId('');
        fetchEarnings();
      } else {
        showError(data.error || 'Failed to mark as paid');
      }
    } catch (error) {
      showError('An error occurred');
    } finally {
      setMarkingPaid(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getCreatorInfo = (earning: CreatorEarning) => {
    if (typeof earning.creatorUserId === 'object' && earning.creatorUserId !== null) {
      const creator = earning.creatorUserId as any;
      return {
        name: creator.name,
        email: creator.email,
        upiId: creator.upiId,
        bankDetails: creator.bankDetails,
      };
    }
    return {
      name: 'Unknown',
      email: String(earning.creatorUserId),
      upiId: undefined,
      bankDetails: undefined,
    };
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading creator earnings..." size="large" />;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <AdminNavigation
            title="Creator Earnings"
            showBackButton
            backUrl="/admin"
            actions={
              <button
                onClick={() => router.push('/admin')}
                className={buttonClasses.secondary}
              >
                Back to Dashboard
              </button>
            }
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total Creator Earnings</p>
              <p className="text-2xl font-bold text-blue-800">₹{summary.totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-blue-500">{summary.totalCount} transactions</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-lg p-4">
              <p className="text-sm text-yellow-600 font-medium">Pending Payouts</p>
              <p className="text-2xl font-bold text-yellow-800">₹{summary.pendingEarnings.toLocaleString()}</p>
              <p className="text-xs text-yellow-500">{summary.pendingCount} pending</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Paid Out</p>
              <p className="text-2xl font-bold text-green-800">₹{summary.paidEarnings.toLocaleString()}</p>
              <p className="text-xs text-green-500">{summary.paidCount} completed</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Platform Earnings</p>
              <p className="text-2xl font-bold text-purple-800">₹{summary.platformEarnings.toLocaleString()}</p>
              <p className="text-xs text-purple-500">Commission collected</p>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Earnings Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payout To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {earnings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No earnings found
                    </td>
                  </tr>
                ) : (
                  earnings.map((earning) => {
                    const creator = getCreatorInfo(earning);
                    return (
                      <tr key={earning._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{creator.name}</div>
                          <div className="text-sm text-gray-500">{creator.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          {creator.upiId ? (
                            <div>
                              <div className="text-xs text-gray-500">UPI:</div>
                              <div className="text-sm font-mono text-blue-600 select-all">{creator.upiId}</div>
                            </div>
                          ) : creator.bankDetails?.accountNumber ? (
                            <div className="text-xs">
                              <div className="text-gray-500">{creator.bankDetails.bankName || 'Bank'}</div>
                              <div className="font-mono">{creator.bankDetails.accountNumber}</div>
                              <div className="text-gray-500">IFSC: {creator.bankDetails.ifscCode}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-red-500">No payout info</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">₹{earning.amount}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-blue-600">₹{earning.platformShareAmount || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadge(earning.status)}`}>
                            {earning.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(earning.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {(earning.status === 'pending' || earning.status === 'failed') && (
                            <div className="space-y-2">
                              {markingPaid === earning._id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder="Transaction ID (optional)"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    className="border border-gray-300 rounded px-2 py-1 text-xs w-32"
                                  />
                                  <button
                                    onClick={() => handleMarkAsPaid(earning._id)}
                                    className="text-green-600 hover:text-green-800 font-medium text-xs"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => { setMarkingPaid(null); setTransactionId(''); }}
                                    className="text-gray-500 hover:text-gray-700 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setMarkingPaid(earning._id)}
                                  className="text-green-600 hover:text-green-800 font-medium"
                                >
                                  ✓ Mark as Paid
                                </button>
                              )}
                            </div>
                          )}
                          {earning.status === 'paid' && (
                            <span className="text-gray-400 text-xs">Completed</span>
                          )}
                          {earning.status === 'processing' && (
                            <span className="text-blue-500 text-xs">In Progress...</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCreatorEarningsPage() {
  return (
    <AdminGoogleAuth 
      title="Creator Earnings"
      subtitle="Manage and track creator template earnings"
    >
      <NotificationProvider>
        <AdminCreatorEarningsContent />
      </NotificationProvider>
    </AdminGoogleAuth>
  );
}

