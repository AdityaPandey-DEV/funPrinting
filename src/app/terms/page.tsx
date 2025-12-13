'use client';

import Link from 'next/link';
import { useAdminInfo } from '@/hooks/useAdminInfo';

export default function TermsPage() {
  const { adminInfo } = useAdminInfo();
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using funPrinting services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Service Description</h2>
              <p className="text-gray-700 mb-4">
                funPrinting provides printing services including but not limited to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Document printing (PDF, DOCX, JPG, JPEG, PNG)</li>
                <li>Professional template generation</li>
                <li>Assignment covers, resumes, lab reports, certificates</li>
                <li>Pickup and delivery services</li>
                <li>Payment processing through Razorpay</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Responsibilities</h2>
              <p className="text-gray-700 mb-4">You agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide accurate and complete information</li>
                <li>Ensure uploaded files are legal and appropriate</li>
                <li>Not upload copyrighted material without permission</li>
                <li>Pay all charges for services rendered</li>
                <li>Collect orders within the specified timeframe</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Payment Terms</h2>
              <p className="text-gray-700 mb-4">
                All payments are processed securely through Razorpay. Payment is required at the time of order placement. Prices are subject to change without notice.
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Base price: ₹5 per A4 page</li>
                <li>Color printing: Additional charges apply</li>
                <li>Multiple copies: Price multiplied by number of copies</li>
                <li>Delivery charges: As specified during checkout</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Order Processing</h2>
              <p className="text-gray-700 mb-4">
                Orders are processed in the order received. Processing time varies based on order volume and complexity. We reserve the right to refuse service for any reason.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                Users retain ownership of their uploaded content. funPrinting does not claim ownership of user-generated content. Users are responsible for ensuring they have rights to print uploaded materials.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Privacy and Data Protection</h2>
              <p className="text-gray-700 mb-4">
                We are committed to protecting your privacy. Personal information is collected, used, and stored in accordance with our Privacy Policy. Payment information is processed securely through Razorpay.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                funPrinting shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Dispute Resolution</h2>
              <p className="text-gray-700 mb-4">
                Any disputes arising from these terms shall be resolved through mutual discussion. If resolution cannot be reached, disputes shall be subject to the jurisdiction of local courts.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Modifications</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of the service constitutes acceptance of modified terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For questions about these terms, please contact us:
              </p>
              <ul className="list-none pl-6 text-gray-700 mb-4">
                <li>Email: {adminInfo?.email || 'info@printservice.com'}</li>
                <li>Phone: {adminInfo?.phone || '+91 98765 43210'}</li>
                <li>Address: {adminInfo?.address ? `${adminInfo.address}, ${adminInfo.city}, ${adminInfo.state} ${adminInfo.pincode}` : 'College Campus'}</li>
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
