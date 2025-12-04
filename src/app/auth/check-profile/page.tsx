'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function CheckProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const checkProfile = async () => {
      if (status === 'loading') return;
      
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      try {
        const response = await fetch('/api/user/check-profile-complete');
        const data = await response.json();
        
        if (data.success) {
          // First check if user needs to set up password (Google OAuth users or users without password)
          if (!data.hasPassword && (data.provider === 'google' || !data.provider)) {
            router.push('/auth/setup-password');
            return;
          }
          
          // Then check if profile is complete
          if (!data.isComplete) {
            router.push('/complete-profile');
          } else {
            router.push('/my-orders');
          }
        } else {
          router.push('/my-orders');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        router.push('/my-orders');
      }
    };

    checkProfile();
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Checking your profile...</p>
      </div>
    </div>
  );
}



