import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PrintJob from '@/models/PrintJob';
import { printQueueManager } from '@/lib/printQueue';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { orderId } = body;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Check if print job already exists for this order
    const existingJob = await PrintJob.findOne({ orderId });
    if (existingJob) {
      return NextResponse.json({
        success: true,
        message: 'Print job already exists for this order',
        printJob: existingJob
      });
    }
    
    // This endpoint is called when an order is completed
    // The actual print job creation should be done by the order completion process
    // This endpoint just triggers the queue processing
    
    console.log(`🔄 Auto-print triggered for order: ${orderId}`);
    
    // Trigger immediate queue processing
    await printQueueManager.processQueue();
    
    return NextResponse.json({
      success: true,
      message: 'Auto-print triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering auto-print:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger auto-print' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const status = await printQueueManager.getQueueStatus();
    
    return NextResponse.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting print queue status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}
