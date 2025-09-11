import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const useRazorpay = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Razorpay is already loaded
    if (window.Razorpay) {
      setIsLoaded(true);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ Razorpay script loaded successfully');
      setIsLoaded(true);
      setError(null);
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load Razorpay script');
      setError('Failed to load payment gateway');
      setIsLoaded(false);
    };

    // Append script to head
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const openRazorpay = (options: any) => {
    if (!isLoaded) {
      throw new Error('Razorpay is not loaded yet');
    }
    
    if (!window.Razorpay) {
      throw new Error('Razorpay is not available');
    }

    return new window.Razorpay(options);
  };

  return {
    isLoaded,
    error,
    openRazorpay,
  };
};
