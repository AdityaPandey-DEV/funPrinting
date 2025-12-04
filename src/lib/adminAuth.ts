'use client';

export interface AdminSession {
  isAuthenticated: boolean;
  loginTime: number;
  expiresAt: number;
}

const ADMIN_SESSION_KEY = 'adminAuthenticated';
const ADMIN_LOGIN_TIME_KEY = 'adminLoginTime';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const adminAuth = {
  // Check if admin is currently authenticated
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    
    const isAuth = localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    const loginTime = localStorage.getItem(ADMIN_LOGIN_TIME_KEY);
    
    if (!isAuth || !loginTime) return false;
    
    const now = Date.now();
    const sessionStart = parseInt(loginTime);
    const expiresAt = sessionStart + SESSION_DURATION;
    
    // Check if session has expired
    if (now > expiresAt) {
      this.logout();
      return false;
    }
    
    return true;
  },

  // Get current session info
  getSession(): AdminSession | null {
    if (typeof window === 'undefined') return null;
    
    const isAuth = localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    const loginTime = localStorage.getItem(ADMIN_LOGIN_TIME_KEY);
    
    if (!isAuth || !loginTime) return null;
    
    const sessionStart = parseInt(loginTime);
    const expiresAt = sessionStart + SESSION_DURATION;
    
    return {
      isAuthenticated: this.isAuthenticated(),
      loginTime: sessionStart,
      expiresAt
    };
  },

  // Set admin as authenticated
  setAuthenticated(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    localStorage.setItem(ADMIN_LOGIN_TIME_KEY, Date.now().toString());
  },

  // Logout admin
  logout(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_LOGIN_TIME_KEY);
  },

  // Get time remaining in session (in minutes)
  getTimeRemaining(): number {
    const session = this.getSession();
    if (!session) return 0;
    
    const now = Date.now();
    const remaining = session.expiresAt - now;
    return Math.max(0, Math.floor(remaining / (1000 * 60))); // Convert to minutes
  },

  // Check if session is about to expire (within 30 minutes)
  isExpiringSoon(): boolean {
    return this.getTimeRemaining() <= 30;
  }
};

// Hook for React components
export const useAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(adminAuth.isAuthenticated());
  const [session, setSession] = useState<AdminSession | null>(adminAuth.getSession());

  const checkAuth = () => {
    const auth = adminAuth.isAuthenticated();
    const sessionInfo = adminAuth.getSession();
    setIsAuthenticated(auth);
    setSession(sessionInfo);
  };

  const login = () => {
    adminAuth.setAuthenticated();
    checkAuth();
  };

  const logout = () => {
    adminAuth.logout();
    checkAuth();
  };

  // Check authentication status periodically
  useEffect(() => {
    const interval = setInterval(checkAuth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return {
    isAuthenticated,
    session,
    login,
    logout,
    checkAuth,
    timeRemaining: adminAuth.getTimeRemaining(),
    isExpiringSoon: adminAuth.isExpiringSoon()
  };
};

// Import React hooks
import { useState, useEffect } from 'react';
