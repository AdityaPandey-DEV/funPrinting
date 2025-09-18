'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import AdminNavigation from '@/components/admin/AdminNavigation';
import { AdminCard } from '@/components/admin/AdminNavigation';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import AdminGoogleAuth from '@/components/admin/AdminGoogleAuth';
import { getOrderStatusColor, getOrderPaymentStatusColor, formatDate, getDefaultExpectedDate } from '@/lib/adminUtils';

interface Order {
  _id: string;
  orderId: string;
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
  customerInfo?: {
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
    formData: Record<string, unknown>;
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
  };
  paymentStatus: 'pending' | 'completed' | 'failed';
  orderStatus: 'pending' | 'printing' | 'dispatched' | 'delivered';
  amount: number;
  expectedDate?: string | Date;
  createdAt: string;
}

function AdminDashboardContent() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);


  // Apply filters when orders or filter states change
  useEffect(() => {
    let filtered = orders;

    // Filter by order status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === statusFilter);
    }

    // Filter by payment status
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.paymentStatus === paymentFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, statusFilter, paymentFilter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // 🔄 FIRST: Check Razorpay for successful payments
      console.log('🔄 Admin: Checking Razorpay payments before refreshing orders...');
      try {
        const paymentCheckResponse = await fetch('/api/manual-check-payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (paymentCheckResponse.ok) {
          const paymentCheckData = await paymentCheckResponse.json();
          console.log('✅ Admin: Payment check completed:', paymentCheckData.message);
        } else {
          console.warn('⚠️ Admin: Payment check failed, but continuing with order refresh');
        }
      } catch (paymentError) {
        console.warn('⚠️ Admin: Payment check error, but continuing with order refresh:', paymentError);
      }

      // 📋 THEN: Fetch updated orders
      const response = await fetch(`/api/admin/orders?t=${Date.now()}`);
      const data = await response.json();

      console.log('🔍 ADMIN PANEL - Received data:', data);
      console.log('🔍 ADMIN PANEL - Orders count:', data.orders?.length || 0);
      console.log('🔍 ADMIN PANEL - Latest orders:', data.orders?.slice(0, 3).map((o: any) => ({
        orderId: o.orderId,
        createdAt: o.createdAt,
        serviceOption: o.printingOptions?.serviceOption,
        expectedDate: o.expectedDate,
        amount: o.amount
      })));

      if (data.success) {
        setOrders(data.orders);
      } else {
        alert('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('An error occurred while fetching orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      console.log(`🔄 Updating order ${orderId} status to: ${newStatus}`);
      
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderStatus: newStatus }),
      });

      const data = await response.json();
      console.log('📋 API Response:', data);

      if (data.success) {
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === orderId
              ? { ...order, orderStatus: newStatus as Order['orderStatus'] }
              : order
          )
        );
        alert(`✅ Order status updated successfully to: ${newStatus}`);
      } else {
        console.error('❌ API Error:', data.error);
        alert(`❌ Failed to update order status: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Network Error updating order status:', error);
      alert('❌ Network error occurred while updating order status. Please check your connection and try again.');
    }
  };


  if (isLoading) {
    return <LoadingSpinner message="Loading orders..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">PrintService Admin</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img 
                  className="h-8 w-8 rounded-full" 
                  src={session?.user?.image || '/default-avatar.png'} 
                  alt={session?.user?.name || 'Admin'}
                />
                <span className="text-sm text-gray-700">{session?.user?.name}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Content */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdminNavigation
            title="Admin Dashboard"
            subtitle="Manage all printing orders and track their status"
            actions={
              <>
                <button
                  onClick={fetchOrders}
                  disabled={isLoading}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Checking Payments & Refreshing...' : 'Refresh Orders & Check Payments'}
                </button>
              </>
            }
          />

        {/* Order Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {orders.filter(o => o.orderStatus === 'pending').length}
                </p>
              </div>
              <div className="text-2xl">⏳</div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Printing</p>
                <p className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => o.orderStatus === 'printing').length}
                </p>
              </div>
              <div className="text-2xl">🖨️</div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Payment Pending</p>
                <p className="text-2xl font-bold text-red-600">
                  {orders.filter(o => o.paymentStatus === 'pending').length}
                </p>
              </div>
              <div className="text-2xl">💳</div>
            </div>
          </div>
        </div>


        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminCard
            icon="📋"
            title="Orders"
            description="Manage print orders"
            href="/admin/orders"
            count={orders.length}
          />
          <AdminCard            icon="📄"
            title="PDF Templates"
            description="Create and manage PDF templates"
            href="/admin/templates"
          />
          <AdminCard
            icon="📍"
            title="Pickup Locations"
            description="Manage pickup locations for orders"
            href="/admin/pickup-locations"
          />
          <AdminCard
            icon="💰"
            title="Pricing"
            description="Manage service pricing and rates"
            href="/admin/pricing"
          />
          <AdminCard
            icon="ℹ️"
            title="Admin Info"
            description="Manage business information"
            href="/admin/info"
          />
        </div>

        {/* Orders Table */}
        <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">All Orders ({filteredOrders.length})</h2>
              <p className="text-sm text-gray-600">💡 Click on any order row to view detailed information</p>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Order Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="printing">Printing</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Payment:</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Payments</option>
                  <option value="pending">Payment Pending</option>
                  <option value="completed">Payment Completed</option>
                  <option value="failed">Payment Failed</option>
                </select>
              </div>
              
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setPaymentFilter('all');
                }}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
              >
                🔄 Clear Filters
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr 
                    key={order._id} 
                    className="hover:bg-blue-50 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                    onClick={() => window.open(`/admin/orders/${order._id}`, '_blank')}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          #{order.orderId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Type: {order.orderType === 'file' ? 'File Upload' : 'Template'}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          ₹{order.amount}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.customerInfo?.name || order.studentInfo?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customerInfo?.phone || order.studentInfo?.phone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 space-y-1">
                        <div className="font-medium">
                          {order.deliveryOption?.type === 'pickup' ? '🏫 Pickup' : '🚚 Delivery'}
                        </div>
                        {order.deliveryOption?.type === 'pickup' && order.deliveryOption?.pickupLocation && (
                          <div className="text-xs text-gray-600">
                            {order.deliveryOption.pickupLocation.name}
                          </div>
                        )}
                        {order.deliveryOption?.type === 'delivery' && order.deliveryOption?.address && (
                          <div className="text-xs text-gray-600">
                            {order.deliveryOption.address.substring(0, 30)}...
                          </div>
                        )}
                        {order.deliveryOption?.deliveryCharge && (
                          <div className="text-xs text-red-600 font-medium">
                            +₹{order.deliveryOption.deliveryCharge}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.expectedDate ? (
                          <div className="font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            📅 {formatDate(order.expectedDate.toString())}
                          </div>
                        ) : (
                          <div className="text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            📅 {formatDate(getDefaultExpectedDate(order.createdAt))} (Default)
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.orderStatus)}`}>
                          {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderPaymentStatusColor(order.paymentStatus)}`}>
                          Payment {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="space-y-2 min-w-[200px]">
                        {/* Status Update Dropdown */}
                        <select
                          value={order.orderStatus}
                          onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                          className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="printing">Printing</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="delivered">Delivered</option>
                        </select>

                        {/* File Download */}
                        {order.orderType === 'file' && order.fileURL && (
                          <a
                            href={`/api/admin/pdf-viewer?url=${encodeURIComponent(order.fileURL)}&orderId=${order.orderId}&filename=${order.originalFileName || 'document'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full bg-black text-white text-center px-3 py-1 rounded text-xs hover:bg-gray-800 transition-colors truncate"
                            title={`Download ${order.originalFileName || 'File'}`}
                          >
                            Download {order.originalFileName ? order.originalFileName.substring(0, 20) + '...' : 'File'}
                          </a>
                        )}

                        {/* Template PDF Download */}
                        {order.orderType === 'template' && order.templateData?.generatedPDF && (
                          <a
                            href={order.templateData.generatedPDF}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full bg-gray-800 text-white text-center px-3 py-1 rounded text-xs hover:bg-black transition-colors"
                          >
                            View PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg">No orders found.</div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGoogleAuth 
      title="Admin Dashboard"
      subtitle="Sign in with Google to manage all printing orders and track their status"
    >
      <AdminDashboardContent />
    </AdminGoogleAuth>
  );
}
