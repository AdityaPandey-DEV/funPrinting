import { NextRequest, NextResponse } from 'next/server';
import { checkServiceability, isShiprocketConfigured } from '@/lib/shiprocket';

/**
 * Delivery speed tier with real pricing
 */
interface SpeedTier {
    id: 'standard' | 'express' | 'sameday';
    label: string;
    description: string;
    emoji: string;
    deliveryCharge: number;
    estimatedDays: number;
    courierName: string;
}

/**
 * GET /api/delivery/rate?delivery_pincode=...&weight=...&pickup_pincode=...
 * 
 * Returns delivery rate tiers (standard, express, sameday) with real Shiprocket pricing.
 * Falls back to Shiprocket-based weight estimates if API is unavailable.
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

                if (result.success && result.allRates && result.allRates.length > 0) {
                    const rates = result.allRates;

                    // Sort by rate (cheapest first)
                    rates.sort((a, b) => a.rate - b.rate);

                    // Group into speed tiers based on estimated delivery days
                    const standardCouriers = rates.filter(r => r.estimatedDays >= 4);
                    const expressCouriers = rates.filter(r => r.estimatedDays >= 2 && r.estimatedDays <= 3);
                    const samedayCouriers = rates.filter(r => r.estimatedDays <= 1);

                    // Build tiers — use cheapest in each group
                    const tiers: SpeedTier[] = [];

                    // Standard: cheapest overall (always available)
                    const cheapest = rates[0];
                    tiers.push({
                        id: 'standard',
                        label: 'Standard',
                        description: `${Math.max(cheapest.estimatedDays, 3)}-${Math.max(cheapest.estimatedDays + 2, 5)} business days`,
                        emoji: '📦',
                        deliveryCharge: Math.ceil(cheapest.rate),
                        estimatedDays: Math.max(cheapest.estimatedDays, 3),
                        courierName: cheapest.courierName,
                    });

                    // Express: fastest courier that's 1-3 days, or cheapest + premium
                    if (expressCouriers.length > 0) {
                        const fastExpress = expressCouriers.sort((a, b) => a.estimatedDays - b.estimatedDays)[0];
                        tiers.push({
                            id: 'express',
                            label: 'Express',
                            description: `${fastExpress.estimatedDays}-${fastExpress.estimatedDays + 1} business days`,
                            emoji: '🚀',
                            deliveryCharge: Math.ceil(fastExpress.rate),
                            estimatedDays: fastExpress.estimatedDays,
                            courierName: fastExpress.courierName,
                        });
                    } else {
                        // If no express couriers, offer a premium tier at 1.5x standard
                        tiers.push({
                            id: 'express',
                            label: 'Express',
                            description: '2-3 business days',
                            emoji: '🚀',
                            deliveryCharge: Math.ceil(cheapest.rate * 1.5),
                            estimatedDays: 2,
                            courierName: 'Priority Express',
                        });
                    }

                    // Same-day: if available, or 2x standard
                    if (samedayCouriers.length > 0) {
                        const fastest = samedayCouriers[0];
                        tiers.push({
                            id: 'sameday',
                            label: 'Same Day',
                            description: 'Within 4-6 hours',
                            emoji: '⚡',
                            deliveryCharge: Math.ceil(fastest.rate),
                            estimatedDays: 0,
                            courierName: fastest.courierName,
                        });
                    } else {
                        // Same-day premium at 2x standard rate
                        tiers.push({
                            id: 'sameday',
                            label: 'Same Day',
                            description: 'Within 4-6 hours',
                            emoji: '⚡',
                            deliveryCharge: Math.ceil(cheapest.rate * 2),
                            estimatedDays: 0,
                            courierName: 'Speed Express',
                        });
                    }

                    console.log(`📦 Shiprocket tiers for ${pickupPincode} → ${deliveryPincode} (${weight}kg):`,
                        tiers.map(t => `${t.id}: ₹${t.deliveryCharge} via ${t.courierName}`)
                    );

                    return NextResponse.json({
                        success: true,
                        tiers,
                        source: 'shiprocket',
                        weight,
                        // Also include flat cheapest for backward compat
                        deliveryCharge: tiers[0].deliveryCharge,
                        estimatedDays: tiers[0].estimatedDays,
                        courierName: tiers[0].courierName,
                    });
                }

                console.log('⚠️ No Shiprocket couriers available, using fallback pricing');
            } catch (err) {
                console.error('⚠️ Shiprocket API error, using fallback pricing:', err);
            }
        }

        // Fallback: weight-based estimation (Shiprocket Lite plan rates ~₹26/500g)
        const weightGrams = weight * 1000;
        const slabs = Math.ceil(weightGrams / 500);
        const standardRate = Math.max(26, slabs * 26); // ₹26 per 500g slab
        const expressRate = Math.ceil(standardRate * 1.5);
        const samedayRate = Math.ceil(standardRate * 2);

        const tiers: SpeedTier[] = [
            {
                id: 'standard',
                label: 'Standard',
                description: '3-5 business days',
                emoji: '📦',
                deliveryCharge: standardRate,
                estimatedDays: 5,
                courierName: 'Standard Delivery',
            },
            {
                id: 'express',
                label: 'Express',
                description: '1-2 business days',
                emoji: '🚀',
                deliveryCharge: expressRate,
                estimatedDays: 2,
                courierName: 'Express Delivery',
            },
            {
                id: 'sameday',
                label: 'Same Day',
                description: 'Within 4-6 hours',
                emoji: '⚡',
                deliveryCharge: samedayRate,
                estimatedDays: 0,
                courierName: 'Speed Delivery',
            },
        ];

        return NextResponse.json({
            success: true,
            tiers,
            source: 'estimated',
            weight,
            deliveryCharge: standardRate,
            estimatedDays: 5,
            courierName: 'Standard Delivery',
        });
    } catch (error: any) {
        console.error('❌ Delivery rate calculation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to calculate delivery rate' },
            { status: 500 }
        );
    }
}
