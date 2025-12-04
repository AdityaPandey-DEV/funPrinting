import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { uploadFile } from '@/lib/storage';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/templateAuth';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { 
      templateName, 
      wordContent, 
      placeholders, 
      description, 
      category, 
      pdfUrl,
      isPublic,
      isPaid,
      price,
      allowFreeDownload,
    } = await request.json();

    if (!templateName || !wordContent) {
      return NextResponse.json(
        { success: false, error: 'Template name and content are required' },
        { status: 400 }
      );
    }

    // Get current user from session
    const session = await getCurrentUser();
    if (!session || !session.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user details
    const user = await User.findOne({ email: session.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has payout info for paid templates
    const hasPayoutInfo = !!(user.upiId || user.bankDetails?.accountNumber);
    
    // Validate and sanitize monetization fields
    const safeIsPaid = !!isPaid && hasPayoutInfo && (price ?? 0) > 0;
    const safePrice = safeIsPaid ? Math.max(0, Number(price) || 0) : 0;
    const safeAllowFreeDownload = allowFreeDownload === false ? false : true;
    const safeIsPublic = !!isPublic;

    // If user tried to set isPaid but doesn't have payout info, return error
    if (isPaid && !hasPayoutInfo) {
      return NextResponse.json(
        { success: false, error: 'Please set up payout settings before creating a paid template' },
        { status: 400 }
      );
    }

    // If isPaid but price is invalid
    if (isPaid && (price ?? 0) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid price greater than 0 for a paid template' },
        { status: 400 }
      );
    }

    // Generate unique template ID
    const templateId = uuidv4();

    console.log('📄 Creating Word document from template content...');

    // Create Word document from the structured content
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Add paragraphs
          ...wordContent.paragraphs.map((p: any) => {
            if (p.style === 'heading') {
              return new Paragraph({
                children: [new TextRun({
                  text: p.text,
                  bold: true,
                  size: p.level === 1 ? 32 : p.level === 2 ? 28 : 24
                })]
              });
            } else {
              return new Paragraph({
                children: [new TextRun({
                  text: p.text,
                  size: 20,
                  color: p.isPlaceholder ? "FF0000" : undefined,
                  bold: p.isPlaceholder ? true : undefined
                })]
              });
            }
          }),
          
          // Add tables
          ...wordContent.tables.map((table: any) => {
            return new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                // Header row
                new TableRow({
                  children: table.headers.map((header: string) => 
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({
                          text: header,
                          bold: true
                        })]
                      })]
                    })
                  )
                }),
                // Data rows
                ...table.rows.map((row: string[]) =>
                  new TableRow({
                    children: row.map((cell: string) =>
                      new TableCell({
                        children: [new Paragraph({
                          children: [new TextRun({
                            text: cell,
                            color: cell.includes('@') ? "FF0000" : undefined,
                            bold: cell.includes('@') ? true : undefined
                          })]
                        })]
                      })
                    )
                  })
                )
              ]
            });
          })
        ]
      }]
    });

    // Generate Word document buffer
    const wordBuffer = await Packer.toBuffer(doc);
    
    console.log('✅ Word document created, size:', wordBuffer.length, 'bytes');

    // Upload Word document to storage
    const wordUrl = await uploadFile(
      wordBuffer,
      `templates/word/${templateId}`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    console.log('✅ Word document uploaded to cloud storage:', wordUrl);

    // Create new dynamic template with user context and monetization
    const template = new DynamicTemplate({
      id: templateId,
      name: templateName,
      description: description || 'Dynamic template',
      category: category || 'other',
      pdfUrl: pdfUrl || '',
      wordUrl: wordUrl,
      wordContent: wordContent, // Keep JSON structure for backward compatibility
      placeholders: placeholders || [],
      createdBy: user.email, // Backward compatible
      createdByUserId: user._id,
      createdByEmail: user.email,
      createdByName: user.name,
      isPublic: safeIsPublic,
      createdByType: 'user',
      // Monetization fields
      isPaid: safeIsPaid,
      price: safePrice,
      allowFreeDownload: safeAllowFreeDownload,
      creatorPayoutMethod: user.upiId ? 'upi' : (user.bankDetails?.accountNumber ? 'bank' : undefined),
      creatorUpiId: user.upiId,
      creatorBankDetails: user.bankDetails,
    });

    await template.save();

    console.log('✅ Template saved to database:', templateId);

    return NextResponse.json({
      success: true,
      templateId: templateId,
      wordUrl: wordUrl,
      message: 'Template saved successfully with Word file in cloud storage'
    });

  } catch (error) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save template' },
      { status: 500 }
    );
  }
}

