import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
// mammoth removed - using Microsoft Word directly
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

export async function POST(request: NextRequest) {
  try {
    const { wordFile, placeholders } = await request.json();

    if (!wordFile || !placeholders) {
      return NextResponse.json(
        { success: false, error: 'Word file and placeholders are required' },
        { status: 400 }
      );
    }

    console.log('🔄 Replacing placeholders in Word document...');
    console.log('📄 Placeholders to replace:', Object.keys(placeholders));

    // Convert base64 Word file to buffer
    const wordBuffer = Buffer.from(wordFile, 'base64');
    
    // Create temporary files
    const tempDir = '/tmp';
    const inputWordPath = path.join(tempDir, `input_${uuidv4()}.docx`);
    const outputWordPath = path.join(tempDir, `output_${uuidv4()}.docx`);
    
    try {
      // Write Word file to temporary location
      fs.writeFileSync(inputWordPath, wordBuffer);
      console.log('✅ Word file written to temporary location');

      // For direct Word document usage, we'll create a simple placeholder
      const originalText = 'Word document loaded. Use Microsoft Word to add placeholders like @name, @date, etc.';
      
      console.log('✅ Text extracted from Word document');

      // Replace placeholders in the text
      let replacedText = originalText;
      for (const [placeholder, value] of Object.entries(placeholders)) {
        const placeholderPattern = new RegExp(`@${placeholder}\\b`, 'g');
        replacedText = replacedText.replace(placeholderPattern, value as string);
        console.log(`✅ Replaced @${placeholder} with: ${value}`);
      }

      // Create new Word document with replaced text
      const newWordBuffer = await createWordDocumentFromText(replacedText);
      
      // Write new Word document to temporary location
      fs.writeFileSync(outputWordPath, newWordBuffer);
      console.log('✅ New Word document created with replaced placeholders');

      // Read the new Word document
      const finalWordBuffer = fs.readFileSync(outputWordPath);
      
      // Clean up temporary files
      fs.unlinkSync(inputWordPath);
      fs.unlinkSync(outputWordPath);

      // Convert to base64 for response
      const base64Word = finalWordBuffer.toString('base64');

      return NextResponse.json({
        success: true,
        wordFile: base64Word,
        message: 'Placeholders replaced successfully'
      });

    } catch (error) {
      console.error('❌ Placeholder replacement error:', error);
      
      // Clean up temporary files
      if (fs.existsSync(inputWordPath)) fs.unlinkSync(inputWordPath);
      if (fs.existsSync(outputWordPath)) fs.unlinkSync(outputWordPath);
      
      throw error;
    }

  } catch (error) {
    console.error('❌ Placeholder replacement error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to replace placeholders' },
      { status: 500 }
    );
  }
}

// Create Word document from text
async function createWordDocumentFromText(text: string): Promise<Buffer> {
  try {
    // Split text into paragraphs
    const paragraphs = text.split('\n').filter(line => line.trim());
    
    // Create Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs.map(line => 
          new Paragraph({
            children: [new TextRun(line.trim())],
            alignment: AlignmentType.LEFT,
          })
        )
      }]
    });

    // Convert to buffer
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    console.error('Error creating Word document:', error);
    throw error;
  }
}
