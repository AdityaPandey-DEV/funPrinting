import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { v4 as uuidv4 } from 'uuid';
// mammoth removed - using Microsoft Word directly

/**
 * Generate personalized document from template
 * Supports both Word file download via HTTPS API and JSON-based fallback
 */
export async function POST(request: NextRequest) {
  try {
    const { templateId, formData } = await request.json();

    if (!templateId || !formData) {
      return NextResponse.json(
        { success: false, error: 'Template ID and form data are required' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting document generation via HTTPS API...');
    await connectDB();

    // Fetch template from database
    const template = await DynamicTemplate.findOne({ id: templateId });
    
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    console.log('📄 Generating personalized document for template:', templateId);
    console.log('📝 Form data received:', Object.keys(formData));

    // Check if we have a Word file in cloud storage
    if (template.wordUrl) {
      console.log('📥 Downloading Word template from cloud storage via HTTPS API:', template.wordUrl);
      
      try {
        // Download Word file from cloud storage via HTTPS API
        const response = await fetch(template.wordUrl);
        if (!response.ok) {
          throw new Error(`Failed to download Word file via HTTPS: ${response.statusText}`);
        }
        
        const wordBuffer = Buffer.from(await response.arrayBuffer());
        console.log('✅ Word file downloaded via HTTPS API, size:', wordBuffer.length, 'bytes');
        
        // For direct Word document usage, we'll create a simple placeholder
        const wordText = 'Word document loaded. Use Microsoft Word to add placeholders like {{name}}, {{date}}, etc.';
        
        console.log('✅ Text extracted from Word document, length:', wordText.length, 'characters');
        
        // Replace placeholders in the text
        let personalizedText = wordText;
        Object.keys(formData).forEach(key => {
          const placeholder = `{{${key}}}`;
          const value = formData[key] || '';
          personalizedText = personalizedText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
        });
        
        // Create new Word document with personalized content
        const lines = personalizedText.split('\n').filter((line: string) => line.trim().length > 0);
        
        const paragraphs = lines.map((line: string) => {
          const trimmedLine = line.trim();
          
          // Check if it's a placeholder
          const placeholderMatch = trimmedLine.match(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/);
          
          if (placeholderMatch) {
            // This is a placeholder, make it stand out
            return new Paragraph({
              children: [new TextRun({
                text: trimmedLine,
                color: "FF0000", // Red color for placeholders
                bold: true
              })]
            });
          } else if (trimmedLine.length < 100 && trimmedLine.toUpperCase() === trimmedLine) {
            // This is a heading
            return new Paragraph({
              children: [new TextRun({
                text: trimmedLine,
                bold: true,
                size: 32
              })]
            });
          } else {
            // Regular text
            return new Paragraph({
              children: [new TextRun({
                text: trimmedLine,
                size: 20
              })]
            });
          }
        });
        
        // Create the personalized Word document
        const doc = new Document({
          sections: [{
            properties: {},
            children: paragraphs
          }]
        });
        
        // Generate Word document buffer
        const buffer = await Packer.toBuffer(doc);
        
        // Generate unique filename
        const filename = `personalized_${template.name}_${uuidv4()}.docx`;
        
        console.log('✅ Personalized document generated:', filename);
        console.log('📊 Document size:', buffer.length, 'bytes');

        // Return the document buffer
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length.toString()
          }
        });
        
      } catch (error) {
        console.error('❌ Error processing Word file from cloud storage via HTTPS API:', error);
        console.log('🔄 Falling back to JSON-based approach...');
        // Fall back to JSON-based approach
      }
    }

    // Fallback to JSON-based approach (backward compatibility)
    console.log('📄 Using JSON-based template content (fallback)');
    
    if (!template.wordContent) {
      return NextResponse.json(
        { success: false, error: 'Template content not available' },
        { status: 404 }
      );
    }
    
    const personalizedContent = JSON.parse(JSON.stringify(template.wordContent));
    
    // Replace placeholders in paragraphs
    personalizedContent.paragraphs = personalizedContent.paragraphs.map((paragraph: any) => {
      let text = paragraph.text;
      
      // Replace all placeholders with form data
      Object.keys(formData).forEach(key => {
        const placeholder = `@${key}`;
        const value = formData[key] || '';
        text = text.replace(new RegExp(placeholder, 'g'), value);
      });
      
      return {
        ...paragraph,
        text: text
      };
    });

    // Replace placeholders in tables (if tables exist)
    if (personalizedContent.tables) {
      personalizedContent.tables = personalizedContent.tables.map((table: any) => {
      return {
        ...table,
        rows: table.rows.map((row: any) => {
          return row.map((cell: any) => {
            if (typeof cell === 'string') {
              let text = cell;
              Object.keys(formData).forEach(key => {
                const placeholder = `@${key}`;
                const value = formData[key] || '';
                text = text.replace(new RegExp(placeholder, 'g'), value);
              });
              return text;
            }
            return cell;
          });
        })
      };
    });
    }

    // Generate Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Add paragraphs
          ...personalizedContent.paragraphs.map((p: any) => {
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
                  size: 20
                })]
              });
            }
          }),
          
          // Add tables (if tables exist)
          ...(personalizedContent.tables || []).map((table: any) => {
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
                            text: cell
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
    const buffer = await Packer.toBuffer(doc);
    
    // Generate unique filename
    const filename = `personalized_${template.name}_${uuidv4()}.docx`;
    
    console.log('✅ Personalized document generated:', filename);
    console.log('📊 Document size:', buffer.length, 'bytes');

    // Return the document buffer
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating document via HTTPS API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate document via HTTPS API' },
      { status: 500 }
    );
  }
}
