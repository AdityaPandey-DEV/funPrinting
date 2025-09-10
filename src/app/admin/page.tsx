'use client';

import { useState, useEffect } from 'react';
import AdminNavigation from '@/components/admin/AdminNavigation';
import { AdminCard } from '@/components/admin/AdminNavigation';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import AdminRouteProtection from '@/components/admin/AdminRouteProtection';
import { getOrderStatusColor, getOrderPaymentStatusColor, formatDate } from '@/lib/adminUtils';

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
    pickupLocation?: string;
    deliveryCharge?: number;
    address?: string;
  };
  paymentStatus: 'pending' | 'completed' | 'failed';
  orderStatus: 'pending' | 'printing' | 'dispatched' | 'delivered';
  amount: number;
  expectedDate?: string | Date;
  createdAt: string;
}

function AdminDashboardContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/orders');
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
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderStatus: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === orderId
              ? { ...order, orderStatus: newStatus as Order['orderStatus'] }
              : order
          )
        );
        alert('Order status updated successfully');
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('An error occurred while updating order status');
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading orders..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
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
                {isLoading ? 'Refreshing...' : 'Refresh Orders'}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('adminAuthenticated');
                  localStorage.removeItem('adminLoginTime');
                  window.location.href = '/';
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </>
          }
        />

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <AdminCard
            icon="📋"
            title="Orders"
            description="Manage print orders"
            href="/admin/orders"
            count={orders.length}
          />
          <AdminCard
            icon="📄"
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">All Orders</h2>
              <p className="text-sm text-gray-600">💡 Click on any order row to view detailed information</p>
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
                    Printing Options
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
                {orders.map((order) => (
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
                        <div className="font-medium">{order.printingOptions.pageSize}</div>
                        <div>
                          {order.printingOptions.color === 'color' ? '🟢 Color' : 
                           order.printingOptions.color === 'bw' ? '⚫ B/W' : 
                           '🎨 Mixed'}
                        </div>
                        <div>{order.printingOptions.sided === 'double' ? '📄 Double' : '📃 Single'}</div>
                        <div>{order.printingOptions.copies} copies</div>
                        {order.printingOptions.pageCount && order.printingOptions.pageCount > 1 && order.printingOptions.serviceOption && (
                          <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                            {order.printingOptions.serviceOption === 'binding' ? '📎 Binding' :
                             order.printingOptions.serviceOption === 'file' ? '🗂️ File Handling' :
                             '✅ Service Fee'}
                          </div>
                        )}
                        {order.printingOptions.color === 'mixed' && order.printingOptions.pageColors && (
                          <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            🎨 {order.printingOptions.pageColors.colorPages.length} color, {order.printingOptions.pageColors.bwPages.length} B&W
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
                          <div className="text-gray-400 italic bg-gray-50 px-2 py-1 rounded">⚠️ Not set</div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="space-y-2">
                        {/* Status Update Dropdown */}
                        <select
                          value={order.orderStatus}
                          onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                          className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                        >
                          <option value="pending">Pending</option>
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
                            className="block w-full bg-black text-white text-center px-3 py-1 rounded text-xs hover:bg-gray-800 transition-colors"
                          >
                            Download {order.originalFileName || 'File'}
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
  );
}

export default function AdminDashboard() {
  return (
    <AdminRouteProtection 
      title="Admin Dashboard"
      subtitle="Manage all printing orders and track their status"
    >
      <AdminDashboardContent />
    </AdminRouteProtection>
  );
}
