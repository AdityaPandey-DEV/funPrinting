import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  return NextResponse.json({ success: true, message: 'Test route working' });
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({ success: true, message: 'Test route working' });
}
