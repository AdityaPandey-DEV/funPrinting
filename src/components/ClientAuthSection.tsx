'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function ClientAuthSection() {
  const { user, isAuthenticated, logout } = useAuth();

  if (isAuthenticated) {
    return (
      <div className="flex items-center space-x-3">
        <span className="hidden lg:block text-sm text-gray-600 font-medium whitespace-nowrap max-w-32 truncate">
          Welcome, {user?.name || user?.email}
        </span>
        <span className="lg:hidden text-sm text-gray-600 font-medium">
          {user?.name || user?.email}
        </span>
        <button
          onClick={() => logout()}
          className="text-sm text-gray-700 hover:text-black hover:bg-gray-100 px-3 py-2 rounded-md font-medium transition-all duration-200 whitespace-nowrap"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <Link
        href="/auth/signin"
        className="text-sm text-gray-700 hover:text-black px-3 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
      >
        Sign In
      </Link>
      <Link
        href="/auth/signup"
        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
      >
        Sign Up
      </Link>
    </div>
  );
}
