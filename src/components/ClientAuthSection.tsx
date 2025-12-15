'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

// Helper function to get user initial
function getUserInitial(name?: string | null, email?: string | null): string {
  if (name) {
    return name.charAt(0).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return '?';
}

// Helper function to get background color based on initial
function getInitialColor(initial: string): string {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
  ];
  const index = initial.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function ClientAuthSection() {
  const { user, isAuthenticated, logout } = useAuth();

  if (isAuthenticated) {
    const profileImage = user?.image || (user as any)?.profilePicture;
    const initial = getUserInitial(user?.name, user?.email);
    const bgColor = getInitialColor(initial);

    return (
      <div className="flex items-center space-x-3">
        <Link
          href="/profile"
          className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 hover:border-gray-500 transition-all duration-200 cursor-pointer flex-shrink-0"
          title="View Profile"
        >
          {profileImage ? (
            <Image
              src={profileImage}
              alt={user?.name || 'Profile'}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full ${bgColor} flex items-center justify-center text-white font-semibold text-lg`}>
              {initial}
            </div>
          )}
        </Link>
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
