# Razorpay Webhook Setup Guide

This guide explains how to set up Razorpay webhooks for your Fun Printing website to handle delayed payments properly.

## 🎯 Problem Solved

Previously, your website only accepted immediate payments. If a payment took time (UPI delays, OTP verification, netbanking), the order would be lost. Now with webhooks, all payments are properly tracked regardless of timing.

## 🔧 What's New

### 1. **Pending Orders System**
- Orders are created immediately when payment is initiated
- Status: `pending_payment` until payment is confirmed
- Order ID is shown to user immediately

### 2. **Razorpay Webhooks**
- Automatically updates order status when payment succeeds/fails
- Handles delayed payments (UPI, netbanking, OTP)
- Creates print jobs automatically after successful payment

### 3. **Order Timeout System**
- Automatically cancels orders pending payment for >24 hours
- Daily automated cleanup via cron jobs (Vercel Hobby plan compatible)
- Prevents abandoned orders from cluttering the system

## 🚀 Setup Instructions

### Step 1: Configure Razorpay Webhook

1. **Login to Razorpay Dashboard**
   - Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
   - Navigate to Settings → Webhooks

2. **Create New Webhook**
   - Click "Add New Webhook"
   - **Webhook URL**: `https://yourdomain.com/api/webhooks/razorpay`
   - **Events to Subscribe**:
     - `payment.captured` ✅
     - `payment.failed` ✅
     - `order.paid` ✅

3. **Get Webhook Secret**
   - After creating webhook, copy the "Webhook Secret"
   - Add it to your `.env` file:
   ```
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
   ```

### Step 2: Update Environment Variables

Add to your `.env` file:
```bash
# Razorpay Webhook Configuration
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### Step 3: Test the Setup

1. **Place a Test Order**
   - Go to your order page
   - Fill out the form and initiate payment
   - You should see: "Order #ORD123456 created! Please complete payment..."

2. **Test Delayed Payment**
   - Use UPI or netbanking for payment
   - Take your time to complete payment (even 10+ minutes)
   - Order should still be processed when payment completes

3. **Check Admin Dashboard**
   - Go to `/admin`
   - You should see "Payment Pending" count
   - Use "Cleanup Pending Orders" button to cancel old pending orders

## 📊 New Admin Features

### Admin Dashboard Updates
- **Payment Pending Counter**: Shows orders waiting for payment
- **Automatic Cleanup**: Orders pending >24 hours are automatically cancelled
- **Refresh Button**: Updates order list

### Order Status Flow
```
Order Created → pending_payment → (payment) → paid → processing → completed
                     ↓
                (timeout) → cancelled
```

## 🔄 Payment Flow Comparison

### Before (Immediate Only)
```
User places order → Payment → Success → Order created
                     ↓
                   Failed → No order
```

### After (With Webhooks)
```
User places order → Order created (pending) → Payment → Webhook updates order
                     ↓
                   (timeout) → Order cancelled
```

## 🛠️ API Endpoints

### New Endpoints
- `POST /api/webhooks/razorpay` - Razorpay webhook handler
- `GET /api/cron/cleanup-pending-orders` - Automated cleanup (cron job)
- `GET /api/admin/cleanup-pending-orders` - Check pending orders

### Updated Endpoints
- `POST /api/payment/initiate` - Now creates pending order immediately
- `POST /api/payment/verify` - Updates existing pending order

## 🎯 Benefits

1. **No Lost Orders**: All payments are tracked, even delayed ones
2. **Better UX**: Users get order ID immediately
3. **Automatic Processing**: Print jobs created automatically after payment
4. **Admin Control**: Easy cleanup of abandoned orders
5. **Reliable**: Webhooks ensure payment status is always accurate

## 🔍 Monitoring

### Check Pending Orders
```bash
curl https://yourdomain.com/api/admin/cleanup-pending-orders
```

### Setup Automated Cleanup (Vercel Cron)
Add to your `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-pending-orders",
      "schedule": "0 0 * * *"
    }
  ]
}
```
This runs daily at midnight to cleanup orders pending >24 hours.

## 🚨 Troubleshooting

### Webhook Not Working
1. Check webhook URL is correct
2. Verify webhook secret in environment
3. Check Razorpay dashboard for webhook delivery logs

### Orders Not Updating
1. Check webhook events are subscribed
2. Verify webhook secret matches
3. Check server logs for webhook processing errors

### Pending Orders Not Cleaning Up
1. Check cron job is running (Vercel dashboard)
2. Verify database connection
3. Check order creation timestamps
4. Verify CRON_SECRET environment variable

## 📝 Notes

- Orders are automatically cancelled after 24 hours of pending payment
- Webhooks are the source of truth for payment status
- Frontend payment verification is still used for immediate feedback
- Print jobs are only created after successful payment confirmation

## 🎉 Success!

Your Fun Printing website now handles all payment scenarios properly:
- ✅ Immediate payments
- ✅ Delayed payments (UPI, netbanking, OTP)
- ✅ Failed payments
- ✅ Abandoned orders
- ✅ Automatic print job creation
- ✅ Admin order management
