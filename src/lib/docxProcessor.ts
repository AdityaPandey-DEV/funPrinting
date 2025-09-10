import PizZip from 'pizzip';

/**
 * Preprocess DOCX to directly replace @placeholder with form data
 * @param docxBuffer - DOCX file as Buffer
 * @param data - Form data to replace placeholders with
 * @returns Buffer - Preprocessed DOCX as Buffer
 */
export async function preprocessDocxTemplate(docxBuffer: Buffer, data: Record<string, any>): Promise<Buffer> {
  try {
    const zip = new PizZip(docxBuffer);
    
    // Get the document.xml file
    const documentXml = zip.file('word/document.xml');
    if (!documentXml) {
      throw new Error('Document XML not found in DOCX file');
    }
    
    let xmlContent = documentXml.asText();
    
    // Directly replace @placeholder with form data
    const placeholderRegex = /@([A-Za-z0-9_]+)/g;
    const originalContent = xmlContent;
    
    console.log('🔄 Preprocessing: Directly replacing @placeholders with form data');
    console.log('🔄 Original placeholders found:', originalContent.match(/@([A-Za-z0-9_]+)/g));
    console.log('🔄 Available form data:', data);
    
    // Replace each @placeholder with the corresponding form data
    xmlContent = xmlContent.replace(placeholderRegex, (match, placeholderName) => {
      const value = data[placeholderName] || data[placeholderName.toLowerCase()] || match;
      console.log(`🔄 Replacing ${match} with: "${value}"`);
      return value;
    });
    
    // Log a sample of the XML content to see the replacement
    const sampleContent = xmlContent.substring(0, 500);
    console.log('🔄 Sample XML content after replacement:', sampleContent);
    
    // Update the document.xml file
    zip.file('word/document.xml', xmlContent);
    
    // Generate the updated DOCX
    const updatedBuffer = zip.generate({ type: 'nodebuffer' });
    console.log('✅ DOCX preprocessing completed successfully');
    return updatedBuffer;
    
  } catch (error) {
    console.error('Error preprocessing DOCX template:', error);
    throw new Error('Failed to preprocess DOCX template');
  }
}

/**
 * Fill DOCX template with data using direct replacement with text length normalization
 * @param docxBuffer - DOCX file as Buffer
 * @param data - Object containing placeholder values
 * @returns Buffer - Filled DOCX as Buffer
 */
export async function fillDocxTemplate(docxBuffer: Buffer, data: Record<string, any>): Promise<Buffer> {
  try {
    console.log('Filling DOCX template with data:', data);
    console.log('DOCX buffer size:', docxBuffer.length, 'bytes');
    
    // Validate buffer
    if (!docxBuffer || docxBuffer.length === 0) {
      throw new Error('Invalid DOCX buffer: buffer is empty or null');
    }
    
    // Check if it's a valid DOCX file (should start with PK signature)
    if (docxBuffer.length < 4 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B) {
      throw new Error('Invalid DOCX file: file does not appear to be a valid ZIP/DOCX file');
    }
    
    // Normalize form data to prevent page count variations
    const normalizedData = normalizeFormData(data);
    console.log('📝 Normalized form data:', normalizedData);
    
    // Preprocess the DOCX to directly replace @placeholder with form data
    let processedBuffer = docxBuffer;
    try {
      console.log('🔄 Preprocessing DOCX template with direct replacement...');
      processedBuffer = await preprocessDocxTemplate(docxBuffer, normalizedData);
      console.log('✅ DOCX preprocessing completed successfully');
    } catch (preprocessError) {
      console.warn('⚠️ DOCX preprocessing failed, using original buffer:', preprocessError);
      // Continue with original buffer if preprocessing fails
    }
    
    // Since we're doing direct replacement in preprocessing, we can return the processed buffer directly
    console.log('✅ DOCX template filled successfully with direct replacement');
    return processedBuffer;
    
  } catch (error: any) {
    console.error('Error filling DOCX template:', error);
    throw new Error('Failed to fill DOCX template');
  }
}

/**
 * Normalize form data to prevent page count variations across devices
 * @param data - Raw form data
 * @returns Normalized form data
 */
function normalizeFormData(data: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Normalize text content to prevent page count variations
      let normalizedValue = value.trim();
      
      // Limit text length to prevent excessive page growth
      const maxLength = 500; // Reasonable limit for form fields
      if (normalizedValue.length > maxLength) {
        normalizedValue = normalizedValue.substring(0, maxLength) + '...';
        console.log(`⚠️ Truncated field ${key} from ${value.length} to ${maxLength} characters`);
      }
      
      // Normalize line breaks to prevent inconsistent wrapping
      normalizedValue = normalizedValue.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Limit consecutive line breaks to prevent excessive spacing
      normalizedValue = normalizedValue.replace(/\n{3,}/g, '\n\n');
      
      // Normalize spaces to prevent inconsistent spacing
      normalizedValue = normalizedValue.replace(/\s{2,}/g, ' ');
      
      normalized[key] = normalizedValue;
    } else {
      normalized[key] = value;
    }
  }
  
  return normalized;
}

/**
 * Extract placeholders from DOCX document
 * @param docxBuffer - DOCX file as Buffer
 * @returns string[] - Array of placeholder names
 */
export async function extractPlaceholders(docxBuffer: Buffer): Promise<string[]> {
  try {
    const zip = new PizZip(docxBuffer);
    const documentXml = zip.file('word/document.xml');
    
    if (!documentXml) {
      throw new Error('Document XML not found in DOCX file');
    }
    
    const xmlContent = documentXml.asText();
    
    // Find @placeholder patterns
    const placeholderRegex = /@([A-Za-z0-9_]+)/g;
    const matches = xmlContent.match(placeholderRegex);
    
    if (!matches) {
      return [];
    }
    
    // Extract unique placeholder names
    const placeholders = [...new Set(matches.map(match => match.substring(1)))];
    console.log('📝 Extracted placeholders:', placeholders);
    
    return placeholders;
    
  } catch (error) {
    console.error('Error extracting placeholders:', error);
    throw new Error('Failed to extract placeholders from DOCX');
  }
}

/**
 * Generate form schema from placeholders
 * @param placeholders - Array of placeholder names
 * @returns Object - Form schema for dynamic form generation
 */
export function generateFormSchema(placeholders: string[]): Record<string, any> {
  const schema: Record<string, any> = {};
  
  placeholders.forEach(placeholder => {
    schema[placeholder] = {
      type: 'string',
      label: placeholder.charAt(0).toUpperCase() + placeholder.slice(1),
      required: true,
      placeholder: `Enter ${placeholder}`
    };
  });
  
  return schema;
}

/**
 * Validate form data against schema
 * @param formData - Form data to validate
 * @param schema - Form schema
 * @returns Object - Validation result
 */
export function validateFormData(formData: Record<string, any>, schema: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  schema.forEach(field => {
    if (field.required && (!formData[field.key] || formData[field.key].trim() === '')) {
      errors.push(`${field.key} is required`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}