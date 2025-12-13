'use client';

import Link from 'next/link';
import { useAdminInfo } from '@/hooks/useAdminInfo';

export default function ReturnPolicyPage() {
  const { adminInfo } = useAdminInfo();
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Return Policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Return Eligibility</h2>
              <p className="text-gray-700 mb-4">
                Due to the nature of printing services, returns are limited to specific circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Quality issues with printed materials</li>
                <li>Incorrect specifications provided by us</li>
                <li>Technical errors on our part</li>
                <li>Damaged or defective prints</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Return Process</h2>
              <p className="text-gray-700 mb-4">
                To initiate a return, please contact us within 24 hours of receiving your order:
              </p>
              <ol className="list-decimal pl-6 text-gray-700 mb-4">
                <li>Contact our customer service team</li>
                <li>Provide order details and photos of issues</li>
                <li>We will assess the situation</li>
                <li>If approved, we will reprint or refund</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Non-Returnable Items</h2>
              <p className="text-gray-700 mb-4">The following are not eligible for returns:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Orders with correct specifications</li>
                <li>Customer-provided incorrect information</li>
                <li>Change of mind after printing</li>
                <li>Custom template orders</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For return requests, please contact us:
              </p>
              <ul className="list-none pl-6 text-gray-700 mb-4">
                <li>Email: {adminInfo?.email || 'info@printservice.com'}</li>
                <li>Phone: {adminInfo?.phone || '+91 98765 43210'}</li>
                <li>Business Hours: {adminInfo?.businessHours ? `${adminInfo.businessHours.monday} - ${adminInfo.businessHours.saturday}` : 'Mon-Sat: 9AM-6PM'}</li>
              </ul>
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
