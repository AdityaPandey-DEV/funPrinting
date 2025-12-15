/**
 * File Validator Utility
 * Validates files before printing to prevent errors
 */

import * as fs from 'fs';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const MIN_FILE_SIZE = 500; // Minimum file size in bytes (500 bytes - increased for fail-safe)
const MAX_FILE_SIZE = 100 * 1024 * 1024; // Maximum file size (100 MB)
const PDF_MAGIC_BYTES = Buffer.from('%PDF');

/**
 * Validate that file exists
 */
export function validateFileExists(filePath: string): ValidationResult {
  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      errors: [`File does not exist: ${filePath}`],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate file size (minimum and maximum size check)
 */
export function validateFileSize(filePath: string, minSize: number = MIN_FILE_SIZE, maxSize: number = MAX_FILE_SIZE): ValidationResult {
  try {
    const stats = fs.statSync(filePath);
    
    if (stats.size < minSize) {
      return {
        valid: false,
        errors: [`File size too small: ${stats.size} bytes (minimum: ${minSize} bytes)`],
      };
    }

    if (stats.size > maxSize) {
      return {
        valid: false,
        errors: [`File size too large: ${stats.size} bytes (maximum: ${maxSize} bytes)`],
      };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [`Error checking file size: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Validate PDF header (magic bytes)
 */
export function validatePDFHeader(filePath: string): ValidationResult {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    if (!buffer.equals(PDF_MAGIC_BYTES)) {
      return {
        valid: false,
        errors: [`Invalid PDF header. Expected '%PDF', got: ${buffer.toString('utf8', 0, 4)}`],
      };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [`Error reading PDF header: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Combined file validation
 * Validates file existence, size, and PDF header
 */
export function validateFile(filePath: string, minSize: number = MIN_FILE_SIZE): ValidationResult {
  const errors: string[] = [];

  // Check file exists
  const existsResult = validateFileExists(filePath);
  if (!existsResult.valid) {
    errors.push(...existsResult.errors);
    return { valid: false, errors };
  }

  // Check file size
  const sizeResult = validateFileSize(filePath, minSize);
  if (!sizeResult.valid) {
    errors.push(...sizeResult.errors);
  }

  // Check PDF header
  const headerResult = validatePDFHeader(filePath);
  if (!headerResult.valid) {
    errors.push(...headerResult.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

