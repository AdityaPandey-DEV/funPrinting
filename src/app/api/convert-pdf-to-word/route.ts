import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { convertPdfToDocx } from '@/lib/cloudmersive';
import { convertPdfToDocx as libreOfficePdfToDocx, isLibreOfficeAvailable } from '@/lib/libreoffice';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Check if Cloudmersive API key is available
    const hasCloudmersiveKey = process.env.CLOUDMERSIVE_API_KEY;
    const hasLibreOffice = await isLibreOfficeAvailable();

    let conversionResult;
    
    if (hasCloudmersiveKey) {
      // Use Cloudmersive as primary conversion method
      console.log('🔄 Using Cloudmersive API for PDF to DOCX conversion...');
      try {
        conversionResult = await cloudmersiveConversion(buffer);
      } catch (cloudmersiveError) {
        console.error('❌ Cloudmersive conversion failed:', cloudmersiveError);
        console.log('❌ No fallback available - LibreOffice cannot convert PDF to DOCX');
        
        // Check if it's a FlateDecode compression issue
        const errorMessage = cloudmersiveError instanceof Error ? cloudmersiveError.message : String(cloudmersiveError);
        if (errorMessage.includes('FlateDecode compression')) {
          throw new Error(`PDF conversion failed: This PDF uses FlateDecode compression which Cloudmersive cannot process. Please try with a simpler PDF or convert it to a different format first.`);
        } else if (errorMessage.includes('Unable to process input document')) {
          // Check if PDF has FlateDecode compression
          const pdfContent = buffer.toString('ascii', 0, Math.min(1000, buffer.length));
          const hasFlateDecode = pdfContent.includes('/FlateDecode');
          
          if (hasFlateDecode) {
            throw new Error(`PDF conversion failed: This PDF uses FlateDecode compression which Cloudmersive cannot process. Please try with a simpler PDF or convert it to a different format first.`);
          } else {
            throw new Error(`PDF conversion failed: This PDF cannot be processed by Cloudmersive. It may be password-protected, contain only images, or be in an unsupported format. Please try with a different PDF.`);
          }
        } else {
          throw new Error(`PDF conversion failed: ${errorMessage}. Please ensure the PDF is valid and contains text.`);
        }
      }
    } else {
      // No conversion tools available
      console.log('❌ No conversion tools available');
      throw new Error('No PDF conversion tools available. Please configure CLOUDMERSIVE_API_KEY.');
    }
    
    return NextResponse.json(conversionResult);

  } catch (error) {
    console.error('PDF to Word conversion error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide specific error messages based on the error type
    let userMessage = 'PDF conversion failed. ';
    if (errorMessage.includes('PDF file is too small')) {
      userMessage += 'The PDF file appears to be corrupted or empty.';
    } else if (errorMessage.includes('not a valid PDF')) {
      userMessage += 'The file is not a valid PDF format.';
    } else if (errorMessage.includes('Unable to process input document')) {
      userMessage += 'The PDF cannot be processed. It may be password-protected, contain only images, use FlateDecode compression, or be in an unsupported format.';
    } else if (errorMessage.includes('FlateDecode compression')) {
      userMessage += 'This PDF uses FlateDecode compression which Cloudmersive cannot process. Please try with a simpler PDF or convert it to a different format first.';
    } else if (errorMessage.includes('This PDF uses FlateDecode compression')) {
      userMessage += 'This PDF uses FlateDecode compression which Cloudmersive cannot process. Please try with a simpler PDF or convert it to a different format first.';
    } else if (errorMessage.includes('API key')) {
      userMessage += 'Invalid Cloudmersive API key. Please check your configuration.';
    } else if (errorMessage.includes('quota')) {
      userMessage += 'API quota exceeded. Please try again later.';
    } else {
      userMessage += 'Please ensure the PDF is valid and contains text.';
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to convert PDF to Word',
        details: errorMessage,
        message: userMessage
      },
      { status: 500 }
    );
  }
}

// Cloudmersive PDF to DOCX conversion
async function cloudmersiveConversion(pdfBuffer: Buffer) {
  try {
    console.log('🚀 Using Cloudmersive API for PDF to DOCX conversion...');
    console.log('📄 Processing PDF buffer of size:', pdfBuffer.length, 'bytes');
    
    // First, try to extract text directly from PDF (more reliable)
    console.log('📖 Extracting text directly from PDF...');
    const { extractTextFromPdf } = await import('@/lib/cloudmersive');
    const pdfTextResponse = await extractTextFromPdf(pdfBuffer);
    console.log('📄 PDF text extraction response:', pdfTextResponse.substring(0, 500));
    
    // Parse the JSON response to get the actual text
    let pdfText = '';
    try {
      const parsedResponse = JSON.parse(pdfTextResponse);
      if (parsedResponse.Successful && parsedResponse.TextResult) {
        pdfText = parsedResponse.TextResult;
        console.log('📄 Parsed PDF text successfully, length:', pdfText.length);
        console.log('📄 PDF text preview:', pdfText.substring(0, 500));
      } else {
        console.log('⚠️ PDF text extraction response indicates failure');
        pdfText = pdfTextResponse; // Fallback to raw response
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse PDF text as JSON, using raw response');
      pdfText = pdfTextResponse; // Fallback to raw response
    }
    
    // Also convert PDF to DOCX for download purposes
    const docxBuffer = await convertPdfToDocx(pdfBuffer);
    console.log('✅ DOCX conversion successful for download');
    console.log('📄 Generated DOCX buffer size:', docxBuffer.length, 'bytes');
    
    if (pdfText.length > 0) {
      // Use PDF text as the primary content source
      console.log('✅ Using PDF text as primary content source');
      
      // Extract placeholders from PDF text
      const placeholderRegex = /@([A-Za-z0-9_]+)/g;
      const placeholders = [...new Set(
        (pdfText.match(placeholderRegex) || [])
          .map(match => match.substring(1))
      )];
      
      console.log('📝 Extracted placeholders from PDF text:', placeholders);
      
      // Split content into paragraphs
      const lines = pdfText.split('\n').filter(line => line.trim().length > 0);
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
      
      // Create a proper DOCX file with actual content
      console.log('📝 Creating proper DOCX file with extracted content...');
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs.map(p => {
            if (p.isPlaceholder) {
              return new Paragraph({
                children: [
                  new TextRun({
                    text: p.text,
                    bold: true,
                    color: "FF0000" // Red color for placeholders
                  })
                ]
              });
            } else if (p.style === 'heading') {
              return new Paragraph({
                heading: p.level === 1 ? HeadingLevel.HEADING_1 : 
                         p.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
                children: [
                  new TextRun({
                    text: p.text,
                    bold: true,
                    size: p.level === 1 ? 32 : p.level === 2 ? 28 : 24
                  })
                ]
              });
            } else {
              return new Paragraph({
                children: [
                  new TextRun({
                    text: p.text,
                    size: 24
                  })
                ]
              });
            }
          })
        }]
      });

      // Generate the proper DOCX buffer
      const properDocxBuffer = await Packer.toBuffer(doc);
      console.log('✅ Created proper DOCX file with content, size:', properDocxBuffer.length, 'bytes');

      // Create response with PDF text content and proper DOCX
      return {
        success: true,
        wordContent: {
          paragraphs: paragraphs,
          tables: [],
          totalParagraphs: paragraphs.length,
          placeholders: placeholders,
          conversionMethod: 'cloudmersive-pdf-text',
          docxBuffer: properDocxBuffer.toString('base64'), // Use the proper DOCX
          fullHtml: `<div class="prose"><p>${pdfText.replace(/\n/g, '</p><p>')}</p></div>`
        },
        message: 'PDF text extracted and proper DOCX file created successfully',
        conversionMethod: 'cloudmersive-pdf-text'
      };
    }
    
    // Extract content from DOCX using mammoth library with HTML output for better formatting
    console.log('📖 Parsing DOCX content using mammoth with HTML output...');
    console.log('📄 DOCX buffer size for mammoth:', docxBuffer.length, 'bytes');
    
    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    const docxHtml = result.value;
    const messages = result.messages;
    
    console.log('✅ DOCX HTML extraction successful');
    console.log('📄 Extracted HTML length:', docxHtml.length, 'characters');
    console.log('📄 Mammoth messages:', messages);
    console.log('📄 HTML preview (first 500 chars):', docxHtml.substring(0, 500));
    
    // Check if HTML is empty or very short
    if (docxHtml.length < 100) {
      console.log('⚠️ HTML content is very short, trying raw text extraction...');
      const rawResult = await mammoth.extractRawText({ buffer: docxBuffer });
      console.log('📄 Raw text length:', rawResult.value.length, 'characters');
      console.log('📄 Raw text preview:', rawResult.value.substring(0, 500));
      
      if (rawResult.value.length > docxHtml.length) {
        console.log('🔄 Using raw text instead of HTML');
        const docxText = rawResult.value;
        
        // Extract placeholders using regex
        const placeholderRegex = /@([A-Za-z0-9_]+)/g;
        const placeholders = [...new Set(
          (docxText.match(placeholderRegex) || [])
            .map(match => match.substring(1))
        )];
        
        console.log('📝 Extracted placeholders from raw text:', placeholders);
        
        // Split content into paragraphs for better display
        const lines = docxText.split('\n').filter(line => line.trim().length > 0);
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
        
        // Create response with raw text content
        return {
          success: true,
          wordContent: {
            paragraphs: paragraphs,
            tables: [],
            totalParagraphs: paragraphs.length,
            placeholders: placeholders,
            conversionMethod: 'cloudmersive',
            docxBuffer: docxBuffer.toString('base64'),
            fullHtml: `<div class="prose"><p>${docxText.replace(/\n/g, '</p><p>')}</p></div>`
          },
          message: 'PDF converted to DOCX using Cloudmersive API with raw text extraction',
          conversionMethod: 'cloudmersive'
        };
      } else {
        console.log('⚠️ Both HTML and raw text extraction failed, trying PDF text extraction...');
        
        // Fallback: Try to extract text directly from PDF
        try {
          const { extractTextFromPdf } = await import('@/lib/cloudmersive');
          const pdfText = await extractTextFromPdf(pdfBuffer);
          console.log('📄 PDF text extraction successful, length:', pdfText.length);
          
          if (pdfText.length > 0) {
            // Extract placeholders from PDF text
            const placeholderRegex = /@([A-Za-z0-9_]+)/g;
            const placeholders = [...new Set(
              (pdfText.match(placeholderRegex) || [])
                .map(match => match.substring(1))
            )];
            
            // Split content into paragraphs
            const lines = pdfText.split('\n').filter(line => line.trim().length > 0);
            const paragraphs = lines.map((line, index) => {
              const trimmedLine = line.trim();
              const placeholderMatch = trimmedLine.match(/@(\w+)/);
              const isPlaceholder = !!placeholderMatch;
              const placeholderName = isPlaceholder ? placeholderMatch[1] : '';

              let style = 'normal';
              let level = 1;

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
            
            return {
              success: true,
              wordContent: {
                paragraphs: paragraphs,
                tables: [],
                totalParagraphs: paragraphs.length,
                placeholders: placeholders,
                conversionMethod: 'cloudmersive-pdf-text',
                docxBuffer: docxBuffer.toString('base64'),
                fullHtml: `<div class="prose"><p>${pdfText.replace(/\n/g, '</p><p>')}</p></div>`
              },
              message: 'PDF text extracted directly using Cloudmersive API (DOCX conversion had issues)',
              conversionMethod: 'cloudmersive-pdf-text'
            };
          }
        } catch (pdfTextError) {
          console.error('❌ PDF text extraction also failed:', pdfTextError);
        }
      }
    }
    
    // Convert HTML to plain text for placeholder extraction
    const docxText = docxHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    
    // Extract placeholders using regex
    const placeholderRegex = /@([A-Za-z0-9_]+)/g;
    const placeholders = [...new Set(
      (docxText.match(placeholderRegex) || [])
        .map(match => match.substring(1))
    )];
    
    console.log('📝 Extracted placeholders:', placeholders);
    
    // Split content into paragraphs for better display
    const lines = docxText.split('\n').filter(line => line.trim().length > 0);
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
    
    // Create response with proper DOCX content
    return {
      success: true,
      wordContent: {
        paragraphs: paragraphs,
        tables: [],
        totalParagraphs: paragraphs.length,
        placeholders: placeholders,
        conversionMethod: 'cloudmersive',
        docxBuffer: docxBuffer.toString('base64'), // Include DOCX buffer for download
        fullHtml: docxHtml // Include full HTML for rich display
      },
      message: 'PDF converted to DOCX using Cloudmersive API with mammoth HTML extraction',
      conversionMethod: 'cloudmersive'
    };
    
  } catch (error) {
    console.error('❌ Cloudmersive conversion error:', error);
    throw error;
  }
}

// LibreOffice CLI conversion
async function libreOfficeConversion(pdfBuffer: Buffer) {
  try {
    console.log('🚀 Using LibreOffice CLI for PDF to DOCX conversion...');
    console.log('📄 Processing PDF buffer of size:', pdfBuffer.length, 'bytes');
    
    // Convert PDF to DOCX using LibreOffice CLI
    const docxBuffer = await libreOfficePdfToDocx(pdfBuffer);
    
    console.log('✅ LibreOffice conversion successful');
    console.log('📄 Generated DOCX buffer size:', docxBuffer.length, 'bytes');
    
    // Extract text from DOCX using mammoth library
    console.log('📖 Parsing DOCX content using mammoth...');
    
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    const docxText = result.value;
    const messages = result.messages;
    
    console.log('✅ DOCX text extraction successful');
    console.log('📄 Extracted text length:', docxText.length, 'characters');
    console.log('📄 Mammoth messages:', messages);
    
    // Extract placeholders using regex
    const placeholderRegex = /@([A-Za-z0-9_]+)/g;
    const placeholders = [...new Set(
      (docxText.match(placeholderRegex) || [])
        .map(match => match.substring(1))
    )];
    
    console.log('📝 Extracted placeholders:', placeholders);
    
    // Split content into paragraphs for better display
    const lines = docxText.split('\n').filter(line => line.trim().length > 0);
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
    
    // Create response with proper DOCX content
    return {
      success: true,
      wordContent: {
        paragraphs: paragraphs,
        tables: [],
        totalParagraphs: paragraphs.length,
        placeholders: placeholders,
        conversionMethod: 'libreoffice',
        docxBuffer: docxBuffer.toString('base64') // Include DOCX buffer for download
      },
      message: 'PDF converted to DOCX using LibreOffice CLI with mammoth text extraction',
      conversionMethod: 'libreoffice'
    };
    
  } catch (error) {
    console.error('❌ LibreOffice conversion error:', error);
    throw error;
  }
}

// Mock conversion for testing (when no real conversion tools are available)
async function mockConversion(pdfBuffer: Buffer) {
  console.log('🔄 Using mock conversion...');
  
  // Create a realistic Word document content based on your PDF
  const wordContent = `COMPUTER SCIENCE SYLLABUS

Department of Computer Science
Academic Year 2024-2025

COURSE OVERVIEW:
This course covers fundamental concepts in computer science including programming, data structures, algorithms, and software engineering principles.

COURSE OBJECTIVES:
1. To understand basic programming concepts
2. To learn data structures and algorithms
3. To develop problem-solving skills
4. To understand software engineering principles

TOPICS COVERED:
- Introduction to Programming
- Data Structures (Arrays, Linked Lists, Stacks, Queues)
- Algorithms (Sorting, Searching, Recursion)
- Object-Oriented Programming
- Database Management Systems
- Software Engineering
- Web Development
- Mobile Application Development

ASSESSMENT CRITERIA:
- Midterm Examination: 30%
- Final Examination: 40%
- Assignments and Projects: 20%
- Class Participation: 10%

STUDENT INFORMATION:
Name: @studentName
Roll Number: @rollNumber
Class: @className
Section: @section
Academic Year: @academicYear

INSTRUCTOR DETAILS:
Instructor Name: @instructorName
Office Hours: @officeHours
Email: @instructorEmail
Phone: @instructorPhone

COURSE SCHEDULE:
Week 1-2: Introduction to Programming
Week 3-4: Data Types and Variables
Week 5-6: Control Structures
Week 7-8: Functions and Arrays
Week 9-10: Object-Oriented Programming
Week 11-12: Data Structures
Week 13-14: Algorithms
Week 15-16: Final Project and Review

TEXTBOOKS:
1. "Introduction to Algorithms" by Cormen, Leiserson, Rivest, and Stein
2. "Data Structures and Algorithms in Java" by Goodrich and Tamassia
3. "Clean Code" by Robert Martin

REFERENCE MATERIALS:
- Online coding platforms
- Programming tutorials
- Academic papers and journals

GRADING SCALE:
A+: 95-100
A: 90-94
A-: 85-89
B+: 80-84
B: 75-79
B-: 70-74
C+: 65-69
C: 60-64
F: Below 60

ATTENDANCE POLICY:
Students must maintain at least 75% attendance to be eligible for final examination.

LATE SUBMISSION POLICY:
Assignments submitted after the due date will receive a 10% penalty per day.

ACADEMIC INTEGRITY:
All work must be original. Plagiarism will result in disciplinary action.

CONTACT INFORMATION:
For queries and clarifications, contact the instructor during office hours or via email.

This syllabus is subject to change with prior notice to students.`;

  // Parse the text into structured content
  const lines = wordContent.split('\n').filter(line => line.trim().length > 0);
  
  const paragraphs = lines.map((line, index) => {
    const trimmedLine = line.trim();
    // Check if line contains a placeholder (not just starts with @)
    const placeholderMatch = trimmedLine.match(/@(\w+)/);
    const isPlaceholder = !!placeholderMatch;
    const placeholderName = isPlaceholder ? placeholderMatch[1] : '';
    
    let style = 'normal';
    let level = 1;
    
    if (trimmedLine.length < 100 && trimmedLine.toUpperCase() === trimmedLine && !isPlaceholder) {
      style = 'heading';
      level = trimmedLine.includes(':') ? 3 : (trimmedLine.length < 50 ? 1 : 2);
    } else if (trimmedLine.match(/^\d+\./)) {
      style = 'list';
    }
    
    return {
      id: index + 1,
      text: trimmedLine,
      style: style,
      level: level,
      isPlaceholder: isPlaceholder,
      placeholderName: placeholderName
    };
  });
  
  // Create tables
  const tables = [
    {
      id: 1,
      title: "Lab Schedule",
      headers: ["Week", "Topic", "Duration", "Instructor"],
      rows: [
        ["Week 1", "Introduction to C", "2 hours", "@instructor1"],
        ["Week 2", "Variables & Data Types", "2 hours", "@instructor2"],
        ["Week 3", "Control Structures", "2 hours", "@instructor3"],
        ["Week 4", "Functions", "2 hours", "@instructor4"]
      ]
    },
    {
      id: 2,
      title: "Grading Criteria",
      headers: ["Component", "Weight", "Description"],
      rows: [
        ["Lab Performance", "40%", "Active participation and completion"],
        ["Lab Report", "30%", "Written documentation and analysis"],
        ["Viva Voce", "20%", "Oral examination of concepts"],
        ["Attendance", "10%", "Regular lab attendance"]
      ]
    }
  ];
  
  return {
    success: true,
    wordContent: {
    paragraphs: paragraphs,
    tables: tables,
    totalParagraphs: paragraphs.length,
      placeholders: paragraphs.filter(p => p.isPlaceholder).map(p => p.placeholderName),
      conversionMethod: 'mock'
    },
    message: 'PDF converted to Word using mock conversion (for testing)',
    conversionMethod: 'mock'
  };
}