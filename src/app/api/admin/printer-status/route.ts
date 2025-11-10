import { NextRequest, NextResponse } from 'next/server';
import { printerClient } from '@/lib/printerClient';
import axios from 'axios';

/**
 * GET /api/admin/printer-status
 * Get printer API status and queue information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const printerIndex = parseInt(searchParams.get('printerIndex') || '1', 10);

    // Get printer API URLs
    const printerUrls = process.env.PRINTER_API_URLS 
      ? (JSON.parse(process.env.PRINTER_API_URLS) || [])
      : [];
    
    if (printerUrls.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No printer API URLs configured'
      });
    }

    // Get printer URL for the index
    const printerUrl = printerUrls[(printerIndex - 1) % printerUrls.length];
    const apiKey = process.env.PRINTER_API_KEY || '';

    // Fetch printer API health and queue status
    let printerHealth = { available: false, message: 'Not checked' };
    let queueStatus = { total: 0, pending: 0, jobs: [] };
    let printerApiHealth: any = { status: 'unknown', timestamp: new Date().toISOString() };

    try {
      // Check health endpoint (no auth required)
      const healthResponse = await axios.get(`${printerUrl}/health`, {
        timeout: 5000
      });
      printerApiHealth = healthResponse.data;
    } catch (error: any) {
      printerApiHealth = {
        status: 'unhealthy',
        error: error.message || 'Health check failed',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Check queue status (requires auth)
      const queueResponse = await axios.get(`${printerUrl}/api/queue/status`, {
        headers: {
          'X-API-Key': apiKey
        },
        timeout: 5000
      });
      
      if (queueResponse.data.success) {
        queueStatus = queueResponse.data;
      }
    } catch (error: any) {
      console.error('Error fetching queue status:', error.message);
      // Continue without queue status
    }

    // Check printer client health
    printerHealth = await printerClient.checkHealth(printerIndex);
    const retryQueueStatus = printerClient.getRetryQueueStatus();

    return NextResponse.json({
      success: true,
      printerIndex,
      printerUrl,
      printerApi: {
        health: printerApiHealth,
        queue: queueStatus
      },
      funPrinting: {
        printerHealth,
        retryQueue: retryQueueStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting printer status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get printer status' 
      },
      { status: 500 }
    );
  }
}

