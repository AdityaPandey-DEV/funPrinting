'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Template {
  id: string;
  _id: string;
  name: string;
  description: string;
  category: string;
  placeholders: string[];
  pdfUrl: string;
  wordUrl?: string;
  isPublic: boolean;
  createdByType: string;
  createdByEmail?: string;
  createdByName?: string;
  isPaid: boolean;
  price?: number;
  allowFreeDownload?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreatorEarning {
  _id: string;
  templateId: string;
  orderId: string;
  razorpayPaymentId?: string;
  amount: number;
  platformShareAmount?: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
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

interface PayoutSettings {
  upiId: string;
  bankDetails: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
}

function MyTemplatesContent() {
  const { status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Earnings modal state
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [earnings, setEarnings] = useState<CreatorEarning[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    platformEarnings: 0,
    totalCount: 0,
    pendingCount: 0,
    paidCount: 0,
  });
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings>({
    upiId: '',
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
    },
  });
  const [showEditPayout, setShowEditPayout] = useState(false);
  const [password, setPassword] = useState('');
  const [updatingPayout, setUpdatingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (status === 'authenticated') {
      fetchTemplates();
    }
  }, [status, router]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates/my-templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      } else {
        setError('Failed to fetch templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEarnings = async (template: Template) => {
    setSelectedTemplate(template);
    setShowEarningsModal(true);
    setEarningsLoading(true);
    setEarnings([]);
    setPayoutError(null);
    
    try {
      // Fetch earnings for this template
      const earningsResponse = await fetch(`/api/templates/${template.id}/earnings`);
      const earningsData = await earningsResponse.json();
      
      if (earningsData.success) {
        setEarnings(earningsData.earnings || []);
        setEarningsSummary(earningsData.summary || {
          totalEarnings: 0,
          pendingEarnings: 0,
          paidEarnings: 0,
          platformEarnings: 0,
          totalCount: 0,
          pendingCount: 0,
          paidCount: 0,
        });
      }
      
      // Fetch payout settings
      const payoutResponse = await fetch('/api/user/payout-settings');
      const payoutData = await payoutResponse.json();
      
      if (payoutData.success) {
        setPayoutSettings(payoutData.payoutSettings);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
      setPayoutError('Failed to load earnings data');
    } finally {
      setEarningsLoading(false);
    }
  };

  const handleUpdatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingPayout(true);
    setPayoutError(null);
    
    try {
      const response = await fetch('/api/user/payout-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payoutSettings,
          password,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPayoutSettings(data.payoutSettings);
        setShowEditPayout(false);
        setPassword('');
        setPayoutError(null);
        alert('Payout settings updated successfully!');
      } else {
        setPayoutError(data.error || 'Failed to update payout settings');
      }
    } catch (error) {
      console.error('Error updating payout settings:', error);
      setPayoutError('An error occurred while updating payout settings');
    } finally {
      setUpdatingPayout(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      setDeleteLoading(templateId);
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId));
        setShowDeleteModal(false);
        setSelectedTemplate(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    } finally {
      setDeleteLoading(null);
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

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 text-lg mb-2">Error Loading Templates</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchTemplates}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Templates</h1>
            <p className="text-gray-600">Manage your personal templates</p>
          </div>
          <Link
            href="/templates/create"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create New Template
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Templates</label>
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="lab-manual">Lab Manual</option>
                <option value="assignment">Assignment</option>
                <option value="report">Report</option>
                <option value="certificate">Certificate</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchTemplates}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {searchTerm || filterCategory !== 'all' ? 'No Templates Found' : 'No Templates Yet'}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterCategory !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Create your first template to get started!'
              }
            </p>
            {!searchTerm && filterCategory === 'all' && (
              <Link
                href="/templates/create"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-block"
              >
                Create First Template
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                {/* Template Preview */}
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
                  <div className="text-center">
                    <div className="text-6xl mb-2">📄</div>
                    <p className="text-sm text-gray-600">Template</p>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {template.category.replace('-', ' ')}
                  </div>

                  {/* Public Badge */}
                  {template.isPublic && (
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Public
                    </div>
                  )}
                  
                  {/* Paid Badge */}
                  {template.isPaid && (template.price ?? 0) > 0 && (
                    <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      ₹{template.price}
                    </div>
                  )}
                </div>

                {/* Template Info */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {template.name}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Monetization Info */}
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className={template.isPaid && (template.price ?? 0) > 0 
                      ? 'text-orange-600 font-semibold' 
                      : 'text-green-600 font-semibold'}>
                      {template.isPaid && (template.price ?? 0) > 0 
                        ? `Paid • ₹${template.price}` 
                        : 'Free'}
                    </span>
                    <span className="text-gray-500">
                      {template.allowFreeDownload !== false 
                        ? 'Download: Allowed' 
                        : 'Download: After payment'}
                    </span>
                  </div>

                  {/* Placeholders count and date */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-500">
                      {template.placeholders.length} dynamic fields
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleViewEarnings(template)}
                      className="bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => router.push(`/templates/edit/${template.id}`)}
                      className="bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowDeleteModal(true);
                      }}
                      className="bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{templates.length}</div>
            <div className="text-gray-600">Total Templates</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {templates.filter(t => t.isPublic).length}
            </div>
            <div className="text-gray-600">Public Templates</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {templates.filter(t => t.isPaid && (t.price ?? 0) > 0).length}
            </div>
            <div className="text-gray-600">Paid Templates</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {templates.filter(t => !t.isPublic).length}
            </div>
            <div className="text-gray-600">Private Templates</div>
          </div>
        </div>
      </div>

      {/* Earnings Detail Modal */}
      {showEarningsModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Template Earnings</h2>
                  <p className="text-gray-600 mt-1">{selectedTemplate.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowEarningsModal(false);
                    setShowEditPayout(false);
                    setSelectedTemplate(null);
                    setEarnings([]);
                    setPassword('');
                    setPayoutError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {earningsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading earnings...</p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4">
                      <p className="text-sm text-blue-600 font-medium">Total Earnings</p>
                      <p className="text-2xl font-bold text-blue-800">₹{earningsSummary.totalEarnings.toLocaleString()}</p>
                      <p className="text-xs text-blue-500">{earningsSummary.totalCount} transactions</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-lg p-4">
                      <p className="text-sm text-yellow-600 font-medium">Pending Payouts</p>
                      <p className="text-2xl font-bold text-yellow-800">₹{earningsSummary.pendingEarnings.toLocaleString()}</p>
                      <p className="text-xs text-yellow-500">{earningsSummary.pendingCount} pending</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium">Paid Out</p>
                      <p className="text-2xl font-bold text-green-800">₹{earningsSummary.paidEarnings.toLocaleString()}</p>
                      <p className="text-xs text-green-500">{earningsSummary.paidCount} completed</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-lg p-4">
                      <p className="text-sm text-purple-600 font-medium">Platform Share</p>
                      <p className="text-2xl font-bold text-purple-800">₹{earningsSummary.platformEarnings.toLocaleString()}</p>
                      <p className="text-xs text-purple-500">Commission</p>
                    </div>
                  </div>

                  {/* Earnings Table */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings History</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {earnings.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                No earnings found for this template yet
                              </td>
                            </tr>
                          ) : (
                            earnings.map((earning) => (
                              <tr key={earning._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                  {earning.orderId}
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
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payout Settings */}
                  <div className="border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Payout Settings</h3>
                      {!showEditPayout && (
                        <button
                          onClick={() => setShowEditPayout(true)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Edit Payout Details
                        </button>
                      )}
                    </div>

                    {showEditPayout ? (
                      <form onSubmit={handleUpdatePayout} className="space-y-4">
                        {payoutError && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {payoutError}
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password (required to update)
                          </label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your password"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID</label>
                          <input
                            type="text"
                            value={payoutSettings.upiId}
                            onChange={(e) => setPayoutSettings({ ...payoutSettings, upiId: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="yourname@upi"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name</label>
                            <input
                              type="text"
                              value={payoutSettings.bankDetails.accountHolderName}
                              onChange={(e) => setPayoutSettings({
                                ...payoutSettings,
                                bankDetails: { ...payoutSettings.bankDetails, accountHolderName: e.target.value }
                              })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                            <input
                              type="text"
                              value={payoutSettings.bankDetails.accountNumber}
                              onChange={(e) => setPayoutSettings({
                                ...payoutSettings,
                                bankDetails: { ...payoutSettings.bankDetails, accountNumber: e.target.value }
                              })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                            <input
                              type="text"
                              value={payoutSettings.bankDetails.ifscCode}
                              onChange={(e) => setPayoutSettings({
                                ...payoutSettings,
                                bankDetails: { ...payoutSettings.bankDetails, ifscCode: e.target.value.toUpperCase() }
                              })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="ABCD0123456"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                            <input
                              type="text"
                              value={payoutSettings.bankDetails.bankName}
                              onChange={(e) => setPayoutSettings({
                                ...payoutSettings,
                                bankDetails: { ...payoutSettings.bankDetails, bankName: e.target.value }
                              })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex space-x-3">
                          <button
                            type="submit"
                            disabled={updatingPayout}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {updatingPayout ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditPayout(false);
                              setPassword('');
                              setPayoutError(null);
                              // Reload payout settings
                              fetch('/api/user/payout-settings')
                                .then(res => res.json())
                                .then(data => {
                                  if (data.success) {
                                    setPayoutSettings(data.payoutSettings);
                                  }
                                });
                            }}
                            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4">
                        {payoutSettings.upiId ? (
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">UPI ID:</div>
                            <div className="text-sm font-mono text-blue-600">{payoutSettings.upiId}</div>
                          </div>
                        ) : null}
                        {payoutSettings.bankDetails.accountNumber ? (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Bank Account:</div>
                            <div className="text-sm">
                              <div className="font-medium">{payoutSettings.bankDetails.accountHolderName}</div>
                              <div className="font-mono">{payoutSettings.bankDetails.accountNumber}</div>
                              <div className="text-gray-600">
                                {payoutSettings.bankDetails.bankName} • IFSC: {payoutSettings.bankDetails.ifscCode}
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {!payoutSettings.upiId && !payoutSettings.bankDetails.accountNumber && (
                          <p className="text-sm text-gray-500">No payout information configured</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Template</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{selectedTemplate.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedTemplate(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedTemplate.id)}
                disabled={deleteLoading === selectedTemplate.id}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading === selectedTemplate.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyTemplatesPage() {
  return <MyTemplatesContent />;
}
