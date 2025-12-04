import { useState, useEffect } from 'react';

interface AdminInfo {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  website: string;
  socialMedia: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  businessHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  description: string;
  logo: string;
  favicon: string;
  isActive: boolean;
}

export const useAdminInfo = () => {
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/info');
      const data = await response.json();
      
      if (data.success && data.admin) {
        setAdminInfo(data.admin);
      } else {
        setError(data.message || 'Failed to fetch admin information');
      }
    } catch (err) {
      console.error('Error fetching admin info:', err);
      setError('Failed to fetch admin information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminInfo();
  }, []);

  return {
    adminInfo,
    loading,
    error,
    refetch: fetchAdminInfo
  };
};
