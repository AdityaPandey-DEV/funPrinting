import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { uploadFile } from '@/lib/storage';
import { sendPdfToCustomer } from '@/lib/notificationService';

/**
 * Render Webhook Endpoint
 * Receives PDF from Render service when DOCX to PDF conversion completes
 * 
 * Expected payload from Render:
 * {
 *   orderId: string,
 *   jobId: string,
 *   pdfUrl?: string,  // URL to download PDF from Render
 *   pdfBuffer?: string, // Base64 encoded PDF buffer (alternative)
 *   status: 'completed' | 'failed',
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.RENDER_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = request.headers.get('x-render-webhook-secret');
      if (providedSecret !== webhookSecret) {
        console.error('❌ Invalid webhook secret');
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const { orderId, jobId, pdfUrl, pdfBuffer, status, error } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing orderId' },
        { status: 400 }
      );
    }

    console.log(`🔔 Render webhook received for order: ${orderId}`);
    console.log(`   Status: ${status}`);
    console.log(`   Job ID: ${jobId || 'N/A'}`);

    // Connect to database
    await connectDB();

    // Find the order
    const order = await Order.findOne({ orderId });
    if (!order) {
      console.error(`❌ Order not found: ${orderId}`);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (status === 'failed') {
      // Update order with failed status
      order.pdfConversionStatus = 'failed';
      await order.save();
      
      console.error(`❌ PDF conversion failed for order ${orderId}: ${error || 'Unknown error'}`);
      
      return NextResponse.json({
        success: true,
        message: 'Order updated with failed status'
      });
    }

    if (status !== 'completed') {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    // Get PDF buffer
    let pdfBufferData: Buffer;
    
    if (pdfBuffer) {
      // PDF provided as base64 buffer
      console.log('📄 PDF received as base64 buffer');
      pdfBufferData = Buffer.from(pdfBuffer, 'base64');
    } else if (pdfUrl) {
      // Download PDF from Render
      console.log(`📥 Downloading PDF from Render: ${pdfUrl}`);
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF from Render: ${pdfResponse.statusText}`);
      }
      const arrayBuffer = await pdfResponse.arrayBuffer();
      pdfBufferData = Buffer.from(arrayBuffer);
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing pdfUrl or pdfBuffer' },
        { status: 400 }
      );
    }

    console.log(`📄 PDF buffer size: ${pdfBufferData.length} bytes`);

    // Upload PDF to storage (replacing DOCX location)
    // Use same folder structure but with PDF extension
    const pdfFolder = 'orders/filled-pdf';
    console.log(`📤 Uploading PDF to storage...`);
    const filledPdfUrl = await uploadFile(
      pdfBufferData,
      pdfFolder,
      'application/pdf'
    );

    console.log(`✅ PDF uploaded: ${filledPdfUrl}`);

    // Update order with PDF URL and status
    order.filledPdfUrl = filledPdfUrl;
    order.pdfConversionStatus = 'completed';
    if (jobId) {
      order.renderJobId = jobId;
    }
    await order.save();

    console.log(`✅ Order ${orderId} updated with PDF URL`);

    // Send PDF to customer's email as attachment
    try {
      console.log(`📧 Sending PDF to customer email: ${order.customerInfo.email}`);
      const emailSent = await sendPdfToCustomer(
        order.customerInfo.email,
        pdfBufferData,
        `${order.templateName || 'document'}_${order.orderId}.pdf`,
        order.orderId
      );

      if (emailSent) {
        console.log(`✅ PDF sent to customer email successfully`);
      } else {
        console.warn(`⚠️ Failed to send PDF to customer email`);
      }
    } catch (emailError) {
      console.error('❌ Error sending PDF to customer email:', emailError);
      // Don't fail the webhook if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'PDF received and order updated successfully',
      orderId: order.orderId,
      pdfUrl: filledPdfUrl
    });

  } catch (error) {
    console.error('❌ Error processing Render webhook:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

