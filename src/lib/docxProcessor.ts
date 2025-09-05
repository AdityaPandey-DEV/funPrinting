import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

/**
 * Extract placeholders from DOCX content using regex
 * @param content - DOCX content as string
 * @returns string[] - Array of placeholder names
 */
export function extractPlaceholders(content: string): string[] {
  // Regex to find @placeholder patterns
  const placeholderRegex = /@([A-Za-z0-9_]+)/g;
  const matches = content.match(placeholderRegex);
  
  if (!matches) return [];
  
  // Extract unique placeholder names (without @ symbol)
  const placeholders = [...new Set(matches.map(match => match.substring(1)))];
  return placeholders;
}

/**
 * Convert @placeholder format to {placeholder} format for docxtemplater
 * @param content - DOCX content as string
 * @returns string - Content with converted placeholders
 */
export function convertPlaceholdersToDocxtemplater(content: string): string {
  // Replace @placeholder with {placeholder}
  return content.replace(/@([A-Za-z0-9_]+)/g, '{$1}');
}

/**
 * Fill DOCX template with data using docxtemplater
 * @param docxBuffer - DOCX file as Buffer
 * @param data - Object containing placeholder values
 * @returns Buffer - Filled DOCX as Buffer
 */
export function fillDocxTemplate(docxBuffer: Buffer, data: Record<string, any>): Buffer {
  try {
    console.log('Filling DOCX template with data:', data);
    
    // Load the DOCX file
    const zip = new PizZip(docxBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Set the template variables
    doc.setData(data);

    try {
      // Render the document
      doc.render();
    } catch (error: any) {
      console.error('Error rendering document:', error);
      throw new Error(`Failed to render document: ${error.message}`);
    }

    // Generate the output
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 4,
      },
    });

    console.log('DOCX template filled successfully');
    return buf;
  } catch (error) {
    console.error('Error filling DOCX template:', error);
    throw new Error('Failed to fill DOCX template');
  }
}

/**
 * Generate form schema from placeholders
 * @param placeholders - Array of placeholder names
 * @returns Array of form field objects
 */
export function generateFormSchema(placeholders: string[]): Array<{
  key: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}> {
  return placeholders.map(placeholder => {
    // Determine field type based on placeholder name
    let type = 'text';
    const label = placeholder.charAt(0).toUpperCase() + placeholder.slice(1).replace(/([A-Z])/g, ' $1');
    
    // Smart type detection based on common patterns
    if (placeholder.toLowerCase().includes('email')) {
      type = 'email';
    } else if (placeholder.toLowerCase().includes('phone') || placeholder.toLowerCase().includes('mobile')) {
      type = 'tel';
    } else if (placeholder.toLowerCase().includes('date')) {
      type = 'date';
    } else if (placeholder.toLowerCase().includes('number') || placeholder.toLowerCase().includes('amount') || placeholder.toLowerCase().includes('price')) {
      type = 'number';
    } else if (placeholder.toLowerCase().includes('description') || placeholder.toLowerCase().includes('message') || placeholder.toLowerCase().includes('note')) {
      type = 'textarea';
    }

    return {
      key: placeholder,
      type,
      label,
      required: true,
      placeholder: `Enter ${label.toLowerCase()}`
    };
  });
}

/**
 * Validate form data against schema
 * @param data - Form data object
 * @param schema - Form schema array
 * @returns { isValid: boolean, errors: string[] }
 */
export function validateFormData(data: Record<string, any>, schema: Array<{ key: string; type: string; required: boolean }>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const field of schema) {
    const value = data[field.key];
    
    if (field.required && (!value || value.toString().trim() === '')) {
      errors.push(`${field.key} is required`);
      continue;
    }

    if (value && value.toString().trim() !== '') {
      // Type-specific validation
      switch (field.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(`${field.key} must be a valid email address`);
          }
          break;
        case 'tel':
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
            errors.push(`${field.key} must be a valid phone number`);
          }
          break;
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`${field.key} must be a valid number`);
          }
          break;
        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push(`${field.key} must be a valid date`);
          }
          break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
