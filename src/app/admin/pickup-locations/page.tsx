'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminGoogleAuth from '@/components/admin/AdminGoogleAuth';

interface PickupLocation {
  _id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isActive: boolean;
  isDefault: boolean;
  description?: string;
  contactPerson?: string;
  contactPhone?: string;
  operatingHours?: string;
  createdAt: string;
  updatedAt: string;
}

interface LocationFormData {
  name: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  contactPerson: string;
  contactPhone: string;
  operatingHours: string;
}

function PickupLocationsPageContent() {
  const router = useRouter();
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<PickupLocation | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    lat: 28.7041,
    lng: 77.1025,
    description: '',
    contactPerson: '',
    contactPhone: '',
    operatingHours: '',
  });

  // Fetch pickup locations
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/admin/pickup-locations');
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.locations);
      } else {
        console.error('Failed to fetch locations:', data.error);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'lat' || name === 'lng' ? parseFloat(value) || 0 : value,
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      lat: 28.7041,
      lng: 77.1025,
      description: '',
      contactPerson: '',
      contactPhone: '',
      operatingHours: '',
    });
  };

  // Add new location
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/pickup-locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowAddModal(false);
        resetForm();
        fetchLocations();
        alert('Pickup location added successfully!');
      } else {
        alert(`Failed to add location: ${data.error}`);
      }
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Failed to add pickup location');
    }
  };

  // Edit location
  const handleEditLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingLocation) return;
    
    try {
      const response = await fetch('/api/admin/pickup-locations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingLocation._id,
          updates: formData,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowEditModal(false);
        setEditingLocation(null);
        resetForm();
        fetchLocations();
        alert('Pickup location updated successfully!');
      } else {
        alert(`Failed to update location: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Failed to update pickup location');
    }
  };

  // Delete location
  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pickup location?')) return;
    
    try {
      const response = await fetch(`/api/admin/pickup-locations?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        fetchLocations();
        alert('Pickup location deleted successfully!');
      } else {
        alert(`Failed to delete location: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete pickup location');
    }
  };

  // Set default location
  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch('/api/admin/pickup-locations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          updates: { isDefault: true },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchLocations();
        alert('Default pickup location updated successfully!');
      } else {
        alert(`Failed to update default location: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating default location:', error);
      alert('Failed to update default pickup location');
    }
  };

  // Toggle location active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/pickup-locations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          updates: { isActive: !currentStatus },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchLocations();
        alert(`Location ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      } else {
        alert(`Failed to update location status: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating location status:', error);
      alert('Failed to update location status');
    }
  };

  // Open edit modal
  const openEditModal = (location: PickupLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      description: location.description || '',
      contactPerson: location.contactPerson || '',
      contactPhone: location.contactPhone || '',
      operatingHours: location.operatingHours || '',
    });
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pickup locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pickup Locations Management</h1>
              <p className="text-gray-600 mt-2">Manage pickup locations for student orders</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Back to Admin
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Add Location
              </button>
            </div>
          </div>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div
              key={location._id}
              className={`bg-white rounded-lg shadow-md p-6 border-2 ${
                location.isDefault ? 'border-green-500 bg-green-50' : 'border-gray-200'
              }`}
            >
              {/* Location Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                  {location.isDefault && (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full mt-1">
                      Default Location
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(location)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(location._id)}
                    disabled={location.isDefault}
                    className={`p-2 rounded-lg transition-colors ${
                      location.isDefault
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-red-600 hover:bg-red-100'
                    }`}
                    title={location.isDefault ? 'Cannot delete default location' : 'Delete'}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Location Details */}
              <div className="space-y-2 mb-4">
                <p className="text-gray-700">
                  <span className="font-medium">📍</span> {location.address}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">🌐</span> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
                {location.description && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">📝</span> {location.description}
                  </p>
                )}
                {location.contactPerson && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">👤</span> {location.contactPerson}
                  </p>
                )}
                {location.contactPhone && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">📞</span> {location.contactPhone}
                  </p>
                )}
                {location.operatingHours && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">🕒</span> {location.operatingHours}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {!location.isDefault && (
                  <button
                    onClick={() => handleSetDefault(location._id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => handleToggleActive(location._id, location.isActive)}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                    location.isActive
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {location.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {locations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏫</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pickup locations found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first pickup location</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add First Location
            </button>
          </div>
        )}
      </div>

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add New Pickup Location</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddLocation} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Main Campus, Library, Admin Block"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    placeholder="e.g., John Doe"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complete Address *
                </label>
                <textarea
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter complete address"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    name="lat"
                    required
                    step="any"
                    value={formData.lat}
                    onChange={handleInputChange}
                    placeholder="28.7041"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    name="lng"
                    required
                    step="any"
                    value={formData.lng}
                    onChange={handleInputChange}
                    placeholder="77.1025"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    placeholder="+91 98765 43210"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    name="operatingHours"
                    value={formData.operatingHours}
                    onChange={handleInputChange}
                    placeholder="e.g., 9:00 AM - 6:00 PM"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Additional details about this location"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && editingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edit Pickup Location</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingLocation(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleEditLocation} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complete Address *
                </label>
                <textarea
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    name="lat"
                    required
                    step="any"
                    value={formData.lat}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    name="lng"
                    required
                    step="any"
                    value={formData.lng}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    name="operatingHours"
                    value={formData.operatingHours}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingLocation(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PickupLocationsPage() {
  return (
    <AdminGoogleAuth 
      title="Pickup Locations"
      subtitle="Sign in with Google to manage pickup locations for orders"
    >
      <PickupLocationsPageContent />
    </AdminGoogleAuth>
  );
}
