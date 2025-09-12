import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Printer from '@/models/Printer';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await context.params;
    
    const printer = await Printer.findById(id);
    if (!printer) {
      return NextResponse.json(
        { success: false, error: 'Printer not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      printer
    });
  } catch (error) {
    console.error('Error fetching printer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch printer' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await context.params;
    const body = await request.json();
    
    const printer = await Printer.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!printer) {
      return NextResponse.json(
        { success: false, error: 'Printer not found' },
        { status: 404 }
      );
    }
    
    console.log(`✅ Printer updated: ${printer.name}`);
    
    return NextResponse.json({
      success: true,
      message: 'Printer updated successfully',
      printer
    });
  } catch (error) {
    console.error('Error updating printer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update printer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await context.params;
    
    const printer = await Printer.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    
    if (!printer) {
      return NextResponse.json(
        { success: false, error: 'Printer not found' },
        { status: 404 }
      );
    }
    
    console.log(`✅ Printer deactivated: ${printer.name}`);
    
    return NextResponse.json({
      success: true,
      message: 'Printer deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating printer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate printer' },
      { status: 500 }
    );
  }
}
