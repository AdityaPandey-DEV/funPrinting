import { NextRequest, NextResponse } from 'next/server';
import { getPricing } from '@/lib/pricing';

export async function GET(request: NextRequest) {
  try {
    const pricing = await getPricing();
    
    return NextResponse.json({
      success: true,
      pricing,
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}
