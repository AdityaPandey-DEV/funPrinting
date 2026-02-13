'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useRazorpay } from '@/hooks/useRazorpay';
import { validatePendingOrderPayment, createPaymentOptions, handlePaymentSuccess, handlePaymentFailure, logPaymentEvent, checkPendingPaymentVerification } from '@/lib/paymentUtils';
import { MoneyIcon, EyeIcon, TrashIcon } from '@/components/SocialIcons';

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
  status?: 'pending_payment' | 'paid' | 'processing' | 'completed';
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  shiprocket?: {
    orderId?: number;
    shipmentId?: number;
    awbCode?: string;
    courierName?: string;
    trackingUrl?: string;
    status?: string;
    lastTrackedAt?: string;
  };
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

      // Check for pending payment verification (iPhone Safari recovery)
      checkPendingPaymentVerification().then((result) => {
        if (result && result.success) {
          console.log('🔄 Payment verification recovered, refreshing orders...');
          loadOrders(); // Refresh orders to show updated status
        }
      });
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
    // Validate order before processing payment
    const validation = validatePendingOrderPayment(order);
    if (!validation.isValid) {
      alert(`❌ ${validation.error}`);
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
    logPaymentEvent('payment_initiated', { orderId: order.orderId, amount: order.amount }, 'info');

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Create payment options using utility function
        const options = createPaymentOptions(order, data.key);

        // Add success handler
        options.handler = async function (paymentResponse: any) {
          console.log('🎉 Payment response received:', paymentResponse);
          try {
            const result = await handlePaymentSuccess(paymentResponse, order.orderId);
            console.log('🔍 Payment verification result:', result);

            if (result.success) {
              alert(`Payment successful! Order #${order.orderId} is now confirmed.`);
              await loadOrders(); // Refresh orders
            } else {
              console.error('❌ Payment verification failed:', result.error);
              alert(`Payment verification failed: ${result.error}`);
            }
          } catch (error) {
            console.error('❌ Payment success handler error:', error);
            const failureResult = handlePaymentFailure(error, order.orderId);
            alert(`${failureResult.error}`);
          } finally {
            setProcessingPayment(null);
          }
        };

        // Add modal dismiss handler
        options.modal.ondismiss = function () {
          console.log('Payment modal dismissed');
          setProcessingPayment(null);
        };

        // Add error handler
        options.handler = options.handler || function () { };
        options.modal.ondismiss = options.modal.ondismiss || function () { };

        try {
          const razorpay = openRazorpay(options);
          razorpay.open();

          // Add timeout to detect stuck payments (extended for slow networks)
          // Default: 10 minutes, can be up to 15 minutes for very slow connections
          const timeoutDuration = 600000; // 10 minutes (600 seconds)
          setTimeout(() => {
            if (processingPayment === order.orderId) {
              console.log('⚠️ Payment timeout detected for order:', order.orderId);
              alert('Payment is taking longer than expected. The payment may still be processing. Please check your payment status in a few minutes.');
              setProcessingPayment(null);
            }
          }, timeoutDuration);

        } catch (razorpayError) {
          logPaymentEvent('razorpay_error', { orderId: order.orderId, error: razorpayError }, 'error');
          alert('Failed to open payment gateway. Please try again.');
          setProcessingPayment(null);
        }
      } else {
        logPaymentEvent('payment_initiation_failed', { orderId: order.orderId, error: data.error }, 'error');
        alert(`Failed to initiate payment: ${data.error}`);
        setProcessingPayment(null);
      }
    } catch (error) {
      logPaymentEvent('payment_processing_error', { orderId: order.orderId, error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      alert('Failed to process payment. Please try again.');
      setProcessingPayment(null);
    }
  };

  // Handle order deletion
  const handleDeleteOrder = async (order: Order) => {
    // Validate that order can be deleted
    if (order.paymentStatus === 'completed') {
      alert('Cannot delete a paid order. Please contact support for refunds.');
      return;
    }

    if (!confirm(`Are you sure you want to delete order #${order.orderId}? This action cannot be undone.`)) {
      return;
    }

    setDeletingOrder(order._id);
    logPaymentEvent('order_deletion_initiated', { orderId: order.orderId }, 'info');

    try {
      const response = await fetch(`/api/orders/${order._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        logPaymentEvent('order_deleted', { orderId: order.orderId }, 'info');
        alert(`✅ Order #${order.orderId} has been deleted successfully.`);
        await loadOrders(); // Refresh orders
      } else {
        logPaymentEvent('order_deletion_failed', { orderId: order.orderId, error: data.error }, 'error');
        alert(`Failed to delete order: ${data.error}`);
      }
    } catch (error) {
      logPaymentEvent('order_cancellation_error', { orderId: order.orderId, error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      console.error('Error deleting order:', error);
      alert('Failed to cancel order. Please try again.');
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

        {/* Pending Payment Notification */}
        {!isLoading && orders.filter(order => order.paymentStatus === 'pending' && order.status === 'pending_payment').length > 0 && (
          <div className="mb-8">
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-orange-700">
                    <span className="font-medium">Payment Required:</span> You have {orders.filter(order => order.paymentStatus === 'pending' && order.status === 'pending_payment').length} order(s) waiting for payment. Complete payment within 24 hours or your order will expire.
                  </p>
                </div>
              </div>
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
            {orders.map((order) => {
              const isPendingPayment = order.paymentStatus === 'pending' && order.status === 'pending_payment';
              return (
                <div key={order._id} className={`rounded-lg shadow-lg p-6 ${isPendingPayment
                  ? 'bg-orange-50 border-2 border-orange-200'
                  : 'bg-white'
                  }`}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                    <div>
                      <h3 className={`text-lg font-semibold ${isPendingPayment ? 'text-orange-900' : 'text-gray-900'
                        }`}>
                        Order #{order.orderId}
                        {isPendingPayment && (
                          <span className="ml-2 text-orange-600 font-normal text-sm">
                            - Payment Required
                          </span>
                        )}
                      </h3>
                      <p className={`text-sm ${isPendingPayment ? 'text-orange-700' : 'text-gray-600'
                        }`}>
                        Placed on {formatDate(order.createdAt)}
                        {isPendingPayment && (
                          <span className="ml-2 font-medium">• Amount: ₹{order.amount}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 lg:mt-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${isPendingPayment ? 'bg-orange-200 text-orange-800' : getStatusColor(order.orderStatus)
                        }`}>
                        {isPendingPayment ? 'Payment Pending' : order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                      </span>
                      {!isPendingPayment && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                          Payment {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className={`text-sm font-medium ${isPendingPayment ? 'text-orange-700' : 'text-gray-700'
                        }`}>Order Type:</span>
                      <p className={`text-sm ${isPendingPayment ? 'text-orange-900' : 'text-gray-900'
                        }`}>
                        {order.orderType === 'file' ? 'File Upload' : 'Template Generated'}
                      </p>
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${isPendingPayment ? 'text-orange-700' : 'text-gray-700'
                        }`}>Page Size:</span>
                      <p className={`text-sm ${isPendingPayment ? 'text-orange-900' : 'text-gray-900'
                        }`}>{order.printingOptions.pageSize}</p>
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${isPendingPayment ? 'text-orange-700' : 'text-gray-700'
                        }`}>Color:</span>
                      <p className={`text-sm ${isPendingPayment ? 'text-orange-900' : 'text-gray-900'
                        }`}>
                        {order.printingOptions.color === 'color' ? 'Color' :
                          order.printingOptions.color === 'bw' ? 'Black & White' : 'Mixed'}
                      </p>
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${isPendingPayment ? 'text-orange-700' : 'text-gray-700'
                        }`}>Copies:</span>
                      <p className={`text-sm ${isPendingPayment ? 'text-orange-900' : 'text-gray-900'
                        }`}>{order.printingOptions.copies}</p>
                    </div>
                  </div>

                  <div className={`border-t pt-4 ${isPendingPayment ? 'border-orange-200' : 'border-gray-200'
                    }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {!isPendingPayment && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Amount:</span>
                          <span className="text-lg font-semibold text-gray-900 ml-2">₹{order.amount}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {/* Pending Payment Actions */}
                        {order.paymentStatus === 'pending' && order.status === 'pending_payment' && (
                          <>
                            <button
                              onClick={() => handlePayment(order)}
                              disabled={processingPayment === order._id || !isRazorpayLoaded}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingPayment === order._id ? (
                                'Processing...'
                              ) : (
                                <span className="flex items-center gap-2">
                                  <MoneyIcon size={16} className="w-4 h-4" />
                                  Complete Payment
                                </span>
                              )}
                            </button>
                            {order.razorpayOrderId && (
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/payment/check-status', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        razorpay_order_id: order.razorpayOrderId,
                                      }),
                                    });
                                    const data = await response.json();
                                    if (data.success && data.payment_status === 'completed') {
                                      alert(`✅ Payment successful! Your order #${data.order.orderId} has been confirmed.`);
                                      // Reload orders to show updated status
                                      window.location.reload();
                                    } else if (data.payment_status === 'failed') {
                                      alert(`Payment failed: ${data.message}`);
                                    } else {
                                      alert(`Payment status: ${data.message}`);
                                    }
                                  } catch (error) {
                                    console.error('Error checking payment status:', error);
                                    alert('Failed to check payment status. Please try again later.');
                                  }
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <EyeIcon size={16} className="w-4 h-4" />
                                  Check Payment Status
                                </span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              disabled={deletingOrder === order._id}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingOrder === order._id ? (
                                'Cancelling...'
                              ) : (
                                <span className="flex items-center gap-2">
                                  <TrashIcon size={16} className="w-4 h-4" />
                                  Cancel Order
                                </span>
                              )}
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

                            <button
                              onClick={() => router.push(`/orders/${order._id}`)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              <span className="flex items-center gap-2">
                                <EyeIcon size={16} className="w-4 h-4" />
                                View Order Details
                              </span>
                            </button>

                            {/* Shiprocket Track Order Button */}
                            {order.shiprocket?.awbCode && (
                              <a
                                href={order.shiprocket.trackingUrl || `https://shiprocket.co/tracking/${order.shiprocket.awbCode}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  📦 Track Order
                                </span>
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
              );
            })}
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
