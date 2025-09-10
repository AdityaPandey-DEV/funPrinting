import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

/**
 * LibreOffice CLI wrapper for document conversion
 * Self-hosted alternative to Adobe PDF Services API
 */

/**
 * Convert PDF to DOCX using LibreOffice CLI
 * @param pdfBuffer - PDF file as Buffer
 * @returns Promise<Buffer> - DOCX file as Buffer
 */
export async function convertPdfToDocx(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    console.log('🔄 Converting PDF to DOCX using LibreOffice CLI...');
    console.log('PDF buffer size:', pdfBuffer.length, 'bytes');

    // Create temporary files
    const tempDir = path.join(process.cwd(), 'temp');
    const pdfId = uuidv4();
    const pdfPath = path.join(tempDir, `${pdfId}.pdf`);
    const docxPath = path.join(tempDir, `${pdfId}.docx`);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write PDF buffer to temporary file
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Convert PDF to DOCX using LibreOffice CLI
    const command = `soffice --headless --convert-to docx --outdir "${tempDir}" "${pdfPath}"`;
    console.log('Running LibreOffice command:', command);

    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('Warning')) {
      console.error('LibreOffice stderr:', stderr);
    }

    console.log('LibreOffice stdout:', stdout);

    // Check if DOCX file was created
    if (!fs.existsSync(docxPath)) {
      throw new Error('LibreOffice conversion failed - no output file created');
    }

    // Read the converted DOCX file
    const docxBuffer = fs.readFileSync(docxPath);

    // Clean up temporary files
    try {
      fs.unlinkSync(pdfPath);
      fs.unlinkSync(docxPath);
    } catch (cleanupError) {
      console.warn('Warning: Could not clean up temporary files:', cleanupError);
    }

    console.log('✅ PDF to DOCX conversion successful using LibreOffice CLI');
    console.log('DOCX buffer size:', docxBuffer.length, 'bytes');
    return docxBuffer;

  } catch (error) {
    console.error('❌ Error converting PDF to DOCX with LibreOffice:', error);
    throw new Error(`LibreOffice conversion failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Convert DOCX to PDF using LibreOffice CLI
 * @param docxBuffer - DOCX file as Buffer
 * @returns Promise<Buffer> - PDF file as Buffer
 */
export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  try {
    console.log('🔄 Converting DOCX to PDF using LibreOffice CLI...');
    console.log('DOCX buffer size:', docxBuffer.length, 'bytes');

    // Create temporary files
    const tempDir = path.join(process.cwd(), 'temp');
    const docxId = uuidv4();
    const docxPath = path.join(tempDir, `${docxId}.docx`);
    const pdfPath = path.join(tempDir, `${docxId}.pdf`);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write DOCX buffer to temporary file
    fs.writeFileSync(docxPath, docxBuffer);

    // Convert DOCX to PDF using LibreOffice CLI
    const command = `soffice --headless --convert-to pdf --outdir "${tempDir}" "${docxPath}"`;
    console.log('Running LibreOffice command:', command);

    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('Warning')) {
      console.error('LibreOffice stderr:', stderr);
    }

    console.log('LibreOffice stdout:', stdout);

    // Check if PDF file was created
    if (!fs.existsSync(pdfPath)) {
      throw new Error('LibreOffice conversion failed - no output file created');
    }

    // Read the converted PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Clean up temporary files
    try {
      fs.unlinkSync(docxPath);
      fs.unlinkSync(pdfPath);
    } catch (cleanupError) {
      console.warn('Warning: Could not clean up temporary files:', cleanupError);
    }

    console.log('✅ DOCX to PDF conversion successful using LibreOffice CLI');
    console.log('PDF buffer size:', pdfBuffer.length, 'bytes');
    return pdfBuffer;

  } catch (error) {
    console.error('❌ Error converting DOCX to PDF with LibreOffice:', error);
    throw new Error(`LibreOffice conversion failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if LibreOffice CLI is available
 * @returns Promise<boolean> - True if LibreOffice is available
 */
export async function isLibreOfficeAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('soffice --version');
    console.log('✅ LibreOffice CLI is available:', stdout.trim());
    return true;
  } catch (error) {
    console.error('❌ LibreOffice CLI is not available:', error);
    return false;
  }
}

/**
 * Get LibreOffice version information
 * @returns Promise<string> - Version string
 */
export async function getLibreOfficeVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync('soffice --version');
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get LibreOffice version: ${error instanceof Error ? error.message : String(error)}`);
  }
}
