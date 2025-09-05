'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminNavigation from '@/components/admin/AdminNavigation';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { getCategoryIcon, getCategoryColor } from '@/lib/adminUtils';

interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;
  pdfUrl: string;
  placeholders: string[];
  os?: string;
  dbms?: string;
  programmingLanguage?: string;
  framework?: string;
  tools?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function ManageDynamicTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/templates/dynamic');
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

  const handleDelete = async (templateId: string) => {
    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/admin/templates/dynamic/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTemplates(templates.filter(t => t._id !== templateId));
        setShowDeleteModal(false);
        setSelectedTemplate(null);
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <LoadingSpinner message="Loading templates..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
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
        <AdminNavigation
          title="Manage Dynamic Templates"
          subtitle="Create, edit, and manage your dynamic templates"
          actions={
            <Link
              href="/admin/templates/dynamic/upload"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create New Template
            </Link>
          }
        />

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
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="form-input"
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
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {searchTerm || filterCategory !== 'all' ? 'No Templates Found' : 'No Templates Yet'}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterCategory !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Create your first dynamic template to get started!'
              }
            </p>
            {!searchTerm && filterCategory === 'all' && (
              <Link
                href="/admin/templates/dynamic/upload"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Create First Template
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template._id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                {/* PDF Preview Image - Top */}
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
                  <div className="text-center">
                    <div className="text-6xl mb-2">📄</div>
                    <p className="text-sm text-gray-600">PDF Template</p>
                  </div>
                  
                  {/* Category Badge */}
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {getCategoryIcon(template.category)} {template.category.replace('-', ' ')}
                  </div>
                </div>

                {/* Template Info - Bottom */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {template.name}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {template.description}
                  </p>

                  {/* Template-specific fields */}
                  <div className="space-y-2 mb-4">
                    {template.os && (
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium mr-2">OS:</span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{template.os}</span>
                      </div>
                    )}
                    
                    {template.dbms && (
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium mr-2">DBMS:</span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{template.dbms}</span>
                      </div>
                    )}
                    
                    {template.programmingLanguage && (
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium mr-2">Language:</span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{template.programmingLanguage}</span>
                      </div>
                    )}
                    
                    {template.framework && (
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium mr-2">Framework:</span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{template.framework}</span>
                      </div>
                    )}
                    
                    {template.tools && template.tools.length > 0 && (
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium mr-2">Tools:</span>
                        <div className="flex flex-wrap gap-1">
                          {template.tools.slice(0, 3).map((tool, index) => (
                            <span key={index} className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {tool}
                            </span>
                          ))}
                          {template.tools.length > 3 && (
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                              +{template.tools.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Placeholders count and date */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-500">
                      {template.placeholders.length} dynamic fields
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => router.push(`/templates/custom/${template._id}`)}
                      className="bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => router.push(`/admin/templates/dynamic/edit/${template._id}`)}
                      className="bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowDeleteModal(true);
                      }}
                      className="bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{templates.length}</div>
            <div className="text-gray-600">Total Templates</div>
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
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {templates.filter(t => t.category === 'certificate').length}
            </div>
            <div className="text-gray-600">Certificates</div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Template</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{selectedTemplate.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedTemplate._id)}
                disabled={deleteLoading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
