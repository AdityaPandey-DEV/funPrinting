import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { uploadFile } from '@/lib/storage';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/templateAuth';
import User from '@/models/User';
import * as mammoth from 'mammoth';
import PizZip from 'pizzip';

/**
 * Parse DOCX file to extract paragraphs and tables structure
 * This mimics the old template approach where wordContent is populated from the DOCX file
 */
async function parseDocxToWordContent(docxBuffer: Buffer): Promise<{
  paragraphs: Array<{
    text: string;
    style: 'heading' | 'normal' | 'list';
    level?: number;
    isPlaceholder?: boolean;
  }>;
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
}> {
  try {
    const paragraphs: Array<{
      text: string;
      style: 'heading' | 'normal' | 'list';
      level?: number;
      isPlaceholder?: boolean;
    }> = [];
    const tables: Array<{
      headers: string[];
      rows: string[][];
    }> = [];

    // Use mammoth to extract text with structure
    const mammothResult = await mammoth.extractRawText({ buffer: docxBuffer });
    const text = mammothResult.value;

    // Parse paragraphs from text (split by double newlines)
    const textParagraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    for (const paraText of textParagraphs) {
      const trimmedText = paraText.trim();
      
      // Check if it's a placeholder
      const placeholderRegex = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/;
      const isPlaceholder = placeholderRegex.test(trimmedText);
      
      // Determine style (simple heuristic: all caps or short text might be heading)
      let style: 'heading' | 'normal' | 'list' = 'normal';
      let level: number | undefined = undefined;
      
      if (trimmedText.length < 100 && trimmedText === trimmedText.toUpperCase() && trimmedText.length > 3) {
        style = 'heading';
        level = 1;
      } else if (trimmedText.startsWith('-') || trimmedText.startsWith('•') || trimmedText.match(/^\d+\./)) {
        style = 'list';
      }
      
      paragraphs.push({
        text: trimmedText,
        style,
        level,
        isPlaceholder
      });
    }

    // Try to extract tables from DOCX XML using PizZip
    try {
      const zip = new PizZip(docxBuffer);
      const documentXml = zip.file('word/document.xml');
      
      if (documentXml) {
        const xmlContent = documentXml.asText();
        
        // Simple table extraction: look for table structures in XML
        // This is a basic implementation - can be enhanced
        const tableRegex = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
        const tableMatches = xmlContent.match(tableRegex);
        
        if (tableMatches) {
          for (const tableXml of tableMatches) {
            // Extract rows
            const rowRegex = /<w:tr>[\s\S]*?<\/w:tr>/g;
            const rowMatches = tableXml.match(rowRegex);
            
            if (rowMatches && rowMatches.length > 0) {
              const tableRows: string[][] = [];
              let headers: string[] = [];
              
              for (let i = 0; i < rowMatches.length; i++) {
                const rowXml = rowMatches[i];
                // Extract cell text
                const cellTextRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
                const cells: string[] = [];
                let cellMatch;
                
                while ((cellMatch = cellTextRegex.exec(rowXml)) !== null) {
                  cells.push(cellMatch[1].trim());
                }
                
                if (cells.length > 0) {
                  if (i === 0) {
                    // First row is header
                    headers = cells;
                  } else {
                    tableRows.push(cells);
                  }
                }
              }
              
              if (headers.length > 0) {
                tables.push({
                  headers,
                  rows: tableRows
                });
              }
            }
          }
        }
      }
    } catch (xmlError) {
      console.warn('⚠️ Could not extract tables from XML, continuing without tables:', xmlError);
      // Continue without tables if XML parsing fails
    }

    // If no paragraphs were extracted, add at least one to prevent blank document
    if (paragraphs.length === 0) {
      paragraphs.push({
        text: 'Document content',
        style: 'normal',
        isPlaceholder: false
      });
    }

    console.log(`✅ Parsed DOCX: ${paragraphs.length} paragraphs, ${tables.length} tables`);
    
    return { paragraphs, tables };
    
  } catch (error) {
    console.error('❌ Error parsing DOCX to wordContent:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

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

    // Check if wordContent is empty (new template flow)
    const isEmptyWordContent = 
      (!wordContent.paragraphs || wordContent.paragraphs.length === 0) &&
      (!wordContent.tables || wordContent.tables.length === 0);

    // If wordContent is empty and pdfUrl is provided, parse the DOCX file to populate wordContent
    if (isEmptyWordContent && pdfUrl) {
      console.log('📥 wordContent is empty, parsing DOCX file from pdfUrl to populate content...');
      
      try {
        // Download DOCX file from pdfUrl
        const docxResponse = await fetch(pdfUrl);
        if (!docxResponse.ok) {
          throw new Error(`Failed to download DOCX file: ${docxResponse.statusText}`);
        }
        
        const docxBuffer = Buffer.from(await docxResponse.arrayBuffer());
        console.log(`✅ Downloaded DOCX file: ${docxBuffer.length} bytes`);
        
        // Parse DOCX to extract paragraphs and tables
        const parsedContent = await parseDocxToWordContent(docxBuffer);
        
        // Populate wordContent with parsed content
        wordContent.paragraphs = parsedContent.paragraphs;
        wordContent.tables = parsedContent.tables;
        
        console.log(`✅ Populated wordContent: ${wordContent.paragraphs.length} paragraphs, ${wordContent.tables.length} tables`);
      } catch (parseError) {
        console.error('❌ Error parsing DOCX file:', parseError);
        // If parsing fails, we'll still try to create document with empty content
        // This prevents the API from completely failing, but will result in blank document
        // User should be aware of this limitation
        console.warn('⚠️ Continuing with empty wordContent - document may be blank');
      }
    }

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

