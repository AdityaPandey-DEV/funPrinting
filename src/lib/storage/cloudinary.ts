/**
 * Cloudinary Storage Provider
 * 
 * Implements the StorageProvider interface for Cloudinary
 */

import { v2 as cloudinary } from 'cloudinary';
import type { StorageProvider } from '../storage';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryProvider implements StorageProvider {
  async uploadFile(
    buffer: Buffer,
    folder: string = 'print-service',
    mimetype?: string
  ): Promise<string> {
    try {
      console.log(`📤 Uploading file to Cloudinary (${buffer.length} bytes) to folder: ${folder}`);
      
      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary configuration is missing. Please check your environment variables.');
      }
      
      // Always store as raw file for better compatibility
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'raw', // Always use raw for all file types
            public_id: `document_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('✅ Cloudinary upload successful:', result?.secure_url);
              resolve(result as { secure_url: string });
            }
          }
        ).end(buffer);
      });

      if (!result.secure_url) {
        throw new Error('Upload succeeded but no URL returned');
      }

      return result.secure_url;
    } catch (error) {
      console.error('❌ Error uploading to Cloudinary:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getFileUrl(fileUrl: string, filename: string = 'document'): string {
    // If it's already a raw URL, we can serve it directly
    return fileUrl;
  }

  getDownloadableFileUrl(fileUrl: string, filename: string = 'document'): string {
    // For raw files, we can append a query parameter to force download
    return `${fileUrl}?download=${encodeURIComponent(filename)}`;
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      throw error;
    }
  }
}

