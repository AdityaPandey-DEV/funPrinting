import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Printer from '@/models/Printer';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const printers = await Printer.find({ isActive: true })
      .sort({ name: 1 })
      .lean();
    
    return NextResponse.json({
      success: true,
      printers
    });
  } catch (error) {
    console.error('Error fetching printers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch printers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      name,
      printerModel,
      manufacturer,
      connectionType,
      connectionString,
      capabilities
    } = body;
    
    // Validate required fields
    if (!name || !printerModel || !manufacturer || !connectionType || !connectionString) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if printer with same name already exists
    const existingPrinter = await Printer.findOne({ name });
    if (existingPrinter) {
      return NextResponse.json(
        { success: false, error: 'Printer with this name already exists' },
        { status: 409 }
      );
    }
    
    const printer = new Printer({
      name,
      printerModel,
      manufacturer,
      connectionType,
      connectionString,
      capabilities: {
        supportedPageSizes: capabilities?.supportedPageSizes || ['A4'],
        supportsColor: capabilities?.supportsColor || false,
        supportsDuplex: capabilities?.supportsDuplex || false,
        maxCopies: capabilities?.maxCopies || 1,
        supportedFileTypes: capabilities?.supportedFileTypes || ['application/pdf']
      },
      status: 'offline' // Will be updated when printer is tested
    });
    
    await printer.save();
    
    console.log(`✅ Printer added: ${printer.name} (${printer.printerModel})`);
    
    return NextResponse.json({
      success: true,
      message: 'Printer added successfully',
      printer
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding printer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add printer' },
      { status: 500 }
    );
  }
}
