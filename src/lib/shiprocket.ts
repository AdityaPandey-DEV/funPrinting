/**
 * Shiprocket API Integration
 * 
 * Handles authentication, order creation, AWB assignment, and shipment tracking.
 * API Docs: https://apiv2.shiprocket.in/v1/external/
 */

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

// In-memory token cache (auto-refreshes when expired)
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * Get a valid Shiprocket auth token (cached for ~9 days, auto-refreshes)
 */
export async function getAuthToken(): Promise<string> {
    // Return cached token if still valid (with 1-hour buffer)
    if (cachedToken && Date.now() < tokenExpiresAt - 3600000) {
        return cachedToken;
    }

    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
        throw new Error('Shiprocket credentials not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD env vars.');
    }

    const response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shiprocket auth failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    cachedToken = data.token;
    // Token valid for 10 days, we cache for 9 days
    tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;

    console.log('✅ Shiprocket auth token obtained successfully');
    return cachedToken!;
}

/**
 * Make an authenticated API request to Shiprocket
 */
async function shiprocketRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
): Promise<any> {
    const token = await getAuthToken();

    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${SHIPROCKET_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Shiprocket API error (${response.status}): ${errorText}`);
        throw new Error(`Shiprocket API error (${response.status}): ${errorText}`);
    }

    return response.json();
}

// ─── Order Creation ───────────────────────────────────────────────────────────

interface ShiprocketOrderInput {
    orderId: string;
    orderDate: string; // ISO date string
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    address: string;
    city: string;
    pinCode: string;
    state?: string;
    country?: string;
    amount: number;
    items: Array<{
        name: string;
        sku: string;
        units: number;
        sellingPrice: number;
    }>;
    weight?: number; // in kg
    length?: number; // in cm
    breadth?: number; // in cm
    height?: number; // in cm
    paymentMethod?: 'Prepaid' | 'COD';
}

interface ShiprocketOrderResult {
    success: boolean;
    shiprocketOrderId?: number;
    shipmentId?: number;
    error?: string;
}

/**
 * Create an order in Shiprocket from our order data
 */
export async function createShiprocketOrder(input: ShiprocketOrderInput): Promise<ShiprocketOrderResult> {
    try {
        const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary';
        const defaultWeight = parseFloat(process.env.SHIPROCKET_DEFAULT_WEIGHT || '0.5');

        const payload = {
            order_id: input.orderId,
            order_date: new Date(input.orderDate).toISOString().split('T')[0] + ' ' +
                new Date(input.orderDate).toTimeString().split(' ')[0],
            pickup_location: pickupLocation,
            channel_id: '',
            comment: `FunPrinting Order #${input.orderId}`,
            billing_customer_name: input.customerName.split(' ')[0] || input.customerName,
            billing_last_name: input.customerName.split(' ').slice(1).join(' ') || '',
            billing_address: input.address,
            billing_city: input.city,
            billing_pincode: input.pinCode,
            billing_state: input.state || '',
            billing_country: input.country || 'India',
            billing_email: input.customerEmail,
            billing_phone: input.customerPhone.replace(/[^0-9]/g, '').slice(-10),
            shipping_is_billing: true,
            order_items: input.items.map(item => ({
                name: item.name,
                sku: item.sku,
                units: item.units,
                selling_price: item.sellingPrice.toString(),
                discount: '0',
                tax: '0',
                hsn: '4901', // HSN code for printed material
            })),
            payment_method: input.paymentMethod || 'Prepaid',
            sub_total: input.amount,
            length: input.length || 30,
            breadth: input.breadth || 22,
            height: input.height || 3,
            weight: input.weight || defaultWeight,
        };

        console.log(`📦 Creating Shiprocket order for: ${input.orderId}`);
        const data = await shiprocketRequest('/orders/create/adhoc', 'POST', payload);

        console.log(`✅ Shiprocket order created:`, {
            orderId: data.order_id,
            shipmentId: data.shipment_id,
            status: data.status,
        });

        return {
            success: true,
            shiprocketOrderId: data.order_id,
            shipmentId: data.shipment_id,
        };
    } catch (error: any) {
        console.error('❌ Failed to create Shiprocket order:', error.message);
        return {
            success: false,
            error: error.message || 'Failed to create Shiprocket order',
        };
    }
}

// ─── AWB Assignment ───────────────────────────────────────────────────────────

interface AWBResult {
    success: boolean;
    awbCode?: string;
    courierName?: string;
    courierCompanyId?: number;
    error?: string;
}

/**
 * Assign a courier and generate AWB (tracking number) for a shipment
 */
export async function assignAWB(shipmentId: number, courierId?: number): Promise<AWBResult> {
    try {
        const payload: Record<string, unknown> = { shipment_id: shipmentId };
        if (courierId) {
            payload.courier_id = courierId;
        }

        console.log(`🚚 Assigning AWB for shipment: ${shipmentId}`);
        const data = await shiprocketRequest('/courier/assign/awb', 'POST', payload);

        const awbAssignData = data.response?.data;

        if (awbAssignData?.awb_code) {
            console.log(`✅ AWB assigned:`, {
                awbCode: awbAssignData.awb_code,
                courierName: awbAssignData.courier_name,
            });

            return {
                success: true,
                awbCode: awbAssignData.awb_code,
                courierName: awbAssignData.courier_name,
                courierCompanyId: awbAssignData.courier_company_id,
            };
        }

        // Sometimes the response structure differs
        if (data.awb_code) {
            return {
                success: true,
                awbCode: data.awb_code,
                courierName: data.courier_name || 'Unknown',
            };
        }

        throw new Error(data.message || 'AWB assignment failed - no AWB code in response');
    } catch (error: any) {
        console.error('❌ Failed to assign AWB:', error.message);
        return {
            success: false,
            error: error.message || 'Failed to assign AWB',
        };
    }
}

// ─── Shipment Tracking ────────────────────────────────────────────────────────

interface TrackingActivity {
    date: string;
    activity: string;
    location: string;
    status: string;
}

interface TrackingResult {
    success: boolean;
    currentStatus?: string;
    deliveredDate?: string;
    etd?: string; // estimated time of delivery
    activities?: TrackingActivity[];
    trackingUrl?: string;
    error?: string;
}

/**
 * Track a shipment by AWB code
 */
export async function trackShipment(awbCode: string): Promise<TrackingResult> {
    try {
        console.log(`📍 Tracking shipment with AWB: ${awbCode}`);
        const data = await shiprocketRequest(`/courier/track/awb/${awbCode}`, 'GET');

        const trackingData = data.tracking_data;
        if (!trackingData) {
            return {
                success: true,
                currentStatus: 'UNKNOWN',
                activities: [],
                trackingUrl: getTrackingUrl(awbCode),
            };
        }

        const activities: TrackingActivity[] = (trackingData.shipment_track_activities || []).map(
            (activity: any) => ({
                date: activity.date || '',
                activity: activity['sr-status-label'] || activity.activity || '',
                location: activity.location || '',
                status: activity['sr-status'] || '',
            })
        );

        return {
            success: true,
            currentStatus: trackingData.shipment_status?.toString() || trackingData.track_status?.toString() || 'UNKNOWN',
            deliveredDate: trackingData.delivered_date || undefined,
            etd: trackingData.etd || undefined,
            activities,
            trackingUrl: getTrackingUrl(awbCode),
        };
    } catch (error: any) {
        console.error('❌ Failed to track shipment:', error.message);
        return {
            success: false,
            error: error.message || 'Failed to track shipment',
        };
    }
}

/**
 * Get the public Shiprocket tracking URL for an AWB
 */
export function getTrackingUrl(awbCode: string): string {
    return `https://shiprocket.co/tracking/${awbCode}`;
}

// ─── Combined Ship Order Flow ─────────────────────────────────────────────────

interface ShipOrderResult {
    success: boolean;
    shiprocketOrderId?: number;
    shipmentId?: number;
    awbCode?: string;
    courierName?: string;
    trackingUrl?: string;
    error?: string;
}

/**
 * Full shipping flow: Create Shiprocket order + Assign AWB in one call.
 * This is the main function used by the admin "Ship Order" action.
 */
export async function shipOrder(order: any): Promise<ShipOrderResult> {
    try {
        // Validate that order has delivery address
        if (!order.deliveryOption || order.deliveryOption.type !== 'delivery') {
            return { success: false, error: 'Order is not a delivery order (pickup only)' };
        }

        const address = order.deliveryOption.address;
        const city = order.deliveryOption.city;
        const pinCode = order.deliveryOption.pinCode;

        if (!address || !city || !pinCode) {
            return { success: false, error: 'Order is missing delivery address, city, or pin code' };
        }

        const customerInfo = order.customerInfo || order.studentInfo;
        if (!customerInfo) {
            return { success: false, error: 'Order is missing customer information' };
        }

        // Step 1: Create Shiprocket order
        const orderResult = await createShiprocketOrder({
            orderId: order.orderId,
            orderDate: order.createdAt,
            customerName: customerInfo.name,
            customerEmail: customerInfo.email,
            customerPhone: customerInfo.phone,
            address,
            city,
            pinCode,
            state: order.deliveryOption.state || '',
            amount: order.amount,
            items: [{
                name: `Printing Order #${order.orderId}`,
                sku: `PRINT-${order.orderId}`,
                units: 1,
                sellingPrice: order.amount,
            }],
            paymentMethod: 'Prepaid', // Already paid via Razorpay
        });

        if (!orderResult.success || !orderResult.shipmentId) {
            return {
                success: false,
                error: orderResult.error || 'Failed to create Shiprocket order',
            };
        }

        // Step 2: Assign AWB (courier + tracking number)
        const awbResult = await assignAWB(orderResult.shipmentId);

        if (!awbResult.success || !awbResult.awbCode) {
            // Order was created but AWB assignment failed - still partially successful
            return {
                success: true, // Order exists in Shiprocket, AWB can be assigned later
                shiprocketOrderId: orderResult.shiprocketOrderId,
                shipmentId: orderResult.shipmentId,
                error: `Order created in Shiprocket but AWB assignment failed: ${awbResult.error}. You can retry AWB assignment from the Shiprocket dashboard.`,
            };
        }

        const trackingUrl = getTrackingUrl(awbResult.awbCode);

        console.log(`🎉 Order shipped successfully:`, {
            shiprocketOrderId: orderResult.shiprocketOrderId,
            shipmentId: orderResult.shipmentId,
            awbCode: awbResult.awbCode,
            courierName: awbResult.courierName,
            trackingUrl,
        });

        return {
            success: true,
            shiprocketOrderId: orderResult.shiprocketOrderId,
            shipmentId: orderResult.shipmentId,
            awbCode: awbResult.awbCode,
            courierName: awbResult.courierName,
            trackingUrl,
        };
    } catch (error: any) {
        console.error('❌ Ship order failed:', error.message);
        return {
            success: false,
            error: error.message || 'Failed to ship order',
        };
    }
}

/**
 * Check if Shiprocket is configured (credentials present)
 */
export function isShiprocketConfigured(): boolean {
    return !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
}
