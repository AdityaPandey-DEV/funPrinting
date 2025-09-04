'use client';

import { useState } from 'react';
import { otpStore } from '@/lib/otp-store';

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
    color: 'color' | 'bw';
    sided: 'single' | 'double';
    copies: number;
  };
  paymentStatus: 'pending' | 'completed' | 'failed';
  orderStatus: 'pending' | 'printing' | 'dispatched' | 'delivered';
  amount: number;
  createdAt: string;
}

export default function MyOrdersPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchedOrders, setSearchedOrders] = useState<Order[]>([]);
  
  // Email verification state
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Email verification functions
  const handleSendOTP = async () => {
    if (!searchEmail) {
      alert('Please enter your email first');
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: searchEmail }),
      });

      const data = await response.json();
      
      if (data.success) {
        setOtpSent(true);
        alert('OTP sent to your email! Please check your inbox.');
      } else {
        alert(`Failed to send OTP: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      alert('Failed to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      alert('Please enter the OTP');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: searchEmail, 
          otp: otp 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setEmailVerified(true);
        alert('Email verified successfully!');
      } else {
        alert(`OTP verification failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      alert('Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const searchOrders = async () => {
    if (!emailVerified) {
      alert('Please verify your email first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders?email=${encodeURIComponent(searchEmail)}`);
      const data = await response.json();

      if (data.success) {
        setSearchedOrders(data.orders);
      } else {
        alert('Failed to fetch orders. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('An error occurred. Please try again.');
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

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Orders</h1>
          <p className="text-lg text-gray-600">
            Track your printing orders and download generated documents
          </p>
        </div>

        {/* Email Verification Section */}
        <div className="form-container mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📧</span>
            Email Verification Required
          </h2>
          <p className="text-gray-600 mb-6 text-lg">
            Please verify your email address to view your orders. We&apos;ll send you a 6-digit OTP.
          </p>
          
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">
                Email Address *
              </label>
              <div className="flex space-x-3">
                <input
                  type="email"
                  required
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="form-input flex-1"
                />
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={!searchEmail || isSendingOtp}
                  className="form-button form-button-primary whitespace-nowrap"
                >
                  {isSendingOtp ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </div>
            
            {/* OTP Input Section */}
            {otpSent && (
              <div className="form-section">
                <div className="form-message form-message-info flex items-center space-x-3">
                  <div className="text-xl">📧</div>
                  <div>
                    <h4 className="font-semibold">OTP Sent Successfully!</h4>
                    <p className="text-sm">
                      We&apos;ve sent a 6-digit OTP to {searchEmail}
                    </p>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Enter OTP Code</label>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      className="form-input flex-1 text-center text-2xl tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOTP}
                      disabled={!otp || isVerifying || emailVerified}
                      className="form-button form-button-success whitespace-nowrap"
                    >
                      {isVerifying ? 'Verifying...' : emailVerified ? '✓ Verified' : 'Verify OTP'}
                    </button>
                  </div>
                </div>
                
                {emailVerified && (
                  <div className="form-message form-message-success">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">✅</span>
                      <span className="font-semibold">Email verified successfully! You can now search for your orders.</span>
                    </div>
                  </div>
                )}
                
                {/* Resend OTP Option */}
                {otpSent && !emailVerified && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={isSendingOtp}
                      className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50 font-medium"
                    >
                      {isSendingOtp ? 'Sending...' : "Didn't receive OTP? Resend"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search Orders Button */}
        {emailVerified && (
          <div className="form-container mb-8 text-center">
            <h3 className="text-2xl font-bold text-blue-800 mb-3 flex items-center justify-center gap-2">
              <span className="text-2xl">🔍</span>
              Ready to Search Orders
            </h3>
            <p className="text-gray-600 mb-6 text-lg">Your email has been verified. Click below to search for your orders.</p>
            <button
              onClick={searchOrders}
              className="form-button form-button-primary text-lg px-12 py-4"
            >
              Search My Orders
            </button>
          </div>
        )}

        {/* Orders List */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching orders...</p>
          </div>
        )}
        
        {!isLoading && searchedOrders.length > 0 && (
          <div className="space-y-6">
            {searchedOrders.map((order) => (
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
        
        {!isLoading && searchedOrders.length === 0 && searchEmail && emailVerified && (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg">No orders found for this email address.</div>
            <p className="text-gray-400 mt-2">Please check your email or place a new order.</p>
          </div>
        )}
        
        {!isLoading && searchedOrders.length === 0 && !searchEmail && (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg">Enter your email and verify it to view your orders.</div>
          </div>
        )}
      </div>
    </div>
  );
}
