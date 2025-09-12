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
    modal: {
      ondismiss: function() {
        console.log('Payment modal dismissed');
      }
    }
  };
};

export const handlePaymentSuccess = async (paymentResponse: any, orderId: string) => {
  try {
    logPaymentEvent('payment_success', { orderId, paymentId: paymentResponse.razorpay_payment_id }, 'info');
    
    // Verify payment
    const verifyResponse = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      }),
    });

    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      logPaymentEvent('payment_verified', { orderId, paymentId: paymentResponse.razorpay_payment_id }, 'info');
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
