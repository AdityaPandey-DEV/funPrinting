'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useRazorpay } from '@/hooks/useRazorpay';

interface Order {
  _id: string;
  orderId: string;
  customerInfo: {
    name: string;
    phone: string;
    email: string;
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
  paymentStatus: 'pending' | 'completed' | 'failed';
  orderStatus: 'pending' | 'printing' | 'dispatched' | 'delivered';
  status?: 'pending_payment' | 'paid' | 'processing' | 'completed' | 'cancelled';
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

export default function MyOrdersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const { isLoaded: isRazorpayLoaded, error: razorpayError, openRazorpay } = useRazorpay();

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin?callbackUrl=/my-orders');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load orders when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      loadOrders();
    }
  }, [isAuthenticated, user?.email]);

  // Load orders for authenticated user
  const loadOrders = async () => {
    if (!user?.email) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders?email=${encodeURIComponent(user.email)}`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
      } else {
        console.error('Failed to fetch orders:', data.error);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'printing':
        return 'bg-blue-100 text-blue-800';
      case 'dispatched':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle payment for pending orders
  const handlePayment = async (order: Order) => {
    if (!order.razorpayOrderId) {
      alert('Payment information not available for this order');
      return;
    }

    if (!isRazorpayLoaded) {
      alert('Payment gateway is still loading. Please wait a moment and try again.');
      return;
    }

    if (razorpayError) {
      alert(`Payment gateway error: ${razorpayError}`);
      return;
    }

    setProcessingPayment(order._id);
    
    try {
      // Get Razorpay key from environment
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpayOrderId: order.razorpayOrderId,
          amount: order.amount
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Initialize Razorpay payment
        const options = {
          key: data.key,
          amount: order.amount * 100, // Razorpay expects amount in paise
          currency: 'INR',
          name: 'College Print Service',
          description: `Complete Payment for Order #${order.orderId}`,
          order_id: order.razorpayOrderId,
          handler: async function (response: any) {
            try {
              // Verify payment
              const verifyResponse = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyResponse.json();
              
              if (verifyData.success) {
                alert(`🎉 Payment successful! Order #${order.orderId} is now confirmed.`);
                await loadOrders(); // Refresh orders
              } else {
                alert(`❌ Payment verification failed: ${verifyData.error || 'Unknown error'}`);
              }
            } catch (error) {
              console.error('Error verifying payment:', error);
              alert('❌ Payment verification failed. Please contact support.');
            }
          },
          modal: {
            ondismiss: function() {
              console.log('Payment modal dismissed');
              setProcessingPayment(null);
            }
          }
        };

        await openRazorpay(options);
      } else {
        alert(`❌ Failed to initiate payment: ${data.error}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('❌ Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  // Handle order deletion/cancellation
  const handleDeleteOrder = async (order: Order) => {
    if (!confirm(`Are you sure you want to cancel order #${order.orderId}? This action cannot be undone.`)) {
      return;
    }

    setDeletingOrder(order._id);
    
    try {
      const response = await fetch(`/api/orders/${order._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Order #${order.orderId} has been cancelled successfully.`);
        await loadOrders(); // Refresh orders
      } else {
        alert(`❌ Failed to cancel order: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('❌ Failed to cancel order. Please try again.');
    } finally {
      setDeletingOrder(null);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show sign in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">My Orders</h1>
            <p className="text-lg text-gray-600 mb-8">
              Please sign in to view your orders
            </p>
            <a
              href="/auth/signin?callbackUrl=/my-orders"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Orders</h1>
          <p className="text-lg text-gray-600">
            Welcome back, {user?.name || user?.email}! Here are your printing orders.
          </p>
        </div>

        {/* Refresh Button */}
        <div className="text-center mb-8">
          <button
            onClick={loadOrders}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Orders'}
          </button>
        </div>

        {/* Pending Orders Section */}
        {!isLoading && orders.filter(order => order.paymentStatus === 'pending' && order.status === 'pending_payment').length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">⚠️ Pending Payment</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-orange-800">
                You have {orders.filter(order => order.paymentStatus === 'pending' && order.status === 'pending_payment').length} order(s) waiting for payment. 
                Complete payment within 24 hours or your order will be automatically cancelled.
              </p>
            </div>
            <div className="space-y-4">
              {orders
                .filter(order => order.paymentStatus === 'pending' && order.status === 'pending_payment')
                .map((order) => (
                  <div key={order._id} className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-orange-900">
                          Order #{order.orderId} - Payment Required
                        </h3>
                        <p className="text-sm text-orange-700">
                          Placed on {formatDate(order.createdAt)} • Amount: ₹{order.amount}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 lg:mt-0">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-200 text-orange-800">
                          Payment Pending
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="text-sm font-medium text-orange-700">Order Type:</span>
                        <p className="text-sm text-orange-900">
                          {order.orderType === 'file' ? 'File Upload' : 'Template Generated'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-orange-700">Page Size:</span>
                        <p className="text-sm text-orange-900">{order.printingOptions.pageSize}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-orange-700">Color:</span>
                        <p className="text-sm text-orange-900">
                          {order.printingOptions.color === 'color' ? 'Color' : 
                           order.printingOptions.color === 'bw' ? 'Black & White' : 'Mixed'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-orange-700">Copies:</span>
                        <p className="text-sm text-orange-900">{order.printingOptions.copies}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handlePayment(order)}
                        disabled={processingPayment === order._id || !isRazorpayLoaded}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingPayment === order._id ? 'Processing...' : '💳 Complete Payment'}
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order)}
                        disabled={deletingOrder === order._id}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingOrder === order._id ? 'Cancelling...' : '❌ Cancel Order'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* All Orders List */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        )}
        
        {!isLoading && orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.orderId}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 lg:mt-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                      {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                      Payment {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Order Type:</span>
                    <p className="text-sm text-gray-900">
                      {order.orderType === 'file' ? 'File Upload' : 'Template Generated'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Page Size:</span>
                    <p className="text-sm text-gray-900">{order.printingOptions.pageSize}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Color:</span>
                    <p className="text-sm text-gray-900">
                      {order.printingOptions.color === 'color' ? 'Color' : 'Black & White'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Copies:</span>
                    <p className="text-sm text-gray-900">{order.printingOptions.copies}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Amount:</span>
                      <span className="text-lg font-semibold text-gray-900 ml-2">₹{order.amount}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {/* Pending Payment Actions */}
                      {order.paymentStatus === 'pending' && order.status === 'pending_payment' && (
                        <>
                          <button
                            onClick={() => handlePayment(order)}
                            disabled={processingPayment === order._id || !isRazorpayLoaded}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingPayment === order._id ? 'Processing...' : '💳 Complete Payment'}
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            disabled={deletingOrder === order._id}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingOrder === order._id ? 'Cancelling...' : '❌ Cancel Order'}
                          </button>
                        </>
                      )}
                      
                      {/* Completed Order Actions */}
                      {order.paymentStatus === 'completed' && (
                        <>
                          {order.orderType === 'template' && order.templateData?.generatedPDF && (
                            <a
                              href={order.templateData.generatedPDF}
                              download
                              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                            >
                              Download PDF
                            </a>
                          )}
                          
                          {order.orderType === 'file' && order.fileURL && (
                            <a
                              href={`/api/admin/pdf-viewer?url=${encodeURIComponent(order.fileURL)}&orderId=${order.orderId}&filename=${order.originalFileName || 'document'}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              Download {order.originalFileName || 'File'}
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Template Details */}
                {order.orderType === 'template' && order.templateData && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Template Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Template:</span>
                        <span className="ml-2 text-gray-900">
                          {order.templateData.templateType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      {order.templateData.formData.subject && (
                        <div>
                          <span className="text-gray-600">Subject:</span>
                          <span className="ml-2 text-gray-900">{String(order.templateData.formData.subject)}</span>
                        </div>
                      )}
                      {order.templateData.formData.course && (
                        <div>
                          <span className="text-gray-600">Course:</span>
                          <span className="ml-2 text-gray-900">{String(order.templateData.formData.course)}</span>
                        </div>
                      )}
                      {order.templateData.formData.semester && (
                        <div>
                          <span className="text-gray-600">Semester:</span>
                          <span className="ml-2 text-gray-900">{String(order.templateData.formData.semester)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {!isLoading && orders.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg">No orders found.</div>
                  <p className="text-gray-400 mt-2">You haven&apos;t placed any orders yet. <a href="/order" className="text-blue-600 hover:text-blue-800 underline">Place your first order</a> to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
