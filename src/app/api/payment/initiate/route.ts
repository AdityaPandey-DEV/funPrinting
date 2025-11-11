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
      fileURLs, // Support for multiple files
      fileType,
      originalFileName,
      originalFileNames, // Support for multiple file names
      templateData,
      razorpayOrderId, // For completing payment on existing order
      amount // For completing payment on existing order
    } = body;
    
    // Debug: Log file data received
    console.log('📋 Payment initiation - File data received:');
    console.log('  - fileURL:', fileURL ? 'Present' : 'Missing');
    console.log('  - fileURLs:', fileURLs && Array.isArray(fileURLs) ? `${fileURLs.length} files` : 'Missing or not array');
    console.log('  - originalFileName:', originalFileName ? 'Present' : 'Missing');
    console.log('  - originalFileNames:', originalFileNames && Array.isArray(originalFileNames) ? `${originalFileNames.length} files` : 'Missing or not array');

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

      // Validate amount is reasonable (prevent manipulation)
      if (amount <= 0 || amount > 100000) { // Max ₹1,00,000
        console.error(`❌ Invalid amount: ₹${amount}`);
        return NextResponse.json(
          { success: false, error: 'Invalid payment amount' },
          { status: 400 }
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
    
    // Prepare file data first - prioritize arrays over single file fields
    let fileURLsArray: string[] | undefined;
    let originalFileNamesArray: string[] | undefined;
    let singleFileURL: string | undefined;
    let singleOriginalFileName: string | undefined;
    
    // Check if we have fileURLs array (multiple files)
    if (fileURLs && Array.isArray(fileURLs) && fileURLs.length > 0) {
      fileURLsArray = fileURLs;
      singleFileURL = fileURLs[0]; // Set first file as legacy fileURL for backward compatibility
      console.log(`✅ Using fileURLs array with ${fileURLs.length} files`);
    } else if (fileURL) {
      // Fall back to single file for backward compatibility
      fileURLsArray = [fileURL];
      singleFileURL = fileURL;
      console.log(`📄 Using single fileURL, converted to array format`);
    }
    
    // Check if we have originalFileNames array
    if (originalFileNames && Array.isArray(originalFileNames) && originalFileNames.length > 0) {
      originalFileNamesArray = originalFileNames;
      singleOriginalFileName = originalFileNames[0]; // Set first file as legacy originalFileName
      console.log(`✅ Using originalFileNames array with ${originalFileNames.length} files`);
    } else if (originalFileName) {
      // Fall back to single file name for backward compatibility
      originalFileNamesArray = [originalFileName];
      singleOriginalFileName = originalFileName;
      console.log(`📄 Using single originalFileName, converted to array format`);
    }
    
    // Ensure arrays match in length
    if (fileURLsArray && originalFileNamesArray) {
      if (fileURLsArray.length !== originalFileNamesArray.length) {
        console.warn(`⚠️ Mismatch: fileURLs has ${fileURLsArray.length} items, originalFileNames has ${originalFileNamesArray.length} items`);
        // Pad or truncate to match
        if (originalFileNamesArray.length < fileURLsArray.length) {
          while (originalFileNamesArray.length < fileURLsArray.length) {
            originalFileNamesArray.push(`File ${originalFileNamesArray.length + 1}`);
          }
        } else {
          originalFileNamesArray = originalFileNamesArray.slice(0, fileURLsArray.length);
        }
      }
    }
    
    // Calculate pricing per file
    const colorMultiplier = printingOptions.color === 'color' ? pricing.multipliers.color : 1;
    const minServiceFeePageLimit = pricing.additionalServices.minServiceFeePageLimit || 1;
    
    // Get file counts - we need to calculate per file
    const numFiles = (fileURLsArray && fileURLsArray.length > 0) ? fileURLsArray.length : 1;
    // For per-file calculation, we need page counts per file
    // Since we don't have that in the API, we'll estimate or use total pageCount divided by files
    // In a real scenario, you'd pass filePageCounts from frontend
    const estimatedPagesPerFile = numFiles > 0 ? Math.ceil(pageCount / numFiles) : pageCount;
    
    let calculatedAmount = 0;
    
    // Calculate cost for each file
    for (let i = 0; i < numFiles; i++) {
      // Base cost for this file (using estimated pages per file)
      const fileBaseCost = basePrice * estimatedPagesPerFile * colorMultiplier * sidedMultiplier * printingOptions.copies;
      calculatedAmount += fileBaseCost;
      
      // Add service option cost for this file if it exceeds limit
      if (estimatedPagesPerFile > minServiceFeePageLimit) {
        const fileServiceOption = printingOptions.serviceOptions?.[i] || printingOptions.serviceOption || 'service';
        if (fileServiceOption === 'binding') {
          calculatedAmount += pricing.additionalServices.binding;
        } else if (fileServiceOption === 'file') {
          calculatedAmount += 10; // File handling fee
        } else if (fileServiceOption === 'service') {
          calculatedAmount += pricing.additionalServices.minServiceFee;
        }
      }
    }
    
    console.log(`🔍 Payment initiation - Per-file pricing:`);
    console.log(`  - Files: ${numFiles}`);
    console.log(`  - Estimated pages per file: ${estimatedPagesPerFile}`);
    console.log(`  - Service options: ${JSON.stringify(printingOptions.serviceOptions || printingOptions.serviceOption)}`);
    
    // Add delivery charge if delivery option is selected
    if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
      calculatedAmount += deliveryOption.deliveryCharge;
    }

    console.log(`💰 Payment initiation - calculated amount: ₹${calculatedAmount}`);

    // Validate calculated amount is reasonable
    if (calculatedAmount <= 0 || calculatedAmount > 100000) { // Max ₹1,00,000
      console.error(`❌ Invalid calculated amount: ₹${calculatedAmount}`);
      return NextResponse.json(
        { success: false, error: 'Invalid order amount. Please contact support.' },
        { status: 400 }
      );
    }

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
        // Import the PickupLocation model directly
        const PickupLocation = (await import('@/models/PickupLocation')).default;
        const selectedLocation = await PickupLocation.findById(deliveryOption.pickupLocationId);
        
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
          console.log(`✅ Pickup location enhanced: ${selectedLocation.name}`);
        } else {
          console.warn(`⚠️ Pickup location not found: ${deliveryOption.pickupLocationId}`);
        }
      } catch (error) {
        console.error('Error fetching pickup location details:', error);
        // Continue with original delivery option if fetch fails
        console.log('Continuing with original delivery option...');
      }
    }

    console.log(`📋 Creating order with ${fileURLsArray?.length || 0} file(s)`);

    // Create pending order in database
    const orderData = {
      customerInfo,
      orderType,
      fileURL: orderType === 'file' ? singleFileURL : undefined, // Legacy support
      fileURLs: orderType === 'file' && fileURLsArray && fileURLsArray.length > 0 ? fileURLsArray : undefined,
      fileType,
      originalFileName: orderType === 'file' ? singleOriginalFileName : undefined, // Legacy support
      originalFileNames: orderType === 'file' && originalFileNamesArray && originalFileNamesArray.length > 0 ? originalFileNamesArray : undefined,
      templateData,
      printingOptions: {
        ...printingOptions,
        pageCount: pageCount,
        serviceOptions: printingOptions.serviceOptions, // Store per-file service options
        serviceOption: printingOptions.serviceOption, // Legacy support
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
