import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/templateAuth';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { templateName, wordContent, placeholders, description, category, pdfUrl } = await request.json();

    if (!templateName || !wordContent) {
      return NextResponse.json(
        { success: false, error: 'Template name and content are required' },
        { status: 400 }
      );
    }

    await connectDB();

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

    // Upload Word document to Cloudinary
    const wordUrl = await uploadToCloudinary(
      wordBuffer,
      `templates/word/${templateId}.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    console.log('✅ Word document uploaded to cloud storage:', wordUrl);

    // Get current user from session
    const session = await getCurrentUser();
    let user = null;
    if (session?.email) {
      user = await User.findOne({ email: session.email.toLowerCase() });
    }

    // Create new dynamic template
    const template = new DynamicTemplate({
      id: templateId,
      name: templateName,
      description: description || 'Dynamic template',
      category: category || 'other',
      pdfUrl: pdfUrl || '',
      wordUrl: wordUrl,
      wordContent: wordContent, // Keep JSON structure for backward compatibility
      placeholders: placeholders || [],
      createdBy: user ? user.email : 'admin', // Backward compatible
      createdByUserId: user ? user._id : undefined,
      createdByEmail: user ? user.email : undefined,
      createdByName: user ? user.name : undefined,
      isPublic: false, // Default to private
      createdByType: user ? 'user' : 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
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
