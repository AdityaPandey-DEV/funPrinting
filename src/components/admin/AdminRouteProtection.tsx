'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminOTPAuth from './AdminOTPAuth';
import LoadingSpinner from './LoadingSpinner';

interface AdminRouteProtectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminRouteProtection({ 
  children, 
  title = "Admin Access",
  subtitle = "Enter passcode to access admin dashboard"
}: AdminRouteProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication status (only on client side)
    const checkAuth = () => {
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const isAuth = localStorage.getItem('adminAuthenticated') === 'true';
      const loginTime = localStorage.getItem('adminLoginTime');
      
      if (!isAuth || !loginTime) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      // Check if session has expired (24 hours)
      const now = Date.now();
      const sessionStart = parseInt(loginTime);
      const expiresAt = sessionStart + (24 * 60 * 60 * 1000); // 24 hours
      
      if (now > expiresAt) {
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminLoginTime');
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
      
      setIsLoading(false);
    };

    checkAuth();
    
    // Check authentication every minute
    const interval = setInterval(checkAuth, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminLoginTime');
    setIsAuthenticated(false);
    router.push('/');
  };

  if (isLoading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return (
      <AdminOTPAuth 
        onLogin={handleLogin}
        title={title}
        subtitle={subtitle}
      />
    );
  }

  return (
    <div className="min-h-screen">
      {/* Session warning banner */}
      <SessionWarning onLogout={handleLogout} />
      {children}
    </div>
  );
}

// Session warning component
function SessionWarning({ onLogout }: { onLogout: () => void }) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const updateTimeRemaining = () => {
      const loginTime = localStorage.getItem('adminLoginTime');
      if (!loginTime) return;
      
      const now = Date.now();
      const sessionStart = parseInt(loginTime);
      const expiresAt = sessionStart + (24 * 60 * 60 * 1000); // 24 hours
      const remaining = Math.max(0, Math.floor((expiresAt - now) / (1000 * 60))); // minutes
      
      setTimeRemaining(remaining);
      setShowWarning(remaining <= 30); // Show warning when 30 minutes or less
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  if (!showWarning) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            Your admin session will expire in {timeRemaining} minutes. 
            <button
              onClick={onLogout}
              className="ml-2 underline hover:text-yellow-800"
            >
              Logout now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
