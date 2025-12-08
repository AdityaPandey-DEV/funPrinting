'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WarningIcon, DocumentIcon } from '@/components/SocialIcons';

interface Template {
  id: string;
  _id: string;
  name: string;
  description: string;
  category: string;
  placeholders: string[];
  pdfUrl: string;
  wordUrl?: string;
  createdByType: string;
  createdByEmail?: string;
  createdByName?: string;
  isPaid?: boolean;
  price?: number;
  allowFreeDownload?: boolean;
  createdAt: string;
  updatedAt: string;
}

function PublicTemplatesContent() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates/public');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      } else {
        setError('Failed to fetch templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <WarningIcon size={64} className="w-16 h-16 text-red-500" />
          </div>
          <p className="text-red-600 text-lg mb-2">Error Loading Templates</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchTemplates}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Public Templates</h1>
          <p className="text-gray-600">Browse templates shared by the community</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Templates</label>
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="lab-manual">Lab Manual</option>
                <option value="assignment">Assignment</option>
                <option value="report">Report</option>
                <option value="certificate">Certificate</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchTemplates}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="flex justify-center mb-4">
              <DocumentIcon size={64} className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {searchTerm || filterCategory !== 'all' ? 'No Templates Found' : 'No Public Templates Yet'}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterCategory !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Check back later for public templates shared by the community.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                {/* Template Preview */}
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <DocumentIcon size={64} className="w-16 h-16" />
                    </div>
                    <p className="text-sm text-gray-600">Public Template</p>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {template.category.replace('-', ' ')}
                  </div>

                  {/* Price/Free Badge */}
                  <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
                    template.isPaid && (template.price ?? 0) > 0 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {template.isPaid && (template.price ?? 0) > 0 
                      ? `₹${template.price}` 
                      : 'Free'}
                  </div>
                  
                  {/* Creator Type Badge */}
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {template.createdByType === 'admin' ? 'Admin' : 'User'}
                  </div>
                </div>

                {/* Template Info */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {template.name}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {template.description}
                  </p>

                  {/* Creator Info */}
                  {template.createdByName && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500">
                        Created by: <span className="font-medium">{template.createdByName}</span>
                      </p>
                    </div>
                  )}

                  {/* Placeholders count and date */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-500">
                      {template.placeholders.length} dynamic fields
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Action Button */}
                  <Link
                    href={`/templates/custom/${template.id}`}
                    className="block w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm font-medium"
                  >
                    Use Template
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{templates.length}</div>
            <div className="text-gray-600">Total Public Templates</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {templates.filter(t => t.category === 'lab-manual').length}
            </div>
            <div className="text-gray-600">Lab Manuals</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {templates.filter(t => t.category === 'assignment').length}
            </div>
            <div className="text-gray-600">Assignments</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicTemplatesPage() {
  return <PublicTemplatesContent />;
}

