import { NextResponse } from 'next/server';

export interface PaymentErrorInterface extends Error {
  code?: string;
  statusCode?: number;
  isOperational?: boolean;
}

export class PaymentError extends Error implements PaymentErrorInterface {
  public code?: string;
  public statusCode?: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'PaymentError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const handlePaymentError = (error: unknown): NextResponse => {
  console.error('Payment error:', error);

  if (error instanceof PaymentError) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        code: error.code 
      },
      { status: error.statusCode || 500 }
    );
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      return NextResponse.json(
        { success: false, error: 'Payment service temporarily unavailable' },
        { status: 503 }
      );
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment data provided' },
        { status: 400 }
      );
    }
  }

  // Generic error response
  return NextResponse.json(
    { success: false, error: 'Payment processing failed' },
    { status: 500 }
  );
};

export const validatePaymentAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 100000; // Max ₹1,00,000
};

export const validateRazorpayOrderId = (orderId: string): boolean => {
  return /^order_[a-zA-Z0-9]+$/.test(orderId);
};

export const validateRazorpayPaymentId = (paymentId: string): boolean => {
  return /^pay_[a-zA-Z0-9]+$/.test(paymentId);
};

export const sanitizePaymentData = (data: any) => {
  const sanitized = { ...data };
  
  // Remove sensitive fields
  delete sanitized.card;
  delete sanitized.cvv;
  delete sanitized.pin;
  
  // Truncate long strings
  if (sanitized.description && sanitized.description.length > 500) {
    sanitized.description = sanitized.description.substring(0, 500) + '...';
  }
  
  return sanitized;
};

export const logPaymentEvent = (event: string, data: any, level: 'info' | 'warn' | 'error' = 'info') => {
  const sanitizedData = sanitizePaymentData(data);
  const logMessage = `[PAYMENT-${event.toUpperCase()}] ${JSON.stringify(sanitizedData)}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
  }
};

export const validatePendingOrderPayment = (order: any): { isValid: boolean; error?: string } => {
  // Check if order exists
  if (!order) {
    return { isValid: false, error: 'Order not found' };
  }

  // Check if order is in pending payment state
  if (order.paymentStatus !== 'pending' || order.status !== 'pending_payment') {
    return { isValid: false, error: 'Order is not in pending payment state' };
  }

  // Check if Razorpay order ID exists
  if (!order.razorpayOrderId) {
    return { isValid: false, error: 'Payment information not available for this order' };
  }

  // Validate amount
  if (!validatePaymentAmount(order.amount)) {
    return { isValid: false, error: 'Invalid order amount' };
  }

  // Check if order is not too old (24 hours)
  const orderDate = new Date(order.createdAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff > 24) {
    return { isValid: false, error: 'Order has expired. Please place a new order.' };
  }

  return { isValid: true };
};

export const createPaymentOptions = (order: any, razorpayKey: string): any => {
  return {
    key: razorpayKey,
    amount: order.amount * 100, // Razorpay expects amount in paise
    currency: 'INR',
    name: 'College Print Service',
    description: `Complete Payment for Order #${order.orderId}`,
    order_id: order.razorpayOrderId,
    prefill: {
      name: order.customerInfo?.name || '',
      email: order.customerInfo?.email || '',
      contact: order.customerInfo?.phone || '',
    },
    theme: {
      color: '#000000',
    },
    // iPhone Safari specific optimizations
    modal: {
      ondismiss: function() {
        console.log('Payment modal dismissed');
      }
    },
    // Mobile-specific options for better iPhone Safari compatibility
    notes: {
      order_id: order.orderId,
      customer_email: order.customerInfo?.email || '',
    },
    // Ensure proper mobile handling
    readonly: {
      email: true,
      contact: true,
    },
    // Add retry mechanism for mobile
    retry: {
      enabled: true,
      max_count: 3,
    }
  };
};

// Detect iPhone Safari for special handling
export const isIphoneSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  
  return isIOS && isSafari;
};

export const handlePaymentSuccess = async (paymentResponse: any, orderId: string) => {
  try {
    logPaymentEvent('payment_success', { orderId, paymentId: paymentResponse.razorpay_payment_id }, 'info');
    
    // Store payment data in localStorage as backup for iPhone Safari
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pending_payment_verification', JSON.stringify({
          orderId,
          paymentResponse,
          timestamp: Date.now(),
          isIphoneSafari: isIphoneSafari()
        }));
        
        // Additional iPhone Safari specific logging
        if (isIphoneSafari()) {
          console.log('🍎 iPhone Safari detected - using enhanced payment recovery');
        }
      } catch (storageError) {
        console.warn('Failed to store payment data in localStorage:', storageError);
      }
    }
    
    // Verify payment with enhanced retry logic for iPhone Safari
    let verifyResponse;
    let retryCount = 0;
    const isIphone = isIphoneSafari();
    const maxRetries = isIphone ? 5 : 3; // More retries for iPhone Safari
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Payment verification attempt ${retryCount + 1}/${maxRetries}${isIphone ? ' (iPhone Safari)' : ''}`);
        
        verifyResponse = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            // Add iPhone Safari specific headers
            ...(isIphone && {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            })
          },
          body: JSON.stringify({
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          }),
        });
        
        if (verifyResponse.ok) {
          console.log('✅ Payment verification successful');
          break; // Success, exit retry loop
        } else {
          console.warn(`❌ Payment verification failed with status: ${verifyResponse.status}`);
        }
      } catch (fetchError) {
        console.warn(`❌ Payment verification attempt ${retryCount + 1} failed:`, fetchError);
        retryCount++;
        
        if (retryCount < maxRetries) {
          // Enhanced backoff for iPhone Safari
          const delay = isIphone ? 
            Math.pow(2, retryCount) * 2000 : // Longer delays for iPhone
            Math.pow(2, retryCount) * 1000;  // Standard delays
          
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!verifyResponse || !verifyResponse.ok) {
      throw new Error('Payment verification failed after retries');
    }

    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      logPaymentEvent('payment_verified', { orderId, paymentId: paymentResponse.razorpay_payment_id }, 'info');
      
      // Clear stored payment data on success
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('pending_payment_verification');
        } catch (storageError) {
          console.warn('Failed to clear payment data from localStorage:', storageError);
        }
      }
      
      return { success: true, data: verifyData };
    } else {
      logPaymentEvent('payment_verification_failed', { orderId, error: verifyData.error }, 'error');
      return { success: false, error: verifyData.error || 'Payment verification failed' };
    }
  } catch (error) {
    logPaymentEvent('payment_verification_error', { orderId, error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
    return { success: false, error: 'Payment verification failed. Please contact support.' };
  }
};

export const handlePaymentFailure = (error: any, orderId: string) => {
  logPaymentEvent('payment_failed', { orderId, error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
  return { success: false, error: 'Payment failed. Please try again.' };
};

// Recovery mechanism for iPhone Safari payment issues
export const checkPendingPaymentVerification = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const storedData = localStorage.getItem('pending_payment_verification');
    if (!storedData) return null;
    
    const { orderId, paymentResponse, timestamp, isIphoneSafari: wasIphoneSafari } = JSON.parse(storedData);
    
    // Check if data is not too old (extended time for iPhone Safari)
    const maxAge = wasIphoneSafari ? 10 * 60 * 1000 : 5 * 60 * 1000; // 10 minutes for iPhone, 5 for others
    if (Date.now() - timestamp > maxAge) {
      localStorage.removeItem('pending_payment_verification');
      return null;
    }
    
    console.log(`🔄 Found pending payment verification${wasIphoneSafari ? ' (iPhone Safari)' : ''}, attempting recovery...`);
    
    // For iPhone Safari, add a small delay before attempting recovery
    if (wasIphoneSafari) {
      console.log('🍎 iPhone Safari recovery - adding delay for stability...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Attempt to verify the payment
    const result = await handlePaymentSuccess(paymentResponse, orderId);
    
    if (result.success) {
      console.log('✅ Payment verification recovered successfully');
      return result;
    } else {
      console.log('❌ Payment verification recovery failed');
      return null;
    }
  } catch (error) {
    console.error('Error checking pending payment verification:', error);
    return null;
  }
};
