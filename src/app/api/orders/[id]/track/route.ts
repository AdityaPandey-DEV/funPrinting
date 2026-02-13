import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { trackShipment, isShiprocketConfigured } from '@/lib/shiprocket';

/**
 * GET /api/orders/[id]/track
 * 
 * Customer-facing endpoint to get tracking info for an order.
 * Caches results to avoid overwhelming Shiprocket API.
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await context.params;

        // Get the order
        const order = await Order.findById(id);
        if (!order) {
            return NextResponse.json(
                { success: false, error: 'Order not found' },
                { status: 404 }
            );
        }

        // Check if order has shiprocket data
        if (!order.shiprocket?.awbCode) {
            return NextResponse.json({
                success: true,
                hasTracking: false,
                message: 'This order has not been shipped yet.',
                shiprocket: order.shiprocket || null,
            });
        }

        // Check cache — skip API call if tracked recently (within 5 minutes)
        const lastTracked = order.shiprocket.lastTrackedAt;
        const cacheExpiry = 5 * 60 * 1000; // 5 minutes
        const isCacheFresh = lastTracked && (Date.now() - new Date(lastTracked).getTime()) < cacheExpiry;

        if (isCacheFresh && order.shiprocket.status) {
            // Return cached data
            return NextResponse.json({
                success: true,
                hasTracking: true,
                cached: true,
                shiprocket: {
                    awbCode: order.shiprocket.awbCode,
                    courierName: order.shiprocket.courierName,
                    trackingUrl: order.shiprocket.trackingUrl,
                    status: order.shiprocket.status,
                    lastTrackedAt: order.shiprocket.lastTrackedAt,
                },
            });
        }

        // Check if Shiprocket is configured for live tracking
        if (!isShiprocketConfigured()) {
            return NextResponse.json({
                success: true,
                hasTracking: true,
                cached: true,
                shiprocket: {
                    awbCode: order.shiprocket.awbCode,
                    courierName: order.shiprocket.courierName,
                    trackingUrl: order.shiprocket.trackingUrl,
                    status: order.shiprocket.status || 'SHIPPED',
                    lastTrackedAt: order.shiprocket.lastTrackedAt,
                },
                message: 'Live tracking unavailable — Shiprocket not configured.',
            });
        }

        // Fetch live tracking from Shiprocket
        const trackingResult = await trackShipment(order.shiprocket.awbCode);

        if (trackingResult.success) {
            // Update cached status in database
            await Order.findByIdAndUpdate(id, {
                $set: {
                    'shiprocket.status': trackingResult.currentStatus,
                    'shiprocket.lastTrackedAt': new Date(),
                },
            });

            return NextResponse.json({
                success: true,
                hasTracking: true,
                cached: false,
                shiprocket: {
                    awbCode: order.shiprocket.awbCode,
                    courierName: order.shiprocket.courierName,
                    trackingUrl: order.shiprocket.trackingUrl || trackingResult.trackingUrl,
                    status: trackingResult.currentStatus,
                    lastTrackedAt: new Date().toISOString(),
                },
                tracking: {
                    currentStatus: trackingResult.currentStatus,
                    deliveredDate: trackingResult.deliveredDate,
                    etd: trackingResult.etd,
                    activities: trackingResult.activities,
                },
            });
        }

        // If tracking API failed, return cached data
        return NextResponse.json({
            success: true,
            hasTracking: true,
            cached: true,
            shiprocket: {
                awbCode: order.shiprocket.awbCode,
                courierName: order.shiprocket.courierName,
                trackingUrl: order.shiprocket.trackingUrl,
                status: order.shiprocket.status || 'SHIPPED',
                lastTrackedAt: order.shiprocket.lastTrackedAt,
            },
            message: 'Could not fetch live tracking. Showing cached data.',
        });
    } catch (error: any) {
        console.error('❌ Track order API error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
