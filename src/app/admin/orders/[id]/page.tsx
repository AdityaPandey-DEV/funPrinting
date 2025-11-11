'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminNavigation from '@/components/admin/AdminNavigation';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import AdminGoogleAuth from '@/components/admin/AdminGoogleAuth';
import { getStatusColor, getPaymentStatusColor, formatDate, getDefaultExpectedDate } from '@/lib/adminUtils';

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
  fileURL?: string; // Legacy: single file URL (for backward compatibility)
  fileURLs?: string[]; // Array of file URLs for multiple files
  fileType?: string;
  originalFileName?: string; // Legacy: single file name (for backward compatibility)
  originalFileNames?: string[]; // Array of original file names for multiple files
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
    pickupLocationId?: string;
    pickupLocation?: {
      _id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      contactPerson?: string;
      contactPhone?: string;
      operatingHours?: string;
      gmapLink?: string;
    };
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
  orderStatus: 'pending' | 'processing' | 'printing' | 'dispatched' | 'delivered';
  amount: number;
  expectedDate?: string | Date;
  createdAt: string;
}

// Helper function to detect file type from URL or filename
function getFileTypeFromURL(url: string, fileName: string): string {
  // Try to get extension from filename first
  const fileNameLower = fileName.toLowerCase();
  const urlLower = url.toLowerCase();
  
  // Extract extension from filename
  const fileNameMatch = fileNameLower.match(/\.([a-z0-9]+)$/);
  if (fileNameMatch) {
    const ext = fileNameMatch[1];
    const mimeTypes: Record<string, string> = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text
      'txt': 'text/plain',
      'rtf': 'application/rtf',
    };
    
    if (mimeTypes[ext]) {
      return mimeTypes[ext];
    }
  }
  
  // Try to get extension from URL
  const urlMatch = urlLower.match(/\.([a-z0-9]+)(\?|$)/);
  if (urlMatch) {
    const ext = urlMatch[1];
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    
    if (mimeTypes[ext]) {
      return mimeTypes[ext];
    }
  }
  
  // Default fallback
  return 'application/octet-stream';
}

function OrderDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0); // For multiple file preview

  const fetchOrder = useCallback(async (orderId: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        const orderData = data.order;
        
        // Normalize file data: ensure fileURLs and originalFileNames are properly set
        if (orderData) {
          // If fileURLs exists and has items, use it
          if (orderData.fileURLs && Array.isArray(orderData.fileURLs) && orderData.fileURLs.length > 0) {
            // Ensure originalFileNames array matches fileURLs length
            if (!orderData.originalFileNames || !Array.isArray(orderData.originalFileNames)) {
              orderData.originalFileNames = orderData.fileURLs.map((_: string, idx: number) => `File ${idx + 1}`);
            } else if (orderData.originalFileNames.length !== orderData.fileURLs.length) {
              // Pad or truncate to match length
              while (orderData.originalFileNames.length < orderData.fileURLs.length) {
                orderData.originalFileNames.push(`File ${orderData.originalFileNames.length + 1}`);
              }
              orderData.originalFileNames = orderData.originalFileNames.slice(0, orderData.fileURLs.length);
            }
            console.log(`✅ Order has ${orderData.fileURLs.length} files:`, orderData.originalFileNames);
          } 
          // If fileURLs is empty/undefined but fileURL exists, convert to array format for consistency
          else if (orderData.fileURL && !orderData.fileURLs) {
            orderData.fileURLs = [orderData.fileURL];
            orderData.originalFileNames = orderData.originalFileName 
              ? [orderData.originalFileName] 
              : ['document.pdf'];
            console.log(`📄 Converted single file to array format`);
          }
          // If fileURLs exists but is empty, and fileURL exists, use fileURL
          else if ((!orderData.fileURLs || orderData.fileURLs.length === 0) && orderData.fileURL) {
            orderData.fileURLs = [orderData.fileURL];
            orderData.originalFileNames = orderData.originalFileName 
              ? [orderData.originalFileName] 
              : ['document.pdf'];
            console.log(`📄 Fallback: Using single fileURL as array`);
          }
        }
        
        console.log('📋 Order data after normalization:', {
          hasFileURLs: !!orderData?.fileURLs,
          fileURLsLength: orderData?.fileURLs?.length || 0,
          hasFileURL: !!orderData?.fileURL,
          originalFileNamesLength: orderData?.originalFileNames?.length || 0
        });
        
        setOrder(orderData);
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
  }, [router]);

  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id as string);
      setPdfLoaded(false); // Reset PDF loaded state when order changes
      setSelectedFileIndex(0); // Reset to first file when order changes
    }
  }, [params.id, fetchOrder]);

  // Add timeout to prevent stuck loading state
  useEffect(() => {
    const currentFileURL = (order?.fileURLs && order.fileURLs.length > 0) 
      ? order.fileURLs[selectedFileIndex] 
      : order?.fileURL;
    if (order && currentFileURL && !pdfLoaded) {
      const timeout = setTimeout(() => {
        console.log('PDF loading timeout, showing iframe anyway');
        setPdfLoaded(true);
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [order, order?.fileURL, order?.fileURLs, selectedFileIndex, pdfLoaded]);

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;
    
    setIsUpdating(true);
    try {
      console.log(`🔄 Updating order ${order._id} status to: ${newStatus}`);
      
      const response = await fetch(`/api/admin/orders/${order._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderStatus: newStatus }),
      });

      const data = await response.json();
      console.log('📋 API Response:', data);
      
      if (data.success) {
        setOrder({ ...order, orderStatus: newStatus as any });
        alert(`✅ Order status updated successfully to: ${newStatus}`);
      } else {
        console.error('❌ API Error:', data.error);
        alert(`❌ Failed to update order status: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Network Error updating order status:', error);
      alert('❌ Network error occurred while updating order status. Please check your connection and try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteOrder = async () => {
    if (!order) return;
    
    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete order #${order.orderId}?\n\nThis action cannot be undone and will permanently remove the order from the system.`
    );
    
    if (!confirmed) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${order._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Order deleted successfully!');
        router.push('/admin');
      } else {
        alert('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
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
                <option value="processing">Processing</option>
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                    <div className="font-medium text-green-800 mb-3">🎨 Mixed Color Printing Details</div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span className="text-gray-700">Color Pages:</span>
                        <span className="font-medium text-green-600">
                          {order.printingOptions.pageColors.colorPages.length} pages
                        </span>
                      </div>
                      <div className="text-sm text-green-700 ml-5 bg-white px-2 py-1 rounded border">
                        [{order.printingOptions.pageColors.colorPages.join(', ')}]
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                        <span className="text-gray-700">B&W Pages:</span>
                        <span className="font-medium text-gray-600">
                          {order.printingOptions.pageColors.bwPages.length} pages
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 ml-5 bg-white px-2 py-1 rounded border">
                        [{order.printingOptions.pageColors.bwPages.join(', ')}]
                      </div>
                      
                      {/* Visual Page Preview */}
                      {order.printingOptions.pageCount && order.printingOptions.pageCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-300">
                          <div className="text-xs font-medium text-green-800 mb-2">
                            Page Preview ({order.printingOptions.pageCount} total pages)
                          </div>
                          <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded border border-green-200 max-h-32 overflow-y-auto">
                            {Array.from({ length: order.printingOptions.pageCount }, (_, i) => i + 1).map((pageNum) => {
                              const isColor = order.printingOptions.pageColors?.colorPages.includes(pageNum) || false;
                              const isBw = order.printingOptions.pageColors?.bwPages.includes(pageNum) || false;
                              return (
                                <div
                                  key={pageNum}
                                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                                    isColor
                                      ? 'bg-gradient-to-r from-green-400 to-green-600 text-white shadow-sm'
                                      : isBw
                                      ? 'bg-gray-300 text-gray-800'
                                      : 'bg-gray-100 text-gray-500 border border-gray-300'
                                  }`}
                                  title={isColor ? `Page ${pageNum} - Color` : isBw ? `Page ${pageNum} - Black & White` : `Page ${pageNum} - Not specified`}
                                >
                                  {pageNum}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected Delivery:</span>
                  <span className="font-medium text-blue-600">
                    {order.expectedDate ? (
                      formatDate(order.expectedDate.toString(), 'long')
                    ) : (
                      <span className="text-orange-600">
                        {formatDate(getDefaultExpectedDate(order.createdAt), 'long')} (Default)
                      </span>
                    )}
                  </span>
                </div>
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
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-600">Pickup Location:</span>
                        <span className="ml-2 font-medium">{order.deliveryOption.pickupLocation.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Address:</span>
                        <span className="ml-2 font-medium">{order.deliveryOption.pickupLocation.address}</span>
                      </div>
                      {order.deliveryOption.pickupLocation.contactPerson && (
                        <div>
                          <span className="text-gray-600">Contact Person:</span>
                          <span className="ml-2 font-medium">{order.deliveryOption.pickupLocation.contactPerson}</span>
                        </div>
                      )}
                      {order.deliveryOption.pickupLocation.contactPhone && (
                        <div>
                          <span className="text-gray-600">Contact Phone:</span>
                          <span className="ml-2 font-medium">{order.deliveryOption.pickupLocation.contactPhone}</span>
                        </div>
                      )}
                      {order.deliveryOption.pickupLocation.operatingHours && (
                        <div>
                          <span className="text-gray-600">Operating Hours:</span>
                          <span className="ml-2 font-medium">{order.deliveryOption.pickupLocation.operatingHours}</span>
                        </div>
                      )}
                      {order.deliveryOption.pickupLocation.gmapLink && (
                        <div>
                          <a 
                            href={order.deliveryOption.pickupLocation.gmapLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            📍 View on Google Maps
                          </a>
                        </div>
                      )}
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
              
              {order.orderType === 'file' && ((order.fileURLs && Array.isArray(order.fileURLs) && order.fileURLs.length > 0) || order.fileURL) ? (
                <div className="space-y-4">
                  {/* Multiple Files Support - Check if fileURLs exists and has items */}
                  {order.fileURLs && Array.isArray(order.fileURLs) && order.fileURLs.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-gray-900">
                            📁 Files in this Order
                          </span>
                          <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {order.fileURLs.length} {order.fileURLs.length === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-600">
                          Click a file to preview • Download individually
                        </span>
                      </div>
                      
                      {/* File List - Made more prominent */}
                      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto border-2 border-gray-300 rounded-lg p-3 bg-white shadow-sm">
                        {order.fileURLs.map((fileURL, idx) => {
                          const fileName = order.originalFileNames?.[idx] || `File ${idx + 1}`;
                          const fileType = getFileTypeFromURL(fileURL, fileName);
                          const isImage = fileType.startsWith('image/');
                          const isPDF = fileType === 'application/pdf';
                          const isDoc = fileType.includes('word') || fileType.includes('document');
                          
                          // Get file type icon
                          const getFileIcon = () => {
                            if (isImage) return '🖼️';
                            if (isPDF) return '📄';
                            if (isDoc) return '📝';
                            return '📎';
                          };
                          
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedFileIndex === idx
                                  ? 'bg-blue-50 border-blue-400 shadow-sm'
                                  : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                              }`}
                              onClick={() => {
                                setSelectedFileIndex(idx);
                                setPdfLoaded(false);
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-lg" title={fileType}>{getFileIcon()}</span>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-900 truncate">{fileName}</span>
                                  <span className="text-xs text-gray-500">
                                    {isImage ? 'Image' : isPDF ? 'PDF' : isDoc ? 'Document' : 'File'} • #{idx + 1}
                                  </span>
                                </div>
                              </div>
                              <a
                                href={`/api/admin/pdf-viewer?url=${encodeURIComponent(fileURL)}&orderId=${order.orderId}&filename=${fileName}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-black text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-800 transition-colors ml-2 flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                                title={`Download ${fileName}`}
                              >
                                Download
                              </a>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Preview for Selected File */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">
                            Preview: {order.originalFileNames?.[selectedFileIndex] || `File ${selectedFileIndex + 1}`}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Legacy: Single file
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Original File</span>
                      <a
                        href={`/api/admin/pdf-viewer?url=${encodeURIComponent(order.fileURL!)}&orderId=${order.orderId}&filename=${order.originalFileName || 'document'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black text-white px-3 py-1 rounded text-sm hover:bg-gray-800 transition-colors"
                      >
                        Download File
                      </a>
                    </div>
                  )}
                  
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
                        // Get current file URL and name (for multiple files or single file)
                        const currentFileURL = (order.fileURLs && order.fileURLs.length > 0) 
                          ? order.fileURLs[selectedFileIndex] 
                          : order.fileURL;
                        const currentFileName = (order.originalFileNames && order.originalFileNames.length > 0)
                          ? order.originalFileNames[selectedFileIndex]
                          : order.originalFileName || 'document';
                        // Use per-file type detection instead of single order.fileType
                        const fileType = currentFileURL && currentFileName
                          ? getFileTypeFromURL(currentFileURL, currentFileName)
                          : (order.fileType || 'application/octet-stream');
                        const isImage = fileType.startsWith('image/');
                        const isPDF = fileType === 'application/pdf';
                        
                        if (!currentFileURL) {
                          return (
                            <div className="w-full h-96 flex items-center justify-center bg-gray-50">
                              <div className="text-center text-gray-500">
                                No file available for preview
                              </div>
                            </div>
                          );
                        }
                        
                        if (isImage) {
                          // Image files - show directly
                          return (
                            <Image
                              src={`/api/admin/pdf-viewer?url=${encodeURIComponent(currentFileURL)}&orderId=${order.orderId}&filename=${currentFileName}`}
                              alt="Document preview"
                              width={800}
                              height={384}
                              className="w-full h-96 object-contain"
                              onLoad={() => setPdfLoaded(true)}
                              style={{ display: pdfLoaded ? 'block' : 'none' }}
                            />
                          );
                        } else if (isPDF) {
                          // PDF files - use iframe
                          return (
                            <iframe
                              src={`/api/admin/pdf-viewer?url=${encodeURIComponent(currentFileURL)}&orderId=${order.orderId}&filename=${currentFileName}`}
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
                                  {currentFileName}
                                </h3>
                                <p className="text-gray-600 mb-2">
                                  File Type: {fileType}
                                </p>
                                <p className="text-gray-600 mb-4">
                                  This file type cannot be previewed in the browser
                                </p>
                                <a
                                  href={`/api/admin/pdf-viewer?url=${encodeURIComponent(currentFileURL)}&orderId=${order.orderId}&filename=${currentFileName}`}
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
                {/* Call Customer Button */}
                {(order.customerInfo?.phone || order.studentInfo?.phone) && (
                  <a
                    href={`tel:${order.customerInfo?.phone || order.studentInfo?.phone}`}
                    className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call Customer
                  </a>
                )}
                
                <button
                  onClick={() => updateOrderStatus('processing')}
                  disabled={order.orderStatus === 'processing' || isUpdating}
                  className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Mark as Processing'}
                </button>
                
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
                
                {/* Delete Order Button */}
                <button
                  onClick={deleteOrder}
                  disabled={isUpdating}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {isUpdating ? 'Deleting...' : 'Delete Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <AdminGoogleAuth 
      title="Order Details"
      subtitle="Sign in with Google to view and manage order details"
    >
      <OrderDetailPageContent />
    </AdminGoogleAuth>
  );
}
