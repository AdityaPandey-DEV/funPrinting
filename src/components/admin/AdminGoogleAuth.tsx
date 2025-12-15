'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminAuth } from '@/lib/adminAuth';

interface AdminGoogleAuthProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminGoogleAuth({ 
  children, 
  title = "Admin Access",
  subtitle = "Sign in with Google to access admin dashboard"
}: AdminGoogleAuthProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [usePasswordAuth, setUsePasswordAuth] = useState(false);
  const [passwordCredentials, setPasswordCredentials] = useState({ email: '', password: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordAuthenticated, setPasswordAuthenticated] = useState(false);
  const [localStorageAuth, setLocalStorageAuth] = useState(false);

  // Check if user is authenticated and has admin role (either via Google or password)
  // Also check localStorage for persistent admin auth
  const isAuthenticated = (session?.user && isAdmin === true) || passwordAuthenticated || localStorageAuth;

  // Check admin role when user is authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (session?.user?.email && isAdmin === null && !isCheckingAdmin) {
      setIsCheckingAdmin(true);
      checkAdminRole(session.user.email);
    }
  }, [session, status, isAdmin, isCheckingAdmin]);

  // Check localStorage for persistent admin auth on mount and periodically
  useEffect(() => {
    const checkLocalStorageAuth = () => {
      const isAuth = adminAuth.isAuthenticated();
      setLocalStorageAuth(isAuth);
      if (isAuth) {
        setPasswordAuthenticated(true);
        setIsAdmin(true);
      }
    };

    // Check immediately
    checkLocalStorageAuth();

    // Check every 30 seconds to catch changes from other tabs/windows
    const interval = setInterval(checkLocalStorageAuth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkAdminRole = async (email: string) => {
    try {
      const response = await fetch('/api/auth/check-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      setIsAdmin(data.isAdmin || false);
      
      if (data.isAdmin) {
        console.log('✅ Admin authenticated:', email);
        // Store admin email in localStorage
        localStorage.setItem('adminEmail', email);
      } else {
        console.log('❌ User is not an admin:', email);
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { 
      callbackUrl: window.location.pathname,
      redirect: false 
    });
  };

  const handleSignOut = () => {
    // Clear admin auth from localStorage
    adminAuth.logout();
    setLocalStorageAuth(false);
    setPasswordAuthenticated(false);
    setPasswordCredentials({ email: '', password: '' });
    signOut({ 
      callbackUrl: '/',
      redirect: true 
    });
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPasswordLoading(true);
    setPasswordError(null);

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: passwordCredentials.email,
          password: passwordCredentials.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Persist admin authentication in localStorage
        adminAuth.setAuthenticated();
        // Store admin email in localStorage
        localStorage.setItem('adminEmail', passwordCredentials.email);
        setLocalStorageAuth(true);
        setPasswordAuthenticated(true);
        setIsAdmin(true);
        setPasswordError(null);
      } else {
        setPasswordError(data.error || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Password login error:', error);
      setPasswordError('Failed to connect to server. Please try again.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Show loading state
  if (status === 'loading' || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">
            {status === 'loading' ? 'Checking authentication...' : 'Verifying admin access...'}
          </p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-black">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {title}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {subtitle}
            </p>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Restricted Access
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Only authorized administrators can access this area.</p>
                    {session?.user?.email && isAdmin === false && (
                      <p className="mt-1">Your account (<strong>{session.user.email}</strong>) does not have admin privileges.</p>
                    )}
                    {!session?.user?.email && (
                      <p className="mt-1">Please sign in with an authorized admin account.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 space-y-6">
            {!usePasswordAuth ? (
              <>
            <button
              onClick={handleGoogleSignIn}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-100 text-gray-500">Or</span>
                  </div>
                </div>

                <button
                  onClick={() => setUsePasswordAuth(true)}
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
                >
                  Sign in with Password
                </button>
              </>
            ) : (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={passwordCredentials.email}
                    onChange={(e) => setPasswordCredentials(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={passwordCredentials.password}
                    onChange={(e) => setPasswordCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                    placeholder="Enter admin password"
                  />
                </div>
                {passwordError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">{passwordError}</p>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isPasswordLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPasswordLoading ? 'Signing in...' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsePasswordAuth(false);
                    setPasswordError(null);
                    setPasswordCredentials({ email: '', password: '' });
                  }}
                  className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  ← Back to Google Sign In
                </button>
              </form>
            )}
            
            <div className="text-center">
              <button
                onClick={() => router.push('/')}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show admin content (navbar and footer are handled by ConditionalLayout)
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
