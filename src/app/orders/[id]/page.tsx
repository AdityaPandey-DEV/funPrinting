'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DownloadIcon, EyeIcon, DocumentIcon, WarningIcon } from '@/components/SocialIcons';

interface Order {
  _id: string;
  orderId: string;
  templateId?: string;
  templateName?: string;
  formData?: { [key: string]: string };
  filledPdfUrl?: string;
  filledDocxUrl?: string;
  status?: string;
  paymentStatus?: string;
  orderStatus?: string;
  amount: number;
  customerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  printingOptions: {
    pageSize: string;
    color: string;
    sided: string;
    copies: number;
    pageCount?: number;
  };
  deliveryOption: {
    type: string;
    address?: string;
    city?: string;
    pinCode?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id as string);
    }
  }, [params.id]);

  const fetchOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const result = await response.json();

      if (result.success) {
        setOrder(result.order);
      } else {
        setError(result.error || 'Failed to load order');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('Failed to load order');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = () => {
    if (order?.filledPdfUrl) {
      const link = document.createElement('a');
      link.href = order.filledPdfUrl;
      link.download = `${order.templateName || 'document'}_${order.orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadDOCX = () => {
    if (order?.filledDocxUrl) {
      const link = document.createElement('a');
      link.href = order.filledDocxUrl;
      link.download = `${order.templateName || 'document'}_${order.orderId}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <WarningIcon size={64} className="w-16 h-16 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <DocumentIcon size={64} className="w-16 h-16 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Order Not Found</h3>
          <p className="text-gray-600 mb-4">The requested order could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order #{order.orderId}
            </h1>
            <p className="text-gray-600">
              {order.templateName ? (
                <>Your personalized <strong>{order.templateName}</strong> is ready!</>
              ) : (
                <>Your document is ready!</>
              )}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Order Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>
              
              <div className="space-y-4">
                {order.templateName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Template</label>
                    <p className="text-gray-900">{order.templateName}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    order.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                    order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.paymentStatus ? order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1) : 'Unknown'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    order.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.orderStatus === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                    order.orderStatus === 'printing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.orderStatus ? order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1) : 'Unknown'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-gray-900">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-gray-900">₹{order.amount.toFixed(2)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="text-gray-900">{order.customerInfo.name}</p>
                  <p className="text-sm text-gray-600">{order.customerInfo.email}</p>
                  <p className="text-sm text-gray-600">{order.customerInfo.phone}</p>
                </div>
              </div>

              {/* Form Data */}
              {order.formData && Object.keys(order.formData).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Information</h3>
                  <div className="space-y-2">
                    {Object.entries(order.formData).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                        </span>
                        <span className="text-sm font-medium text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PDF Preview */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Preview</h2>
              
              {order.filledPdfUrl ? (
                <>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <iframe
                      src={order.filledPdfUrl}
                      className="w-full h-96"
                      title="PDF Preview"
                    />
                  </div>
                  
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={downloadPDF}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <DownloadIcon size={18} className="w-4.5 h-4.5" />
                        Download PDF
                      </span>
                    </button>
                    {order.filledDocxUrl && (
                      <button
                        onClick={downloadDOCX}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium"
                      >
                        <span className="flex items-center gap-2">
                          <DocumentIcon size={18} className="w-4.5 h-4.5" />
                          Download DOCX
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => window.open(order.filledPdfUrl, '_self')}
                      className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <EyeIcon size={18} className="w-4.5 h-4.5" />
                        View Full Screen
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="border border-gray-300 rounded-lg p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <DocumentIcon size={48} className="w-12 h-12 text-gray-500" />
                  </div>
                  <p className="text-gray-600">Document preview not available</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Your document has been automatically generated and uploaded to your order.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
