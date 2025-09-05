import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const templateDataStr = formData.get('templateData') as string;

    if (!file || !templateDataStr) {
      return NextResponse.json(
        { success: false, error: 'File and template data are required' },
        { status: 400 }
      );
    }

    console.log('🔄 Processing admin template upload...');
    console.log('📄 File size:', file.size, 'bytes');

    const templateData = JSON.parse(templateDataStr);
    console.log('📋 Template data:', templateData);

    await connectDB();

    // Process Word document directly
    let wordContent: any;
    let wordBuffer: Buffer;
    
    try {
      console.log('🔄 Processing Word document directly...');
      
      // Get the Word document buffer
      wordBuffer = Buffer.from(await file.arrayBuffer());
      
      // Use mammoth to extract content from the Word document
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ buffer: wordBuffer });
      const htmlContent = result.value;
      
      // Convert HTML to plain text for placeholder extraction
      const textContent = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      
      // Extract placeholders using regex
      const placeholderRegex = /@([A-Za-z0-9_]+)/g;
      const placeholders = [...new Set(
        (textContent.match(placeholderRegex) || [])
          .map(match => match.substring(1))
      )];
      
      console.log('📝 Extracted placeholders:', placeholders);
      
      // Split content into paragraphs for better display
      const lines = textContent.split('\n').filter(line => line.trim().length > 0);
      const paragraphs = lines.map((line, index) => {
        const trimmedLine = line.trim();
        const placeholderMatch = trimmedLine.match(/@(\w+)/);
        const isPlaceholder = !!placeholderMatch;
        const placeholderName = isPlaceholder ? placeholderMatch[1] : '';

        let style = 'normal';
        let level = 1;

        // Detect headings (short lines, all caps, or ending with colon)
        if (trimmedLine.length < 100 && (trimmedLine.toUpperCase() === trimmedLine || trimmedLine.endsWith(':')) && !isPlaceholder) {
          style = 'heading';
          level = trimmedLine.includes(':') ? 3 : (trimmedLine.length < 50 ? 1 : 2);
        } else if (trimmedLine.match(/^\d+\./)) {
          style = 'list';
        }

        return {
          id: (index + 1).toString(),
          text: trimmedLine,
          style: style,
          level: level,
          isPlaceholder: isPlaceholder,
          placeholderName: placeholderName
        };
      });
      
      // Create word content object
      wordContent = {
        paragraphs: paragraphs,
        tables: [],
        totalParagraphs: paragraphs.length,
        placeholders: placeholders,
        conversionMethod: 'mammoth',
        docxBuffer: wordBuffer.toString('base64'),
        fullHtml: htmlContent
      };
      
      console.log('✅ Word document processed successfully');
      console.log('📝 Extracted placeholders:', wordContent.placeholders);
    } catch (error) {
      console.error('❌ Error processing Word document:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to process Word document' },
        { status: 500 }
      );
    }

    // Create Word document from the converted content
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: wordContent.paragraphs.map((paragraph: any) => 
            new Paragraph({
              children: [new TextRun(paragraph.text)]
            })
          )
        }]
      });

      wordBuffer = await Packer.toBuffer(doc);
      console.log('✅ Word document created from converted content');
    } catch (error) {
      console.error('❌ Error creating Word document:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create Word document' },
        { status: 500 }
      );
    }

    // Upload PDF to cloud storage
    let pdfUrl: string;
    try {
      const pdfBuffer = Buffer.from(await file.arrayBuffer());
      pdfUrl = await uploadToCloudinary(pdfBuffer, 'templates');
      console.log('✅ PDF uploaded to cloud storage');
    } catch (error) {
      console.error('❌ Error uploading PDF:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to upload PDF' },
        { status: 500 }
      );
    }

    // Upload Word document to cloud storage
    let wordUrl: string;
    try {
      wordUrl = await uploadToCloudinary(wordBuffer, 'templates');
      console.log('✅ Word document uploaded to cloud storage');
    } catch (error) {
      console.error('❌ Error uploading Word document:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to upload Word document' },
        { status: 500 }
      );
    }

    // Generate unique template ID
    const templateId = uuidv4();

    // Create new dynamic template
    const template = new DynamicTemplate({
      id: templateId,
      name: templateData.name,
      description: templateData.description || 'Dynamic template created from PDF',
      category: templateData.category || 'other',
      pdfUrl: pdfUrl,
      wordUrl: wordUrl,
      wordContent: wordContent, // Keep JSON structure for backward compatibility
      placeholders: wordContent.placeholders || [],
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await template.save();
    console.log('✅ Template saved to database:', templateId);

    return NextResponse.json({
      success: true,
      templateId: templateId,
      pdfUrl: pdfUrl,
      wordUrl: wordUrl,
      placeholders: wordContent.placeholders || [],
      message: 'Template created successfully with Adobe PDF Services API'
    });

  } catch (error) {
    console.error('❌ Error creating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
