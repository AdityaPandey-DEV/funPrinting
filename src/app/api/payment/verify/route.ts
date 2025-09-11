import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifyPayment } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    console.log('🔍 Payment verification started for order:', razorpay_order_id);

    // Verify payment signature
    const isValid = verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.error('❌ Invalid payment signature');
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    console.log('✅ Payment signature verified successfully');

    // Get temporary order data
    const tempOrderStore = (global as any).tempOrderStore;
    if (!tempOrderStore) {
      console.error('❌ Temporary order store not found');
      return NextResponse.json(
        { success: false, error: 'Order data not found' },
        { status: 404 }
      );
    }

    const orderData = tempOrderStore.get(razorpay_order_id);
    if (!orderData) {
      console.error('❌ Order data not found in temporary store');
      return NextResponse.json(
        { success: false, error: 'Order data not found' },
        { status: 404 }
      );
    }

    console.log('📋 Found order data, creating order in database...');

    // Fetch pickup location details if pickup is selected
    let enhancedDeliveryOption = orderData.deliveryOption;
    if (orderData.deliveryOption.type === 'pickup' && orderData.deliveryOption.pickupLocationId) {
      try {
        const pickupResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/pickup-locations`);
        const pickupData = await pickupResponse.json();
        
        if (pickupData.success) {
          const selectedLocation = pickupData.locations.find((loc: any) => loc._id === orderData.deliveryOption.pickupLocationId);
          if (selectedLocation) {
            enhancedDeliveryOption = {
              ...orderData.deliveryOption,
              pickupLocation: {
                _id: selectedLocation._id,
                name: selectedLocation.name,
                address: selectedLocation.address,
                lat: selectedLocation.lat,
                lng: selectedLocation.lng,
                contactPerson: selectedLocation.contactPerson,
                contactPhone: selectedLocation.contactPhone,
                operatingHours: selectedLocation.operatingHours,
                gmapLink: selectedLocation.gmapLink
              }
            };
          }
        }
      } catch (error) {
        console.error('Error fetching pickup location details:', error);
        // Continue with original delivery option if fetch fails
      }
    }

    // Create the actual order in database with payment details
    const finalOrderData = {
      ...orderData,
      deliveryOption: enhancedDeliveryOption,
      paymentStatus: 'completed',
      razorpayPaymentId: razorpay_payment_id,
    };

    console.log('💾 Creating order in database...');
    const order = new Order(finalOrderData);
    
    try {
      await order.save();
      console.log(`✅ Order created successfully with ID: ${order.orderId}`);
    } catch (saveError) {
      console.error('❌ Error saving order to database:', saveError);
      throw saveError;
    }

    // Clean up temporary order data
    tempOrderStore.delete(razorpay_order_id);
    console.log('🧹 Cleaned up temporary order data');

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order created successfully',
      order: {
        orderId: order.orderId,
        amount: order.amount,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment and create order' },
      { status: 500 }
    );
  }
}
