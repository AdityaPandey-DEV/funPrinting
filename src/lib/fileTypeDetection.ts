/**
 * Utility functions for detecting file types from filenames
 * Used across the application for consistent file type detection
 */

/**
 * Detect MIME type from file extension in filename
 * @param fileName - The filename to analyze
 * @param url - Optional URL to extract extension from if filename doesn't have one
 * @returns MIME type string (e.g., 'application/pdf', 'image/jpeg')
 */
export function getFileTypeFromFilename(fileName: string, url?: string): string {
  const fileNameLower = fileName.toLowerCase();
  const urlLower = url?.toLowerCase() || '';
  
  // Extract extension from filename first
  const fileNameMatch = fileNameLower.match(/\.([a-z0-9]+)$/);
  if (fileNameMatch) {
    const ext = fileNameMatch[1];
    const mimeTypes: Record<string, string> = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text
      'txt': 'text/plain',
      'rtf': 'application/rtf',
    };
    
    if (mimeTypes[ext]) {
      return mimeTypes[ext];
    }
  }
  
  // Try to get extension from URL if filename didn't work
  if (url) {
    const urlMatch = urlLower.match(/\.([a-z0-9]+)(\?|$)/);
    if (urlMatch) {
      const ext = urlMatch[1];
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'bmp': 'image/bmp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      
      if (mimeTypes[ext]) {
        return mimeTypes[ext];
      }
    }
  }
  
  // Default fallback
  return 'application/octet-stream';
}

/**
 * Detect file type from an array of filenames
 * For multi-file orders, returns the most common type or first file's type
 * @param fileNames - Array of filenames
 * @param fileURLs - Optional array of file URLs
 * @returns Detected file type
 */
export function getFileTypeFromFileNames(
  fileNames: string[],
  fileURLs?: string[]
): string {
  if (!fileNames || fileNames.length === 0) {
    return 'application/octet-stream';
  }

  // Get types for all files
  const types = fileNames.map((name, idx) => {
    const url = fileURLs?.[idx];
    return getFileTypeFromFilename(name, url);
  });

  // Count occurrences of each type
  const typeCounts: Record<string, number> = {};
  types.forEach(type => {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  // Return the most common type, or first file's type if all are different
  const mostCommonType = Object.entries(typeCounts).reduce((a, b) => 
    typeCounts[a[0]] > typeCounts[b[0]] ? a : b
  );

  return mostCommonType[0] || types[0] || 'application/octet-stream';
}

