'use client';

import { useState, useEffect } from 'react';
import { useAdminInfo } from '@/hooks/useAdminInfo';

interface Printer {
  _id: string;
  name: string;
  printerModel: string;
  manufacturer: string;
  connectionType: 'usb' | 'network' | 'wireless';
  connectionString: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  capabilities: {
    supportedPageSizes: string[];
    supportsColor: boolean;
    supportsDuplex: boolean;
    maxCopies: number;
    supportedFileTypes: string[];
  };
  autoPrintEnabled: boolean;
  isActive: boolean;
}

export default function PrinterSetup() {
  const { adminInfo } = useAdminInfo();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    printerModel: '',
    manufacturer: '',
    connectionType: 'usb' as 'usb' | 'network' | 'wireless',
    connectionString: '',
    capabilities: {
      supportedPageSizes: ['A4'],
      supportsColor: false,
      supportsDuplex: false,
      maxCopies: 1,
      supportedFileTypes: ['application/pdf']
    }
  });

  useEffect(() => {
    fetchPrinters();
  }, []);

  const fetchPrinters = async () => {
    try {
      const response = await fetch('/api/printing/printers');
      if (response.ok) {
        const data = await response.json();
        setPrinters(data.printers || []);
      }
    } catch (error) {
      console.error('Error fetching printers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingPrinter 
        ? `/api/printing/printers/${editingPrinter._id}`
        : '/api/printing/printers';
      
      const method = editingPrinter ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Printer saved:', data);
        await fetchPrinters();
        resetForm();
        alert(editingPrinter ? 'Printer updated successfully!' : 'Printer added successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving printer:', error);
      alert('Failed to save printer');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      printerModel: '',
      manufacturer: '',
      connectionType: 'usb',
      connectionString: '',
      capabilities: {
        supportedPageSizes: ['A4'],
        supportsColor: false,
        supportsDuplex: false,
        maxCopies: 1,
        supportedFileTypes: ['application/pdf']
      }
    });
    setEditingPrinter(null);
    setShowAddForm(false);
  };

  const handleEdit = (printer: Printer) => {
    setFormData({
      name: printer.name,
      printerModel: printer.printerModel,
      manufacturer: printer.manufacturer,
      connectionType: printer.connectionType,
      connectionString: printer.connectionString,
      capabilities: printer.capabilities
    });
    setEditingPrinter(printer);
    setShowAddForm(true);
  };

  const handleDelete = async (printerId: string) => {
    if (!confirm('Are you sure you want to delete this printer?')) return;

    try {
      const response = await fetch(`/api/printing/printers/${printerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchPrinters();
        alert('Printer deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting printer:', error);
      alert('Failed to delete printer');
    }
  };

  const toggleAutoPrint = async (printerId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/printing/printers/${printerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoPrintEnabled: enabled })
      });

      if (response.ok) {
        await fetchPrinters();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating printer:', error);
      alert('Failed to update printer');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading printers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🖨️ Printer Setup</h1>
          <p className="mt-2 text-gray-600">
            Configure and manage your printing devices for auto-printing
          </p>
        </div>

        {/* Add Printer Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add New Printer
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingPrinter ? 'Edit Printer' : 'Add New Printer'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Printer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Main Office Printer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.printerModel}
                    onChange={(e) => setFormData({ ...formData, printerModel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., LaserJet Pro M404n"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., HP, Canon, Epson"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection Type *
                  </label>
                  <select
                    required
                    value={formData.connectionType}
                    onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="usb">USB</option>
                    <option value="network">Network</option>
                    <option value="wireless">Wireless</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection String *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.connectionString}
                    onChange={(e) => setFormData({ ...formData, connectionString: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., /dev/usb/lp0, 192.168.1.100, printer-name"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    USB: Device path | Network: IP address | Wireless: Printer name
                  </p>
                </div>
              </div>

              {/* Capabilities */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Printer Capabilities</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supported Page Sizes
                    </label>
                    <div className="space-y-2">
                      {['A4', 'A3', 'Letter', 'Legal'].map((size) => (
                        <label key={size} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.capabilities.supportedPageSizes.includes(size)}
                            onChange={(e) => {
                              const sizes = e.target.checked
                                ? [...formData.capabilities.supportedPageSizes, size]
                                : formData.capabilities.supportedPageSizes.filter(s => s !== size);
                              setFormData({
                                ...formData,
                                capabilities: { ...formData.capabilities, supportedPageSizes: sizes }
                              });
                            }}
                            className="mr-2"
                          />
                          {size}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Features
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.capabilities.supportsColor}
                          onChange={(e) => setFormData({
                            ...formData,
                            capabilities: { ...formData.capabilities, supportsColor: e.target.checked }
                          })}
                          className="mr-2"
                        />
                        Color Printing
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.capabilities.supportsDuplex}
                          onChange={(e) => setFormData({
                            ...formData,
                            capabilities: { ...formData.capabilities, supportsDuplex: e.target.checked }
                          })}
                          className="mr-2"
                        />
                        Duplex (Double-sided)
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Copies
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={formData.capabilities.maxCopies}
                      onChange={(e) => setFormData({
                        ...formData,
                        capabilities: { ...formData.capabilities, maxCopies: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPrinter ? 'Update Printer' : 'Add Printer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Printers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {printers.map((printer) => (
            <div key={printer._id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{printer.name}</h3>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(printer.status)}`}>
                  {printer.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div><strong>Model:</strong> {printer.printerModel}</div>
                <div><strong>Manufacturer:</strong> {printer.manufacturer}</div>
                <div><strong>Connection:</strong> {printer.connectionType}</div>
                <div><strong>Connection String:</strong> {printer.connectionString}</div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Capabilities</h4>
                <div className="flex flex-wrap gap-2">
                  {printer.capabilities.supportsColor && (
                    <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      Color
                    </span>
                  )}
                  {printer.capabilities.supportsDuplex && (
                    <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      Duplex
                    </span>
                  )}
                  <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                    Max {printer.capabilities.maxCopies} copies
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={printer.autoPrintEnabled}
                    onChange={(e) => toggleAutoPrint(printer._id, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Auto Print</span>
                </label>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(printer)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(printer._id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {printers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No printers configured</div>
            <p className="text-gray-400 mt-2">Add your first printer to enable auto-printing</p>
          </div>
        )}
      </div>
    </div>
  );
}
