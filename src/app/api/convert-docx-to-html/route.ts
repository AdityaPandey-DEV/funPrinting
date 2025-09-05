import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const { docxBuffer } = await request.json();

    if (!docxBuffer) {
      return NextResponse.json(
        { error: 'Document buffer is required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(docxBuffer, 'base64');

    // Convert DOCX to HTML using mammoth with custom styling
    const result = await mammoth.convertToHtml({ buffer }, {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh",
        "p[style-name='Quote'] => blockquote:fresh",
        "p[style-name='Intense Quote'] => blockquote.intense:fresh",
        "p[style-name='List Paragraph'] => li:fresh",
        "p[style-name='Caption'] => p.caption:fresh",
        "p[style-name='Footnote Text'] => p.footnote:fresh"
      ],
      convertImage: mammoth.images.imgElement(function(image) {
        return image.read("base64").then(function(imageBuffer) {
          return {
            src: "data:" + image.contentType + ";base64," + imageBuffer
          };
        });
      })
    });

    const html = result.value;

    // Add custom CSS styling to make it look more like a Word document
    const styledHtml = `
      <style>
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          margin: 0;
          padding: 0;
        }
        .document-content {
          max-width: 8.5in;
          margin: 0 auto;
          padding: 1in;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          min-height: 11in;
        }
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Calibri', sans-serif;
          margin-top: 0;
          margin-bottom: 12pt;
          color: #2F5496;
        }
        h1 { font-size: 18pt; font-weight: bold; }
        h2 { font-size: 16pt; font-weight: bold; }
        h3 { font-size: 14pt; font-weight: bold; }
        h4 { font-size: 12pt; font-weight: bold; }
        h5 { font-size: 11pt; font-weight: bold; }
        h6 { font-size: 10pt; font-weight: bold; }
        p {
          margin: 0 0 12pt 0;
          text-align: justify;
        }
        p.title {
          font-size: 20pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 24pt;
        }
        p.subtitle {
          font-size: 14pt;
          text-align: center;
          margin-bottom: 18pt;
          color: #666;
        }
        blockquote {
          margin: 12pt 0;
          padding-left: 24pt;
          border-left: 3px solid #2F5496;
          font-style: italic;
        }
        blockquote.intense {
          background-color: #f8f9fa;
          padding: 12pt;
          border-left: 6px solid #2F5496;
        }
        ul, ol {
          margin: 12pt 0;
          padding-left: 24pt;
        }
        li {
          margin: 6pt 0;
        }
        strong {
          font-weight: bold;
        }
        em {
          font-style: italic;
        }
        img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 12pt auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 12pt 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8pt;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .caption {
          font-size: 10pt;
          color: #666;
          text-align: center;
          margin-top: 6pt;
        }
        .footnote {
          font-size: 10pt;
          color: #666;
        }
        /* Placeholder highlighting */
        .placeholder {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 2px 4px;
          border-radius: 3px;
          font-weight: bold;
          color: #856404;
        }
      </style>
      <div class="document-content">
        ${html}
      </div>
    `;

    // Highlight placeholders in the HTML
    const placeholderRegex = /@([A-Za-z0-9_]+)/g;
    const highlightedHtml = styledHtml.replace(placeholderRegex, '<span class="placeholder">@$1</span>');

    console.log('📄 DOCX converted to HTML with styling');

    return NextResponse.json({
      success: true,
      html: highlightedHtml,
      message: 'Document converted to HTML successfully'
    });

  } catch (error) {
    console.error('Error converting DOCX to HTML:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to convert document to HTML',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
