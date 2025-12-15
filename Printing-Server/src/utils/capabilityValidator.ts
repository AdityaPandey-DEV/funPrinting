/**
 * Capability Validator Utility
 * Validates print jobs against printer capabilities before printing
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate order against printer capabilities
 */
export function validateCapabilities(
  order: any,
  printer: any
): ValidationResult {
  const errors: string[] = [];

  if (!printer.capabilities) {
    // If no capabilities defined, skip validation (backward compatibility)
    return { valid: true, errors: [] };
  }

  const capabilities = printer.capabilities;
  const printingOptions = order.printingOptions;

  // Check page size
  if (capabilities.maxPaperSize) {
    const orderPageSize = printingOptions?.pageSize;
    const maxPaperSize = capabilities.maxPaperSize;

    // Paper size hierarchy: A3 > A4 > Letter
    const sizeOrder: Record<string, number> = {
      'A3': 3,
      'A4': 2,
      'Letter': 1,
    };

    const orderSizeValue = sizeOrder[orderPageSize] || 0;
    const maxSizeValue = sizeOrder[maxPaperSize] || 0;

    if (orderSizeValue > maxSizeValue) {
      errors.push(`Page size ${orderPageSize} exceeds printer maximum ${maxPaperSize}`);
    }
  }

  // Check color support
  if (printingOptions?.color === 'color' && capabilities.supportsColor === false) {
    errors.push('Order requires color printing but printer does not support color');
  }

  // Check duplex support
  if (printingOptions?.sided === 'double' && capabilities.supportsDuplex === false) {
    errors.push('Order requires duplex printing but printer does not support duplex');
  }

  // Check max copies
  if (capabilities.maxCopies && printingOptions?.copies > capabilities.maxCopies) {
    errors.push(`Order requires ${printingOptions.copies} copies but printer maximum is ${capabilities.maxCopies}`);
  }

  // Check supported page sizes
  if (capabilities.supportedPageSizes && capabilities.supportedPageSizes.length > 0) {
    const orderPageSize = printingOptions?.pageSize;
    if (!capabilities.supportedPageSizes.includes(orderPageSize)) {
      errors.push(`Page size ${orderPageSize} not supported. Supported sizes: ${capabilities.supportedPageSizes.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

