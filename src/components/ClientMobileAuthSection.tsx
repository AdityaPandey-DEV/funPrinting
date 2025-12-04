'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface ClientMobileAuthSectionProps {
  onMenuClose: () => void;
}

export default function ClientMobileAuthSection({ onMenuClose }: ClientMobileAuthSectionProps) {
  const { user, isAuthenticated, logout } = useAuth();

  if (isAuthenticated) {
    return (
      <div className="px-3 py-2">
        <div className="text-sm text-gray-600 font-medium mb-3 truncate">
          Welcome, {user?.name || user?.email}
        </div>
        <button
          onClick={() => {
            logout();
            onMenuClose();
          }}
          className="text-gray-700 hover:text-black hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 w-full text-left"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-2">
      <Link
        href="/auth/signin"
        className="text-gray-700 hover:text-black hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium transition-all duration-200"
        onClick={onMenuClose}
      >
        Sign In
      </Link>
      <Link
        href="/auth/signup"
        className="bg-blue-600 text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 transition-colors text-center"
        onClick={onMenuClose}
      >
        Sign Up
      </Link>
    </div>
  );
}
