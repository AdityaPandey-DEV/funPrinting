import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpay: Razorpay | null = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export interface CreateOrderParams {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export const createRazorpayOrder = async (params: CreateOrderParams) => {
  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const order = await razorpay.orders.create({
      amount: params.amount * 100, // Razorpay expects amount in paise
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes,
    });

    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error('Failed to create payment order');
  }
};

export const verifyPayment = (razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  return expectedSignature === razorpay_signature;
};

export default razorpay;
