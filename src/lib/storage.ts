/**
 * Storage Abstraction Layer
 * 
 * Provides a unified interface for file storage operations across multiple providers.
 * Supports Oracle Cloud Object Storage and Cloudinary.
 */

export interface StorageProvider {
  uploadFile(buffer: Buffer, folder: string, mimetype?: string): Promise<string>;
  getFileUrl(fileUrl: string, filename?: string): string;
  getDownloadableFileUrl(fileUrl: string, filename?: string): string;
  deleteFile(identifier: string): Promise<void>;
}

// Import providers
import { CloudinaryProvider } from './storage/cloudinary';
import { OracleProvider } from './storage/oracle';

// Re-export helper functions that are provider-agnostic
export { getFileExtension, getMimeType } from './storage/utils';

let storageProvider: StorageProvider | null = null;

/**
 * Get the configured storage provider
 */
function getStorageProvider(): StorageProvider {
  if (storageProvider) {
    return storageProvider;
  }

  const provider = process.env.STORAGE_PROVIDER || 'cloudinary';

  switch (provider.toLowerCase()) {
    case 'oracle':
      storageProvider = new OracleProvider();
      console.log('✅ Using Oracle Cloud Object Storage');
      break;
    case 'cloudinary':
    default:
      storageProvider = new CloudinaryProvider();
      console.log('✅ Using Cloudinary Storage');
      break;
  }

  return storageProvider;
}

/**
 * Upload a file to the configured storage provider
 */
export const uploadFile = async (
  buffer: Buffer,
  folder: string = 'print-service',
  mimetype?: string
): Promise<string> => {
  const provider = getStorageProvider();
  return provider.uploadFile(buffer, folder, mimetype);
};

/**
 * Get a file URL (for display/embedding)
 */
export const getFileUrl = (fileUrl: string, filename: string = 'document'): string => {
  const provider = getStorageProvider();
  return provider.getFileUrl(fileUrl, filename);
};

/**
 * Get a downloadable file URL
 */
export const getDownloadableFileUrl = (
  fileUrl: string,
  filename: string = 'document'
): string => {
  const provider = getStorageProvider();
  return provider.getDownloadableFileUrl(fileUrl, filename);
};

/**
 * Delete a file from storage
 */
export const deleteFile = async (identifier: string): Promise<void> => {
  const provider = getStorageProvider();
  return provider.deleteFile(identifier);
};

// Export for backward compatibility (legacy function name)
export const uploadToCloudinary = uploadFile;
export const deleteFromCloudinary = deleteFile;

