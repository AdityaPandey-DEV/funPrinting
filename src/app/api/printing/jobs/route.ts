import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PrintJob from '@/models/PrintJob';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const printerId = searchParams.get('printerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (printerId) query.printerId = printerId;
    
    const skip = (page - 1) * limit;
    
    const [jobs, total] = await Promise.all([
      PrintJob.find(query)
        .sort({ priority: -1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PrintJob.countDocuments(query)
    ]);
    
    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching print jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch print jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      orderId,
      orderNumber,
      customerName,
      customerEmail,
      fileURL,
      fileName,
      fileType,
      printingOptions,
      priority = 'normal'
    } = body;
    
    // Validate required fields
    if (!orderId || !orderNumber || !customerName || !customerEmail || !fileURL || !fileName || !printingOptions) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if print job already exists for this order
    const existingJob = await PrintJob.findOne({ orderId });
    if (existingJob) {
      return NextResponse.json(
        { success: false, error: 'Print job already exists for this order' },
        { status: 409 }
      );
    }
    
    // Calculate estimated duration (rough estimate)
    const estimatedDuration = Math.ceil(
      (printingOptions.pageCount * printingOptions.copies * 0.5) + // 0.5 minutes per page
      (printingOptions.color === 'color' ? printingOptions.pageCount * 0.3 : 0) // Extra time for color
    );
    
    const printJob = new PrintJob({
      orderId,
      orderNumber,
      customerName,
      customerEmail,
      fileURL,
      fileName,
      fileType,
      printingOptions,
      priority,
      estimatedDuration,
      status: 'pending'
    });
    
    await printJob.save();
    
    console.log(`✅ Print job created: ${printJob.orderNumber} (${printJob.fileName})`);
    
    // Trigger auto-printing if enabled
    await triggerAutoPrint(printJob._id.toString());
    
    return NextResponse.json({
      success: true,
      message: 'Print job created successfully',
      printJob
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating print job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create print job' },
      { status: 500 }
    );
  }
}

// Helper function to trigger auto-printing
async function triggerAutoPrint(printJobId: string) {
  try {
    // This will be called by the print queue processor
    console.log(`🔄 Auto-print triggered for job: ${printJobId}`);
    
    // For now, we'll just log it. In a real implementation, this would:
    // 1. Find an available printer
    // 2. Assign the job to the printer
    // 3. Start the printing process
    
    // TODO: Implement actual printing logic
  } catch (error) {
    console.error('Error triggering auto-print:', error);
  }
}
