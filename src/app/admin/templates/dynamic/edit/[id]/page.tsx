'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminGoogleAuth from '@/components/admin/AdminGoogleAuth';
import { WarningIcon } from '@/components/SocialIcons';

interface FormField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  defaultPlaceholder?: string;
}

interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;
  pdfUrl: string;
  placeholders: string[];
  formSchema?: FormField[];
  os?: string;
  dbms?: string;
  programmingLanguage?: string;
  framework?: string;
  tools?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function EditDynamicTemplateContent() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'lab-manual',
    os: '',
    dbms: '',
    programmingLanguage: '',
    framework: '',
    tools: [] as string[],
  });
  const [newTool, setNewTool] = useState('');
  const [formSchema, setFormSchema] = useState<FormField[]>([]);
  
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/templates/dynamic/${templateId}`);
      const data = await response.json();
      
      if (data.success) {
        setTemplate(data.template);
        setFormData({
          name: data.template.name,
          description: data.template.description,
          category: data.template.category,
          os: data.template.os || '',
          dbms: data.template.dbms || '',
          programmingLanguage: data.template.programmingLanguage || '',
          framework: data.template.framework || '',
          tools: data.template.tools || [],
        });
        // Load formSchema and ensure defaultPlaceholder is set
        if (data.template.formSchema && Array.isArray(data.template.formSchema) && data.template.formSchema.length > 0) {
          const schemaWithDefaults = data.template.formSchema.map((field: any) => ({
            ...field,
            defaultPlaceholder: field.defaultPlaceholder || field.placeholder || `Enter ${field.key || field.label || ''}`
          }));
          setFormSchema(schemaWithDefaults);
        } else if (data.template.placeholders && Array.isArray(data.template.placeholders) && data.template.placeholders.length > 0) {
          // Generate formSchema from placeholders if formSchema doesn't exist
          const generatedSchema = data.template.placeholders.map((placeholder: string) => {
            const defaultPlaceholder = `Enter ${placeholder}`;
            return {
              key: placeholder,
              type: 'text',
              label: placeholder.charAt(0).toUpperCase() + placeholder.slice(1),
              required: true,
              placeholder: defaultPlaceholder,
              defaultPlaceholder: defaultPlaceholder
            };
          });
          setFormSchema(generatedSchema);
        } else {
          setFormSchema([]);
        }
      } else {
        setError('Failed to fetch template');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId, fetchTemplate]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTool = () => {
    if (newTool.trim() && !formData.tools.includes(newTool.trim())) {
      setFormData(prev => ({
        ...prev,
        tools: [...prev.tools, newTool.trim()]
      }));
      setNewTool('');
    }
  };

  const removeTool = (toolToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.filter(tool => tool !== toolToRemove)
    }));
  };

  const handlePlaceholderReset = (fieldIndex: number) => {
    setFormSchema(prev => {
      const updated = [...prev];
      const field = updated[fieldIndex];
      if (field) {
        // Reset placeholder to default value
        updated[fieldIndex] = {
          ...field,
          placeholder: field.defaultPlaceholder || `Enter ${field.key || field.label || ''}`
        };
      }
      return updated;
    });
  };

  const handlePlaceholderRemove = (fieldIndex: number) => {
    setFormSchema(prev => {
      const updated = [...prev];
      const field = updated[fieldIndex];
      if (field) {
        // Remove placeholder (set to empty string, but keep defaultPlaceholder)
        updated[fieldIndex] = {
          ...field,
          placeholder: ''
        };
      }
      return updated;
    });
  };

  const handlePlaceholderRestore = (fieldIndex: number) => {
    setFormSchema(prev => {
      const updated = [...prev];
      const field = updated[fieldIndex];
      if (field) {
        // Restore placeholder from default
        updated[fieldIndex] = {
          ...field,
          placeholder: field.defaultPlaceholder || `Enter ${field.key || field.label || ''}`
        };
      }
      return updated;
    });
  };

  const handlePlaceholderChange = (fieldIndex: number, newPlaceholder: string) => {
    setFormSchema(prev => {
      const updated = [...prev];
      const field = updated[fieldIndex];
      if (field) {
        updated[fieldIndex] = {
          ...field,
          placeholder: newPlaceholder
        };
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      // Ensure formSchema is saved if it was generated from placeholders
      const schemaToSave = formSchema.length > 0 ? formSchema : undefined;
      const response = await fetch(`/api/admin/templates/dynamic/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          formSchema: schemaToSave
        }),
      });

      if (response.ok) {
        alert('Template updated successfully!');
        router.push('/admin/templates/dynamic');
      } else {
        alert('Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Error updating template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <WarningIcon size={64} className="w-16 h-16 text-red-500" />
          </div>
          <p className="text-red-600 text-lg mb-2">Error Loading Template</p>
          <p className="text-gray-600 mb-4">{error || 'Template not found'}</p>
          <Link
            href="/admin/templates/dynamic"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Template</h1>
            <p className="text-gray-600 mt-2">Update template details and technical information</p>
          </div>
          <Link
            href="/admin/templates/dynamic"
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            ← Back to Templates
          </Link>
        </div>

        {/* Template Info Display */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">ID:</span>
              <span className="ml-2 text-gray-600 font-mono">{template._id}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <span className="ml-2 text-gray-600">{new Date(template.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <span className="ml-2 text-gray-600">{new Date(template.updatedAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Created By:</span>
              <span className="ml-2 text-gray-600">{template.createdBy}</span>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">PDF URL:</span>
              <span className="ml-2 text-gray-600 break-all">{template.pdfUrl}</span>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Placeholders:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {template.placeholders.map((placeholder, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {placeholder}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Template Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter template name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this template is for..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="lab-manual">Lab Manual</option>
                <option value="assignment">Assignment</option>
                <option value="report">Report</option>
                <option value="certificate">Certificate</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Technical Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operating System
              </label>
              <input
                type="text"
                value={formData.os}
                onChange={(e) => handleInputChange('os', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Windows, Linux, macOS"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Management System
              </label>
              <input
                type="text"
                value={formData.dbms}
                onChange={(e) => handleInputChange('dbms', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., MySQL, PostgreSQL, Oracle"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Programming Language
              </label>
              <input
                type="text"
                value={formData.programmingLanguage}
                onChange={(e) => handleInputChange('programmingLanguage', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Python, Java, C++"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Framework
              </label>
              <input
                type="text"
                value={formData.framework}
                onChange={(e) => handleInputChange('framework', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., React, Django, Spring"
              />
            </div>

            {/* Tools Management */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tools
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a tool (e.g., Git, VS Code)"
                />
                <button
                  type="button"
                  onClick={addTool}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              
              {formData.tools.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tools.map((tool, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {tool}
                      <button
                        type="button"
                        onClick={() => removeTool(tool)}
                        className="text-red-500 hover:text-red-700 text-lg"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Form Schema Placeholder Management (Admin Only) */}
            {(formSchema.length > 0 || (template.placeholders && template.placeholders.length > 0)) && (
              <div className="md:col-span-2 border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Schema Placeholders</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Manage placeholders for form fields. Click &quot;Remove&quot; to reset to default value, or &quot;Restore&quot; to add back if removed.
                </p>
                <div className="space-y-3">
                  {formSchema.map((field, index) => (
                    <div key={field.key || index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => handlePlaceholderChange(index, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={field.defaultPlaceholder || `Enter ${field.key || field.label || ''}`}
                        />
                        {field.defaultPlaceholder && (
                          <p className="text-xs text-gray-500 mt-1">
                            Default: {field.defaultPlaceholder}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {field.placeholder && field.placeholder !== field.defaultPlaceholder ? (
                          <button
                            type="button"
                            onClick={() => handlePlaceholderReset(index)}
                            className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                            title="Reset to default placeholder"
                          >
                            Reset
                          </button>
                        ) : field.placeholder ? (
                          <button
                            type="button"
                            onClick={() => handlePlaceholderRemove(index)}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            title="Remove placeholder (set to empty)"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePlaceholderRestore(index)}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            title="Restore default placeholder"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <Link
              href="/admin/templates/dynamic"
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditDynamicTemplate() {
  return (
    <AdminGoogleAuth 
      title="Edit Dynamic Template"
      subtitle="Sign in with Google to edit dynamic Word templates"
    >
      <EditDynamicTemplateContent />
    </AdminGoogleAuth>
  );
}
