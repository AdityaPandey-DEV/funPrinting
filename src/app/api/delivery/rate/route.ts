import { NextRequest, NextResponse } from 'next/server';
import { checkServiceability, isShiprocketConfigured } from '@/lib/shiprocket';

/**
 * GET /api/delivery/rate?delivery_pincode=...&weight=...&pickup_pincode=...
 * 
 * Returns the cheapest delivery rate for the given route and weight.
 * Falls back to weight-based estimation if Shiprocket is not configured.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const deliveryPincode = searchParams.get('delivery_pincode');
        const weightStr = searchParams.get('weight');
        const pickupPincode = searchParams.get('pickup_pincode') || process.env.SHIPROCKET_PICKUP_PINCODE || '263139';

        if (!deliveryPincode || !weightStr) {
            return NextResponse.json(
                { error: 'Missing required params: delivery_pincode, weight' },
                { status: 400 }
            );
        }

        const weight = parseFloat(weightStr);
        if (isNaN(weight) || weight <= 0) {
            return NextResponse.json(
                { error: 'Invalid weight value' },
                { status: 400 }
            );
        }

        // Try Shiprocket API first
        if (isShiprocketConfigured()) {
            try {
                const result = await checkServiceability(pickupPincode, deliveryPincode, weight, false);

                if (result.success && result.cheapestRate !== undefined) {
                    return NextResponse.json({
                        success: true,
                        deliveryCharge: Math.ceil(result.cheapestRate), // Round up to nearest rupee
                        estimatedDays: result.estimatedDays || 5,
                        courierName: result.courierName || 'Standard',
                        source: 'shiprocket',
                        weight,
                    });
                }

                // Shiprocket available but no couriers for this route — use fallback
                console.log('⚠️ No Shiprocket couriers available, using fallback pricing');
            } catch (err) {
                console.error('⚠️ Shiprocket API error, using fallback pricing:', err);
            }
        }

        // Fallback: weight-based estimation
        // Base rate ₹40 for first 500g, ₹20 for each additional 500g
        const baseRate = 40;
        const additionalRate = 20;
        const weightGrams = weight * 1000;
        let deliveryCharge = baseRate;
        if (weightGrams > 500) {
            const extraSlabs = Math.ceil((weightGrams - 500) / 500);
            deliveryCharge += extraSlabs * additionalRate;
        }

        return NextResponse.json({
            success: true,
            deliveryCharge,
            estimatedDays: 5,
            courierName: 'Standard Delivery',
            source: 'estimated',
            weight,
        });
    } catch (error: any) {
        console.error('❌ Delivery rate calculation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to calculate delivery rate' },
            { status: 500 }
        );
    }
}
