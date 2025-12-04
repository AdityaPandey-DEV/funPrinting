import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CreatorEarning from '@/models/CreatorEarning';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');
    
    // Build query filter
    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Fetch earnings with creator info
    const earnings = await CreatorEarning.find(filter)
      .populate('creatorUserId', 'name email upiId bankDetails')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Calculate summary
    const allEarnings = await CreatorEarning.find({});
    const summary = {
      totalEarnings: allEarnings.reduce((sum, e) => sum + e.amount, 0),
      pendingEarnings: allEarnings
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + e.amount, 0),
      paidEarnings: allEarnings
        .filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + e.amount, 0),
      platformEarnings: allEarnings.reduce((sum, e) => sum + (e.platformShareAmount || 0), 0),
      totalCount: allEarnings.length,
      pendingCount: allEarnings.filter(e => e.status === 'pending').length,
      paidCount: allEarnings.filter(e => e.status === 'paid').length,
    };
    
    return NextResponse.json({
      success: true,
      earnings,
      summary,
    });
  } catch (error) {
    console.error('Error fetching creator earnings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}


