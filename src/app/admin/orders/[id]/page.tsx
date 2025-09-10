'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminNavigation from '@/components/admin/AdminNavigation';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { getStatusColor, getPaymentStatusColor, formatDate } from '@/lib/adminUtils';

interface Order {
  _id: string;
  orderId: string;
  customerInfo?: {
    name: string;
    phone: string;
    email: string;
  };
  studentInfo?: {
    name: string;
    rollNo?: string;
    hostel?: string;
    roomNo?: string;
    phone: string;
    email: string;
    studentType?: 'hostler' | 'non-hostler';
    block?: string;
    address?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    landmark?: string;
  };
  orderType: 'file' | 'template';
  fileURL?: string;
  fileType?: string;
  originalFileName?: string;
  templateData?: {
    templateType: string;
    formData: Record<string, string | number | boolean>;
    generatedPDF?: string;
  };
  printingOptions: {
    pageSize: 'A4' | 'A3';
    color: 'color' | 'bw' | 'mixed';
    sided: 'single' | 'double';
    copies: number;
    pageCount?: number;
    serviceOption?: 'binding' | 'file' | 'service';
    pageColors?: {
      colorPages: number[];
      bwPages: number[];
    };
  };
  deliveryOption?: {
    type: 'pickup' | 'delivery';
    pickupLocation?: string;
    deliveryCharge?: number;
    address?: string;
    city?: string;
    pinCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  paymentStatus: 'pending' | 'completed' | 'failed';
  orderStatus: 'pending' | 'printing' | 'dispatched' | 'delivered';
  amount: number;
  expectedDate?: string | Date;
  createdAt: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id as string);
      setPdfLoaded(false); // Reset PDF loaded state when order changes
    }
  }, [params.id]);

  // Add timeout to prevent stuck loading state
  useEffect(() => {
    if (order && order.fileURL && !pdfLoaded) {
      const timeout = setTimeout(() => {
        console.log('PDF loading timeout, showing iframe anyway');
        setPdfLoaded(true);
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [order, order?.fileURL, pdfLoaded]);

  const fetchOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrder(data.order);
      } else {
        alert('Failed to fetch order details');
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('Failed to fetch order details');
      router.push('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${order._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderStatus: newStatus }),
      });

      const data = await response.json();
      
      if (data.success) {
        setOrder({ ...order, orderStatus: newStatus as any });
        alert('Order status updated successfully!');
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading order details..." size="large" />;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminNavigation
          title={`Order #${order.orderId}`}
          subtitle={`Placed on ${formatDate(order.createdAt, 'long')}`}
          showBackButton
          backUrl="/admin"
          actions={
            <>
              <select
                value={order.orderStatus}
                onChange={(e) => updateOrderStatus(e.target.value)}
                disabled={isUpdating}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black disabled:opacity-50"
              >
                <option value="pending">Pending</option>
                <option value="printing">Printing</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
              </select>
              
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Order Details */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Type:</span>
                  <span className="font-medium">
                    {order.orderType === 'file' ? 'File Upload' : 'Template Generated'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Page Size:</span>
                  <span className="font-medium">{order.printingOptions.pageSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Color:</span>
                  <span className="font-medium">
                    {order.printingOptions.color === 'color' ? 'Color' : 
                     order.printingOptions.color === 'bw' ? 'Black & White' : 
                     'Mixed'}
                  </span>
                </div>
                {order.printingOptions.color === 'mixed' && order.printingOptions.pageColors && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Color Pages:</span>
                      <span className="font-medium text-green-600">
                        {order.printingOptions.pageColors.colorPages.length} pages
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">B&W Pages:</span>
                      <span className="font-medium text-gray-600">
                        {order.printingOptions.pageColors.bwPages.length} pages
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Sided:</span>
                  <span className="font-medium">
                    {order.printingOptions.sided === 'double' ? 'Double-sided' : 'Single-sided'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Copies:</span>
                  <span className="font-medium">{order.printingOptions.copies}</span>
                </div>
                {order.printingOptions.pageCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pages:</span>
                    <span className="font-medium">{order.printingOptions.pageCount}</span>
                  </div>
                )}
                {order.printingOptions.serviceOption && order.printingOptions.pageCount && order.printingOptions.pageCount > 1 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Option:</span>
                    <span className="font-medium">
                      {order.printingOptions.serviceOption === 'binding' ? '📎 Binding' :
                       order.printingOptions.serviceOption === 'file' ? '🗂️ File Handling' :
                       '✅ Service Fee'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="text-xl font-bold text-gray-900">₹{order.amount}</span>
                </div>
                {order.expectedDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected Delivery:</span>
                    <span className="font-medium text-blue-600">
                      {formatDate(order.expectedDate.toString(), 'long')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Student Information */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">👤 Customer Information</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium">
                    {order.customerInfo?.name || order.studentInfo?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium">
                    {order.customerInfo?.phone || order.studentInfo?.phone || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">
                    {order.customerInfo?.email || order.studentInfo?.email || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            {order.deliveryOption && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">🚚 Delivery Information</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      order.deliveryOption.type === 'pickup' 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}>
                      {order.deliveryOption.type === 'pickup' ? 'Pickup' : 'Delivery'}
                    </span>
                  </div>
                  {order.deliveryOption.type === 'pickup' && order.deliveryOption.pickupLocation && (
                    <div>
                      <span className="text-gray-600">Pickup Location:</span>
                      <span className="ml-2 font-medium">{order.deliveryOption.pickupLocation}</span>
                    </div>
                  )}
                  {order.deliveryOption.type === 'delivery' && order.deliveryOption.deliveryCharge && (
                    <div>
                      <span className="text-gray-600">Delivery Charge:</span>
                      <span className="ml-2 font-medium">₹{order.deliveryOption.deliveryCharge}</span>
                    </div>
                  )}
                  {order.deliveryOption.address && (
                    <div>
                      <span className="text-gray-600">Delivery Address:</span>
                      <span className="ml-2 font-medium">
                        {order.deliveryOption.address}
                        {order.deliveryOption.city && `, ${order.deliveryOption.city}`}
                        {order.deliveryOption.pinCode && ` - ${order.deliveryOption.pinCode}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Information */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Status Information</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Order Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.orderStatus)}`}>
                    {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                    Payment {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - PDF Preview */}
          <div className="space-y-6">
            {/* PDF Preview */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📄 Document Preview</h2>
              
              {order.orderType === 'file' && order.fileURL ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Original File</span>
                    <a
                      href={`/api/admin/pdf-viewer?url=${encodeURIComponent(order.fileURL)}&orderId=${order.orderId}&filename=${order.originalFileName || 'document'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-black text-white px-3 py-1 rounded text-sm hover:bg-gray-800 transition-colors"
                    >
                      Download File
                    </a>
                  </div>
                  
                  {/* File Preview - Smart preview based on file type */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Document Preview</h3>
                    <div className={`border rounded-lg overflow-hidden ${
                      order.printingOptions.color === 'bw' ? 'grayscale' : ''
                    }`}>
                      {/* Loading indicator */}
                      {!pdfLoaded && (
                        <div className="h-96 bg-gray-100 flex items-center justify-center">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading preview...</p>
                            <button 
                              onClick={() => setPdfLoaded(true)}
                              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Show Preview Anyway
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Smart preview based on file type */}
                      {(() => {
                        const fileType = order.fileType || 'application/octet-stream';
                        const isImage = fileType.startsWith('image/');
                        const isPDF = fileType === 'application/pdf';
                        
                        if (isImage) {
                          // Image files - show directly
                          return (
                            <img
                              src={`/api/admin/pdf-viewer?url=${encodeURIComponent(order.fileURL)}&orderId=${order.orderId}&filename=${order.originalFileName || 'document'}`}
                              alt="Document preview"
                              className="w-full h-96 object-contain"
                              onLoad={() => setPdfLoaded(true)}
                              style={{ display: pdfLoaded ? 'block' : 'none' }}
                            />
                          );
                        } else if (isPDF) {
                          // PDF files - use iframe
                          return (
                            <iframe
                              src={`/api/admin/pdf-viewer?url=${encodeURIComponent(order.fileURL)}&orderId=${order.orderId}&filename=${order.originalFileName || 'document'}`}
                              className="w-full h-96"
                              onLoad={() => {
                                console.log('PDF iframe loaded successfully');
                                setPdfLoaded(true);
                              }}
                              onError={() => {
                                console.error('PDF iframe failed to load');
                                setPdfLoaded(true);
                              }}
                              style={{ display: pdfLoaded ? 'block' : 'none' }}
                              title="PDF Preview"
                            />
                          );
                        } else {
                          // Other files - show file info card
                          return (
                            <div className="w-full h-96 flex items-center justify-center bg-gray-50">
                              <div className="text-center">
                                <div className="text-6xl mb-4">📄</div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                  {order.originalFileName || 'Document'}
                                </h3>
                                <p className="text-gray-600 mb-2">
                                  File Type: {fileType}
                                </p>
                                <p className="text-gray-600 mb-4">
                                  This file type cannot be previewed in the browser
                                </p>
                                <a
                                  href={`/api/admin/pdf-viewer?url=${encodeURIComponent(order.fileURL)}&orderId=${order.orderId}&filename=${order.originalFileName || 'document'}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  Download to View
                                </a>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              ) : order.orderType === 'template' && order.templateData?.generatedPDF ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Generated Template PDF</span>
                    <a
                      href={order.templateData.generatedPDF}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-black transition-colors"
                    >
                      Download PDF
                    </a>
                  </div>
                  
                  {/* Template PDF Preview - Same as Order Page */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Document Preview</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <iframe 
                        src={order.templateData.generatedPDF} 
                        className="w-full h-96" 
                        style={{ display: 'block' }}
                        title="Template PDF Preview"
                      />
                    </div>
                  </div>
                  
                  {/* Template Form Data */}
                  {order.templateData.formData && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Template Data</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {Object.entries(order.templateData.formData).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-gray-600">{key}:</span>
                            <span className="ml-2 text-gray-900">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No document available for preview
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">⚡ Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => updateOrderStatus('printing')}
                  disabled={order.orderStatus === 'printing' || isUpdating}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Mark as Printing'}
                </button>
                
                <button
                  onClick={() => updateOrderStatus('dispatched')}
                  disabled={order.orderStatus === 'dispatched' || isUpdating}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Mark as Dispatched'}
                </button>
                
                <button
                  onClick={() => updateOrderStatus('delivered')}
                  disabled={order.orderStatus === 'delivered' || isUpdating}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Mark as Delivered'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
