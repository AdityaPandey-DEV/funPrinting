'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === 'loading';
  const isAuthenticated = !!session?.user;
  const user = session?.user;

  const logout = async () => {
    await signOut({ 
      callbackUrl: '/',
      redirect: true 
    });
  };

  const requireAuth = () => {
    if (!isAuthenticated && !isLoading) {
      router.push('/auth/signin');
      return false;
    }
    return true;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
    requireAuth,
  };
};
