'use client';

import Link from 'next/link';
import { EmailIcon, PhoneIcon, ClockIcon } from '@/components/SocialIcons';

export default function ShippingDeliveryPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Shipping and Delivery Policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Delivery Options</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-3">🏢 Pickup Service</h3>
                  <ul className="text-green-700 space-y-2">
                    <li>• Free pickup from designated locations</li>
                    <li>• Available at college campus</li>
                    <li>• Multiple pickup points</li>
                    <li>• Flexible pickup times</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">🚚 Hostel Delivery</h3>
                  <ul className="text-blue-700 space-y-2">
                    <li>• Delivery to hostel rooms</li>
                    <li>• Additional delivery charges apply</li>
                    <li>• Specific delivery time slots</li>
                    <li>• Contactless delivery available</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Processing and Delivery Timeframes</h2>
              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Standard Processing Times:</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-2">1-2 Hours</div>
                    <div className="text-sm text-gray-600">Small Orders<br/>(1-10 pages)</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 mb-2">2-4 Hours</div>
                    <div className="text-sm text-gray-600">Medium Orders<br/>(11-50 pages)</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-red-600 mb-2">4-6 Hours</div>
                    <div className="text-sm text-gray-600">Large Orders<br/>(50+ pages)</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">Important Note:</p>
                <p className="text-yellow-700">Processing times may vary during peak hours, weekends, and holidays. Rush orders are available for additional charges.</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Pickup Locations</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Available Pickup Points:</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Main Campus</h4>
                    <ul className="text-blue-700 space-y-1 text-sm">
                      <li>• Library Building - Ground Floor</li>
                      <li>• Student Center - Room 101</li>
                      <li>• Admin Block - Reception</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Hostel Areas</h4>
                    <ul className="text-blue-700 space-y-1 text-sm">
                      <li>• Boys Hostel - Common Room</li>
                      <li>• Girls Hostel - Security Desk</li>
                      <li>• PG Hostel - Reception</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">
                <strong>Pickup Hours:</strong> Monday to Saturday, 9:00 AM to 6:00 PM
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Hostel Delivery Service</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Delivery Details:</h3>
                <ul className="text-green-700 space-y-2">
                  <li><strong>Delivery Charges:</strong> ₹20 per order</li>
                  <li><strong>Delivery Time:</strong> Within 2 hours of order completion</li>
                  <li><strong>Delivery Hours:</strong> 10:00 AM to 8:00 PM</li>
                  <li><strong>Contact Required:</strong> Recipient must be available</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-orange-800 font-medium">Delivery Instructions:</p>
                <ul className="text-orange-700 space-y-1 text-sm">
                  <li>• Provide accurate hostel name and room number</li>
                  <li>• Keep your phone accessible for delivery calls</li>
                  <li>• Be available during the delivery time slot</li>
                  <li>• Show student ID for verification</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Order Tracking</h2>
              <p className="text-gray-700 mb-4">
                Track your order status through multiple channels:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Online Tracking:</strong> Visit &quot;My Orders&quot; page with your order ID</li>
                <li><strong>SMS Updates:</strong> Receive status updates via SMS</li>
                <li><strong>Email Notifications:</strong> Get email updates at each stage</li>
                <li><strong>Customer Support:</strong> Call us for real-time updates</li>
              </ul>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Order Status Stages:</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span>Order Placed</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span>Processing</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span>Ready for Pickup/Delivery</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                    <span>Completed</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Failed Deliveries</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                <h3 className="text-lg font-semibold text-red-800 mb-4">What happens if delivery fails?</h3>
                <ul className="text-red-700 space-y-2">
                  <li>• We will attempt delivery 2 more times</li>
                  <li>• Orders will be held for 48 hours</li>
                  <li>• After 48 hours, order moves to pickup location</li>
                  <li>• No refund for failed deliveries due to customer unavailability</li>
                </ul>
              </div>
              
              <p className="text-gray-700 mb-4">
                <strong>To avoid failed deliveries:</strong> Ensure you&apos;re available during delivery time, keep your phone accessible, and provide accurate delivery information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Delivery Charges</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Service</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Charge</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Pickup Service</td>
                      <td className="px-4 py-3 text-sm text-gray-900">Free</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Available at designated locations</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Hostel Delivery</td>
                      <td className="px-4 py-3 text-sm text-gray-900">₹20</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Per order, regardless of size</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Rush Delivery</td>
                      <td className="px-4 py-3 text-sm text-gray-900">₹50</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Within 1 hour of completion</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Special Circumstances</h2>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">Holidays and Weekends</h3>
                  <p className="text-yellow-700">Delivery and pickup services may be limited during holidays and weekends. Processing times may be extended.</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Weather Conditions</h3>
                  <p className="text-blue-700">Delivery may be delayed during extreme weather conditions. We will notify you of any delays.</p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">Bulk Orders</h3>
                  <p className="text-green-700">For orders with 100+ pages, special delivery arrangements can be made. Contact us for details.</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Contact for Delivery Issues</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 font-medium mb-2">For delivery-related issues:</p>
                <ul className="text-blue-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <EmailIcon size={16} className="w-4 h-4" />
                    Email: delivery@funprinting.com
                  </li>
                  <li className="flex items-center gap-2">
                    <PhoneIcon size={16} className="w-4 h-4" />
                    Phone: +91 98765 43210
                  </li>
                  <li className="flex items-center gap-2">
                    <ClockIcon size={16} className="w-4 h-4" />
                    Support Hours: Mon-Sat 9AM-6PM
                  </li>
                </ul>
              </div>
              
              <p className="text-gray-700 mb-4">
                <strong>Response Time:</strong> We aim to respond to delivery inquiries within 2 hours during business hours.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Policy Updates</h2>
              <p className="text-gray-700 mb-4">
                This shipping and delivery policy may be updated from time to time. Changes will be effective immediately upon posting on our website. Continued use of our services constitutes acceptance of any modifications.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
