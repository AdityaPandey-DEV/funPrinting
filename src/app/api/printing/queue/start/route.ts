import { NextRequest, NextResponse } from 'next/server';
import { printQueueManager } from '@/lib/printQueue';

export async function POST(request: NextRequest) {
  try {
    // Start the print queue processor
    await printQueueManager.startProcessing(5000); // Process every 5 seconds
    
    console.log('🔄 Print queue processor started');
    
    return NextResponse.json({
      success: true,
      message: 'Print queue processor started successfully'
    });
  } catch (error) {
    console.error('Error starting print queue processor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start print queue processor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Stop the print queue processor
    printQueueManager.stopProcessing();
    
    console.log('⏹️ Print queue processor stopped');
    
    return NextResponse.json({
      success: true,
      message: 'Print queue processor stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping print queue processor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop print queue processor' },
      { status: 500 }
    );
  }
}
