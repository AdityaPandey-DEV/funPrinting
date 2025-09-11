import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/razorpay';
import { getPricing } from '@/lib/pricing';

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
      templateData
    } = body;

    // Validate required fields
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
    let amount = 0;
    if (printingOptions.color === 'mixed' && printingOptions.pageColors) {
      // Mixed color pricing: calculate separately for color and B&W pages
      const colorPages = printingOptions.pageColors.colorPages.length;
      const bwPages = printingOptions.pageColors.bwPages.length;
      
      const colorCost = basePrice * colorPages * pricing.multipliers.color;
      const bwCost = basePrice * bwPages;
      
      amount = (colorCost + bwCost) * sidedMultiplier * printingOptions.copies;
    } else {
      // Standard pricing for all color or all B&W
      const colorMultiplier = printingOptions.color === 'color' ? pricing.multipliers.color : 1;
      amount = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
    }
    
    // Add compulsory service option cost (only for multi-page jobs)
    if (pageCount > 1) {
      if (printingOptions.serviceOption === 'binding') {
        amount += pricing.additionalServices.binding;
      } else if (printingOptions.serviceOption === 'file') {
        amount += 10; // File handling fee
      } else if (printingOptions.serviceOption === 'service') {
        amount += 5; // Minimal service fee
      }
    }
    
    // Add delivery charge if delivery option is selected
    if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
      amount += deliveryOption.deliveryCharge;
    }

    console.log(`💰 Payment initiation - calculated amount: ₹${amount}`);

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amount,
      receipt: `payment_${Date.now()}`,
      notes: {
        orderType,
        customerName: customerInfo.name,
        pageCount: pageCount.toString(),
        amount: amount.toString(),
      },
    });

    // Store order data temporarily (we'll create the actual order after payment success)
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
      deliveryOption,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      amount,
      razorpayOrderId: razorpayOrder.id,
    };

    // Store order data in a temporary store (we'll use a simple in-memory store for now)
    // In production, you might want to use Redis or a database for this
    const tempOrderStore = (global as any).tempOrderStore || new Map();
    tempOrderStore.set(razorpayOrder.id, orderData);
    (global as any).tempOrderStore = tempOrderStore;

    console.log(`✅ Payment initiated successfully - Razorpay Order ID: ${razorpayOrder.id}`);

    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount,
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
