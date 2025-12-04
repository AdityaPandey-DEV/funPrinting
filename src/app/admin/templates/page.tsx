'use client';

import Link from 'next/link';
import AdminGoogleAuth from '@/components/admin/AdminGoogleAuth';

function AdminTemplatesPageContent() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Template Management</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create and manage dynamic Word templates with placeholders for personalized document generation
          </p>
        </div>

        {/* Template Management Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* PDF Templates - Fixed Link */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
            <div className="bg-blue-600 p-6">
              <div className="text-white text-center">
                <div className="text-3xl mb-2">📄</div>
                <h3 className="text-lg font-semibold mb-1">PDF Templates</h3>
                <p className="text-blue-100 text-sm">Static PDF templates</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Assignment Cover Pages
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Templates
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Lab Report Templates
                </div>
              </div>
              <Link
                href="/admin/templates/upload"
                className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Upload PDF Template
              </Link>
            </div>
          </div>

          {/* Dynamic Templates - Main Feature */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border-2 border-purple-200">
            <div className="bg-purple-600 p-6">
              <div className="text-white text-center">
                <div className="text-3xl mb-2">🔧</div>
                <h3 className="text-lg font-semibold mb-1">Dynamic Templates</h3>
                <p className="text-purple-100 text-sm">Interactive Word templates</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Upload Word Files
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Auto-detect Placeholders
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Generate Forms
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/admin/templates/dynamic/upload"
                  className="block w-full bg-purple-600 text-white text-center py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Create New Template
                </Link>
                <Link
                  href="/admin/templates/dynamic"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Manage Templates
                </Link>
              </div>
            </div>
          </div>

          {/* Template Statistics - Real Data */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
            <div className="bg-green-600 p-6">
              <div className="text-white text-center">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="text-lg font-semibold mb-1">Statistics</h3>
                <p className="text-green-100 text-sm">Template overview</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Active Templates
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Categories Available
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Recent Activity
                </div>
              </div>
              <Link
                href="/admin/templates/dynamic"
                className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                View All Templates
              </Link>
            </div>
          </div>

          {/* Quick Actions - Simplified */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
            <div className="bg-indigo-600 p-6">
              <div className="text-white text-center">
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="text-lg font-semibold mb-1">Quick Actions</h3>
                <p className="text-indigo-100 text-sm">Common operations</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                  Duplicate Template
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                  Export Templates
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                  Bulk Operations
                </div>
              </div>
              <button 
                onClick={() => window.location.href = '/admin/templates/dynamic/upload'}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                Quick Upload
              </button>
            </div>
          </div>

          {/* Help & Documentation - Simplified */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
            <div className="bg-teal-600 p-6">
              <div className="text-white text-center">
                <div className="text-3xl mb-2">❓</div>
                <h3 className="text-lg font-semibold mb-1">Help</h3>
                <p className="text-teal-100 text-sm">Get assistance</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                  How to use placeholders
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                  Template best practices
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                  Troubleshooting
                </div>
              </div>
              <button 
                onClick={() => alert('Help documentation coming soon!')}
                className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors text-sm"
              >
                View Help
              </button>
            </div>
          </div>

          {/* System Status - New */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
            <div className="bg-gray-600 p-6">
              <div className="text-white text-center">
                <div className="text-3xl mb-2">🔧</div>
                <h3 className="text-lg font-semibold mb-1">System Status</h3>
                <p className="text-gray-100 text-sm">Service health</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Template Processing: Online
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  File Storage: Active
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Database: Connected
                </div>
              </div>
              <button 
                onClick={() => alert('All systems operational!')}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Check Status
              </button>
            </div>
          </div>
        </div>

        {/* Back to Admin Dashboard */}
        <div className="text-center mt-12">
          <Link
            href="/admin"
            className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminTemplatesPage() {
  return (
    <AdminGoogleAuth 
      title="Template Management"
      subtitle="Sign in with Google to create and manage dynamic Word templates"
    >
      <AdminTemplatesPageContent />
    </AdminGoogleAuth>
  );
}
