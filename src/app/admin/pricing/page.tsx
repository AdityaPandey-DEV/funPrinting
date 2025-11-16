'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavigation from '@/components/admin/AdminNavigation';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import AdminGoogleAuth from '@/components/admin/AdminGoogleAuth';
import NotificationProvider from '@/components/admin/NotificationProvider';
import { showSuccess, showError } from '@/lib/adminNotifications';
import { formInputClasses, buttonClasses } from '@/lib/adminUtils';

interface PricingData {
  basePrices: {
    A4: number;
    A3: number;
  };
  multipliers: {
    color: number;
    doubleSided: number;
  };
  deliveryCharges: {
    pickup: number;
    delivery: {
      '0-5': number;
      '5-10': number;
      '10-15': number;
      '15-20': number;
      '20+': number;
    };
  };
  additionalServices: {
    binding: number;
    resumeTemplate: number;
    minServiceFee: number;
    minServiceFeePageLimit: number;
  };
}

function AdminPricingPageContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pricing, setPricing] = useState<PricingData>({
    basePrices: { A4: 5, A3: 10 },
    multipliers: { color: 2, doubleSided: 1.5 },
    deliveryCharges: {
      pickup: 0,
      delivery: {
        '0-5': 10,
        '5-10': 20,
        '10-15': 30,
        '15-20': 40,
        '20+': 50,
      },
    },
    additionalServices: {
      binding: 20,
      resumeTemplate: 0,
      minServiceFee: 5,
      minServiceFeePageLimit: 1,
    },
  });

  // Ensure delivery charges are always properly structured
  const ensureDeliveryCharges = (pricingData: any) => {
    if (!pricingData.deliveryCharges?.delivery) {
      return {
        ...pricingData,
        deliveryCharges: {
          pickup: pricingData.deliveryCharges?.pickup || 0,
          delivery: {
            '0-5': 10,
            '5-10': 20,
            '10-15': 30,
            '15-20': 40,
            '20+': 50,
          },
        },
      };
    }
    return pricingData;
  };

  const fetchPricing = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/pricing');
      const data = await response.json();

      if (data.success) {
        console.log('Fetched pricing data:', data.pricing);
        const validatedPricing = ensureDeliveryCharges(data.pricing);
        setPricing(validatedPricing);
      } else {
        showError('Failed to fetch pricing');
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
      showError('An error occurred while fetching pricing');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const handleInputChange = (section: string, field: string, value: number) => {
    setPricing(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof PricingData],
        [field]: value,
      },
    }));
  };

  const handleDeliveryChange = (distance: string, value: number) => {
    setPricing(prev => ({
      ...prev,
      deliveryCharges: {
        ...prev.deliveryCharges,
        delivery: {
          ...prev.deliveryCharges.delivery,
          [distance]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log('Sending pricing data:', JSON.stringify(pricing, null, 2));
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pricing,
          updatedBy: 'admin@printservice.com',
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Pricing updated successfully!');
      } else {
        showError(`Failed to update pricing: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
      showError('An error occurred while updating pricing');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading pricing..." size="large" />;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <AdminNavigation
            title="Pricing Management"
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

          <div className="space-y-8">
            {/* Base Prices */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📄</span>
                Base Prices (per page)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    A4 Size (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={formInputClasses.white}
                    value={pricing.basePrices.A4}
                    onChange={(e) => handleInputChange('basePrices', 'A4', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    A3 Size (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={formInputClasses.white}
                    value={pricing.basePrices.A3}
                    onChange={(e) => handleInputChange('basePrices', 'A3', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Multipliers */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🔢</span>
                Multipliers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Printing (multiplier)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    className={formInputClasses.white}
                    value={pricing.multipliers.color}
                    onChange={(e) => handleInputChange('multipliers', 'color', parseFloat(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Double-sided (multiplier)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    className={formInputClasses.white}
                    value={pricing.multipliers.doubleSided}
                    onChange={(e) => handleInputChange('multipliers', 'doubleSided', parseFloat(e.target.value) || 1)}
                  />
                </div>
              </div>
            </div>

            {/* Delivery Charges */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-orange-50 to-amber-50 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🚚</span>
                Delivery Charges
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={formInputClasses.white}
                    value={pricing.deliveryCharges.pickup}
                    onChange={(e) => handleInputChange('deliveryCharges', 'pickup', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Home Delivery by Distance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.entries(pricing.deliveryCharges.delivery || {}).map(([distance, charge]) => (
                    <div key={distance} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        {distance} km (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={formInputClasses.white}
                        value={charge}
                        onChange={(e) => handleDeliveryChange(distance, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Services */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">⚙️</span>
                Additional Services
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Binding (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={formInputClasses.white}
                    value={pricing.additionalServices.binding}
                    onChange={(e) => handleInputChange('additionalServices', 'binding', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resume Template (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={formInputClasses.white}
                    value={pricing.additionalServices.resumeTemplate}
                    onChange={(e) => handleInputChange('additionalServices', 'resumeTemplate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Service Fee (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={formInputClasses.white}
                    value={pricing.additionalServices.minServiceFee}
                    onChange={(e) => handleInputChange('additionalServices', 'minServiceFee', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Applied when page count exceeds the limit below
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Service Fee Page Limit
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className={formInputClasses.white}
                    value={pricing.additionalServices.minServiceFeePageLimit}
                    onChange={(e) => handleInputChange('additionalServices', 'minServiceFeePageLimit', parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum service fee applies when pages &gt; this limit
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {isSaving ? '💾 Saving...' : '💾 Save Pricing'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPricingPage() {
  return (
    <AdminGoogleAuth 
      title="Admin Pricing"
      subtitle="Sign in with Google to manage service pricing and rates"
    >
      <NotificationProvider>
        <AdminPricingPageContent />
      </NotificationProvider>
    </AdminGoogleAuth>
  );
}
