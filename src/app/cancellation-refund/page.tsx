'use client';

import Link from 'next/link';
import { EmailIcon, PhoneIcon, ClockIcon } from '@/components/SocialIcons';
import { useAdminInfo } from '@/hooks/useAdminInfo';

export default function CancellationRefundPage() {
  const { adminInfo } = useAdminInfo();
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Cancellation and Refund Policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Order Deletion</h2>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-blue-800 font-medium">Important Notice:</p>
                <p className="text-blue-700">Pending payment orders can be deleted by the customer. Once payment is completed, orders cannot be deleted and refund requests must be made through customer support.</p>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Deletion Timeframes:</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Before Payment:</strong> Orders can be deleted by customer</li>
                <li><strong>After Payment:</strong> Contact support for refund requests</li>
                <li><strong>During Processing:</strong> Refund requests reviewed case-by-case</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Refund Eligibility</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">✅ Eligible for Refund</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Order deleted before payment completion</li>
                    <li>• Technical issues on our end</li>
                    <li>• Service unavailability</li>
                    <li>• Payment processing errors</li>
                  </ul>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">❌ Not Eligible for Refund</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Order already processed</li>
                    <li>• Customer changed mind after processing</li>
                    <li>• Incorrect file uploaded by customer</li>
                    <li>• Customer not available for pickup</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Refund Process</h2>
              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Step-by-Step Refund Process:</h3>
                <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                  <li><strong>Request Submission:</strong> Contact us via email or phone with order details</li>
                  <li><strong>Verification:</strong> We verify the order status and eligibility</li>
                  <li><strong>Approval:</strong> If eligible, refund is approved within 24 hours</li>
                  <li><strong>Processing:</strong> Refund processed through Razorpay</li>
                  <li><strong>Completion:</strong> Amount credited to original payment method</li>
                </ol>
              </div>
              
              <p className="text-gray-700 mb-4">
                <strong>Refund Timeline:</strong> Refunds are typically processed within 3-7 business days, depending on your bank&apos;s processing time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Refund Methods</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">Refund Method:</p>
                <p className="text-yellow-700">Refunds are processed to the original payment method used for the transaction.</p>
              </div>
              
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Credit/Debit Cards:</strong> Refunded to the same card</li>
                <li><strong>UPI:</strong> Refunded to the same UPI ID</li>
                <li><strong>Net Banking:</strong> Refunded to the same bank account</li>
                <li><strong>Digital Wallets:</strong> Refunded to the same wallet</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Partial Refunds</h2>
              <p className="text-gray-700 mb-4">
                Partial refunds may be available in specific circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Service partially completed due to technical issues</li>
                <li>Partial order cancellation (multiple items)</li>
                <li>Quality issues with partial order</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Quality Issues</h2>
              <p className="text-gray-700 mb-4">
                If you receive a printout with quality issues:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Contact us within 24 hours of pickup</li>
                <li>Provide photos of the quality issues</li>
                <li>We will reprint at no additional cost</li>
                <li>Full refund if reprint is not possible</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contact for Cancellation/Refund</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 font-medium mb-2">To request cancellation or refund:</p>
                <ul className="text-blue-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <EmailIcon size={16} className="w-4 h-4" />
                    Email: {adminInfo?.email || 'info@printservice.com'}
                  </li>
                  <li className="flex items-center gap-2">
                    <PhoneIcon size={16} className="w-4 h-4" />
                    Phone: {adminInfo?.phone || '+91 98765 43210'}
                  </li>
                  <li className="flex items-center gap-2">
                    <ClockIcon size={16} className="w-4 h-4" />
                    Business Hours: {adminInfo?.businessHours ? `${adminInfo.businessHours.monday} - ${adminInfo.businessHours.saturday}` : 'Mon-Sat: 9AM-6PM'}
                  </li>
                </ul>
              </div>
              
              <p className="text-gray-700 mb-4">
                <strong>Required Information:</strong> Please provide your order ID, name, phone number, and reason for cancellation/refund.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Dispute Resolution</h2>
              <p className="text-gray-700 mb-4">
                If you disagree with our refund decision:
              </p>
              <ol className="list-decimal pl-6 text-gray-700 mb-4">
                <li>Contact our customer service team</li>
                <li>Provide detailed explanation and evidence</li>
                <li>We will review and respond within 48 hours</li>
                <li>If unresolved, escalate to management</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Policy Updates</h2>
              <p className="text-gray-700 mb-4">
                This cancellation and refund policy may be updated from time to time. Changes will be effective immediately upon posting on our website. Continued use of our services constitutes acceptance of any modifications.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Legal Compliance</h2>
              <p className="text-gray-700 mb-4">
                This policy complies with Indian consumer protection laws and Razorpay&apos;s requirements. We are committed to fair and transparent refund practices.
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
