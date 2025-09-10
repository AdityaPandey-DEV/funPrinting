import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NewOrder from '@/models/NewOrder';
import Order from '@/models/Order';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const templateId = formData.get('templateId') as string;
    const formDataJson = formData.get('formData') as string;

    if (!file || !templateId || !formDataJson) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Generate unique order ID
    const orderId = uuidv4();

    console.log('📄 Creating order with auto-uploaded PDF...');
    console.log('📄 PDF file size:', file.size, 'bytes');
    console.log('📄 Template ID:', templateId);

    // Upload PDF to cloud storage
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const pdfUrl = await uploadToCloudinary(
      pdfBuffer,
      `orders/${orderId}.pdf`,
      'application/pdf'
    );

    console.log('✅ PDF uploaded to cloud storage:', pdfUrl);

    // Parse form data
    const parsedFormData = JSON.parse(formDataJson);

    // Create new order with auto-uploaded PDF
    const order = new NewOrder({
      id: orderId,
      templateId: templateId,
      templateName: `Personalized Document - ${templateId}`,
      formData: parsedFormData,
      pdfUrl: pdfUrl,
      status: 'pending',
      totalAmount: 0, // Free for now, can be calculated based on template
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await order.save();

    console.log('✅ Order created successfully:', orderId);
    console.log('📄 PDF auto-uploaded for order:', pdfUrl);

    return NextResponse.json({
      success: true,
      orderId: orderId,
      pdfUrl: pdfUrl,
      message: 'Order created successfully with auto-uploaded PDF'
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get email from query parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Searching orders for email:', email);

    // Search orders by email address
    const orders = await Order.find({ 'customerInfo.email': email })
      .sort({ createdAt: -1 });

    console.log('📋 Found orders:', orders.length);

    return NextResponse.json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}