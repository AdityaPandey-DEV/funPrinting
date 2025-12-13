'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PayoutSettings {
  upiId: string;
  bankDetails: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
}

export default function PayoutSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [password, setPassword] = useState('');
  
  const [settings, setSettings] = useState<PayoutSettings>({
    upiId: '',
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
    },
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/user/payout-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.payoutSettings) {
          setSettings(data.payoutSettings);
        }
      }
    } catch (error) {
      console.error('Error fetching payout settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/payout-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Payout settings saved successfully!' });
        setPassword(''); // Clear password after successful save
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/my-templates" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to My Templates
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Payout Settings</h1>
          <p className="mt-2 text-gray-600">
            Set up your payment details to receive earnings from your paid templates.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* UPI Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">📱</span>
              UPI Payment
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter your UPI ID to receive payments directly to your UPI-enabled bank account.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UPI ID
              </label>
              <input
                type="text"
                value={settings.upiId}
                onChange={(e) => setSettings(prev => ({ ...prev, upiId: e.target.value }))}
                placeholder="yourname@upi"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Example: yourname@paytm, yourname@ybl, yourname@okaxis
              </p>
            </div>
          </div>

          {/* Bank Account Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">🏦</span>
              Bank Account (Optional)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Add your bank account details as a backup payment method. This is optional if you have UPI set up.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={settings.bankDetails.accountHolderName}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    bankDetails: { ...prev.bankDetails, accountHolderName: e.target.value }
                  }))}
                  placeholder="As per bank records"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={settings.bankDetails.bankName}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    bankDetails: { ...prev.bankDetails, bankName: e.target.value }
                  }))}
                  placeholder="e.g., State Bank of India"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={settings.bankDetails.accountNumber}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    bankDetails: { ...prev.bankDetails, accountNumber: e.target.value.replace(/\D/g, '') }
                  }))}
                  placeholder="9-18 digit account number"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={settings.bankDetails.ifscCode}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    bankDetails: { ...prev.bankDetails, ifscCode: e.target.value.toUpperCase() }
                  }))}
                  placeholder="e.g., SBIN0001234"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">💡 How Payouts Work</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• When someone purchases your paid template, you earn the template price minus platform commission.</li>
              <li>• The platform commission is currently set by the admin (typically 20%).</li>
              <li>• Earnings are accumulated and paid out periodically.</li>
              <li>• UPI is the preferred and fastest payment method.</li>
            </ul>
          </div>

          {/* Password Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password (required to update)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Payout Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


