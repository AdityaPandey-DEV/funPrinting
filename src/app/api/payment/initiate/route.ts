import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/razorpay';
import { getPricing } from '@/lib/pricing';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerInfo,
      orderType,
      printingOptions,
      deliveryOption,
      expectedDate,
      fileURL,
      fileType,
      originalFileName,
      templateData,
      razorpayOrderId, // For completing payment on existing order
      amount // For completing payment on existing order
    } = body;

    // If this is for completing payment on an existing order
    if (razorpayOrderId && amount) {
      console.log(`🔄 Completing payment for existing order: ${razorpayOrderId}, amount: ₹${amount}`);
      
      if (!process.env.RAZORPAY_KEY_ID) {
        console.error('❌ RAZORPAY_KEY_ID not found in environment variables');
        return NextResponse.json(
          { success: false, error: 'Payment gateway configuration error' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        razorpayOrderId,
        amount,
        key: process.env.RAZORPAY_KEY_ID,
      });
    }

    // Validate required fields for new orders
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, phone, and email are required' },
        { status: 400 }
      );
    }

    // Calculate amount based on printing options
    const pageCount = printingOptions.pageCount || 1;
    console.log(`📥 Payment initiation - pageCount: ${pageCount}`);

    // Get pricing from database
    const pricing = await getPricing();
    const basePrice = pricing.basePrices[printingOptions.pageSize as keyof typeof pricing.basePrices];
    const sidedMultiplier = printingOptions.sided === 'double' ? pricing.multipliers.doubleSided : 1;
    
    // Calculate total amount based on color option
    let calculatedAmount = 0;
    if (printingOptions.color === 'mixed' && printingOptions.pageColors) {
      // Mixed color pricing: calculate separately for color and B&W pages
      const colorPages = printingOptions.pageColors.colorPages.length;
      const bwPages = printingOptions.pageColors.bwPages.length;
      
      const colorCost = basePrice * colorPages * pricing.multipliers.color;
      const bwCost = basePrice * bwPages;
      
      calculatedAmount = (colorCost + bwCost) * sidedMultiplier * printingOptions.copies;
    } else {
      // Standard pricing for all color or all B&W
      const colorMultiplier = printingOptions.color === 'color' ? pricing.multipliers.color : 1;
      calculatedAmount = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
    }
    
    // Add compulsory service option cost (only for multi-page jobs)
    if (pageCount > 1) {
      if (printingOptions.serviceOption === 'binding') {
        calculatedAmount += pricing.additionalServices.binding;
      } else if (printingOptions.serviceOption === 'file') {
        calculatedAmount += 10; // File handling fee
      } else if (printingOptions.serviceOption === 'service') {
        calculatedAmount += 5; // Minimal service fee
      }
    }
    
    // Add delivery charge if delivery option is selected
    if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
      calculatedAmount += deliveryOption.deliveryCharge;
    }

    console.log(`💰 Payment initiation - calculated amount: ₹${calculatedAmount}`);

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amount: calculatedAmount,
      receipt: `payment_${Date.now()}`,
      notes: {
        orderType,
        customerName: customerInfo.name,
        pageCount: pageCount.toString(),
        amount: calculatedAmount.toString(),
      },
    });

    console.log(`✅ Razorpay order created: ${razorpayOrder.id}`);

    // Connect to database and create pending order immediately
    await connectDB();

    // Fetch pickup location details if pickup is selected
    let enhancedDeliveryOption = deliveryOption;
    if (deliveryOption.type === 'pickup' && deliveryOption.pickupLocationId) {
      try {
        const pickupResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/pickup-locations`);
        const pickupData = await pickupResponse.json();
        
        if (pickupData.success) {
          const selectedLocation = pickupData.locations.find((loc: any) => loc._id === deliveryOption.pickupLocationId);
          if (selectedLocation) {
            enhancedDeliveryOption = {
              ...deliveryOption,
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

    // Create pending order in database
    const orderData = {
      customerInfo,
      orderType,
      fileURL,
      fileType,
      originalFileName,
      templateData,
      printingOptions: {
        ...printingOptions,
        pageCount: pageCount,
      },
      deliveryOption: enhancedDeliveryOption,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      amount: calculatedAmount,
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: 'pending', // Will be updated by webhook
      orderStatus: 'pending',
      status: 'pending_payment',
    };

    const order = new Order(orderData);
    await order.save();
    
    console.log(`✅ Pending order created: ${order.orderId} (Razorpay Order: ${razorpayOrder.id})`);

    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      orderId: order.orderId,
      amount: calculatedAmount,
      pageCount,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error initiating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
