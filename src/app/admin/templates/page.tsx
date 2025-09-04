'use client';

import Link from 'next/link';

export default function AdminTemplatesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Template Management</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Manage all types of templates including PDF templates, dynamic templates, and more
          </p>
        </div>

        {/* Template Management Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* PDF Templates */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6">
              <div className="text-white text-center">
                <div className="text-4xl mb-3">📄</div>
                <h3 className="text-xl font-semibold mb-2">PDF Templates</h3>
                <p className="text-blue-100">Manage static PDF templates</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Assignment Cover Pages
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Resume Templates
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Lab Report Templates
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Certificate Templates
                </div>
              </div>
              <Link
                href="/admin/templates"
                className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Manage PDF Templates
              </Link>
            </div>
          </div>

          {/* Dynamic Templates */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-6">
              <div className="text-white text-center">
                <div className="text-4xl mb-3">🔧</div>
                <h3 className="text-xl font-semibold mb-2">Dynamic Templates</h3>
                <p className="text-purple-100">Create interactive PDF templates</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                  Upload PDF Files
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                  Add Placeholders
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                  Interactive Editing
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                  Form Generation
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/admin/templates/dynamic/upload"
                  className="block w-full bg-purple-600 text-white text-center py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Create New Template
                </Link>
                <Link
                  href="/admin/templates/dynamic"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Manage Templates
                </Link>
              </div>
            </div>
          </div>

          {/* Template Analytics */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6">
              <div className="text-white text-center">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="text-xl font-semibold mb-2">Analytics</h3>
                <p className="text-green-100">Template usage statistics</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Total Templates
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Most Used Templates
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  User Engagement
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Performance Metrics
                </div>
              </div>
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                View Analytics
              </button>
            </div>
          </div>

          {/* Template Settings */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6">
              <div className="text-white text-center">
                <div className="text-4xl mb-3">⚙️</div>
                <h3 className="text-xl font-semibold mb-2">Settings</h3>
                <p className="text-orange-100">Configure template options</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Category Management
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Permission Settings
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  Template Approval
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  System Configuration
                </div>
              </div>
              <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors">
                Configure Settings
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6">
              <div className="text-white text-center">
                <div className="text-4xl mb-3">🚀</div>
                <h3 className="text-xl font-semibold mb-2">Quick Actions</h3>
                <p className="text-indigo-100">Fast template operations</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                  Bulk Import
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                  Export Templates
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                  Duplicate Template
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                  Archive Templates
                </div>
              </div>
              <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                Quick Actions
              </button>
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-6">
              <div className="text-white text-center">
                <div className="text-4xl mb-3">❓</div>
                <h3 className="text-xl font-semibold mb-2">Help & Support</h3>
                <p className="text-teal-100">Get assistance with templates</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-3"></span>
                  Documentation
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-3"></span>
                  Video Tutorials
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-3"></span>
                  Live Chat Support
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mr-3"></span>
                  Contact Support
                </div>
              </div>
              <button className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                Get Help
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
