'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { WarningIcon, DocumentIcon, RefreshIcon } from '@/components/SocialIcons';

interface FormField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

interface Template {
  id: string;
  _id: string;
  name: string;
  description: string;
  category: string;
  placeholders: string[];
  formSchema: FormField[];
  pdfUrl: string;
  wordUrl: string;
  isPublic: boolean;
  createdByType: string;
  createdByUserId?: string;
  createdByEmail?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'my' | 'public'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();

      if (result.success) {
        setTemplates(result.templates);
      } else {
        setError(result.error || 'Failed to load templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  // Get user email for filtering
  const userEmail = session?.user?.email?.toLowerCase();

  // Filter templates based on selected filter
  const filteredTemplates = templates.filter(template => {
    // Filter by type
    if (filterType === 'my') {
      if (!userEmail) return false;
      const isMyTemplate = template.createdByEmail?.toLowerCase() === userEmail ||
                          template.createdByUserId?.toString() === (session?.user as any)?.id;
      if (!isMyTemplate) return false;
    } else if (filterType === 'public') {
      if (!template.isPublic) return false;
    }

    // Filter by search term
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by category
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <WarningIcon size={64} className="w-16 h-16 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
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
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Available Templates
            </h1>
            <p className="text-xl text-gray-600">
              Choose a template and fill out the form to generate your personalized document
            </p>
          </div>
          {session && (
            <Link
              href="/templates/create"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create Template
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'my' | 'public')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Templates</option>
                {session && <option value="my">My Templates</option>}
                <option value="public">Public Templates</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
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
                <span className="flex items-center gap-2">
                  <RefreshIcon size={18} className="w-4.5 h-4.5" />
                  Refresh
                </span>
              </button>
            </div>
          </div>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="flex justify-center mb-4">
              <DocumentIcon size={64} className="w-16 h-16 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Templates Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterCategory !== 'all' || filterType !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'There are no templates available at the moment. Please check back later.'
              }
            </p>
            {session && !searchTerm && filterCategory === 'all' && filterType === 'all' && (
              <Link
                href="/templates/create"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-block"
              >
                Create Your First Template
              </Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const isMyTemplate = userEmail && (
                template.createdByEmail?.toLowerCase() === userEmail ||
                template.createdByUserId?.toString() === (session?.user as any)?.id
              );

              return (
                <div key={template.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow relative">
                  {/* Ownership Badge */}
                  {isMyTemplate && (
                    <div className="absolute top-4 right-4 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      My Template
                    </div>
                  )}
                  {template.isPublic && !isMyTemplate && (
                    <div className="absolute top-4 right-4 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      Public
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 pr-16">
                        {template.name}
                      </h3>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {template.category.replace('-', ' ')}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Created: {new Date(template.createdAt).toLocaleDateString()}</span>
                      {template.createdByName && !isMyTemplate && (
                        <span>By: {template.createdByName}</span>
                      )}
                    </div>
                  </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Required Information:</h4>
                  <div className="space-y-1">
                    {template.placeholders.slice(0, 3).map((placeholder) => (
                      <div key={placeholder} className="text-sm text-gray-600">
                        • {placeholder.charAt(0).toUpperCase() + placeholder.slice(1).replace(/([A-Z])/g, ' $1')}
                      </div>
                    ))}
                    {template.placeholders.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{template.placeholders.length - 3} more fields
                      </div>
                    )}
                  </div>
                </div>

                  <div className="pt-4 border-t border-gray-200">
                    <Link
                      href={`/templates/fill/${template.id}`}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium text-center block"
                    >
                      Fill Out Template
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How It Works
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <div className="font-semibold mb-1">1. Choose Template</div>
                <p>Select a template that matches your needs</p>
              </div>
              <div>
                <div className="font-semibold mb-1">2. Fill Information</div>
                <p>Complete the form with your details</p>
              </div>
              <div>
                <div className="font-semibold mb-1">3. Get Your Document</div>
                <p>Receive your personalized PDF instantly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}