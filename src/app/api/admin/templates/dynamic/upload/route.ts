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

    // Convert PDF to Word using Adobe API via HTTPS
    let wordContent: any;
    let wordBuffer: Buffer;
    
    try {
      console.log('🔄 Converting PDF to Word using Adobe API via HTTPS...');
      
      const convertFormData = new FormData();
      convertFormData.append('file', file);
      
      const convertResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/convert-pdf-to-word`, {
        method: 'POST',
        body: convertFormData
      });

      if (!convertResponse.ok) {
        throw new Error('Failed to convert PDF to Word via HTTPS API');
      }

      const convertResult = await convertResponse.json();
      wordContent = convertResult.wordContent;
      
      console.log('✅ PDF converted to Word successfully via HTTPS API');
      console.log('📝 Extracted placeholders:', wordContent.placeholders);
    } catch (error) {
      console.error('❌ Error converting PDF to Word via HTTPS:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to convert PDF to Word via HTTPS API' },
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
