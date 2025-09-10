import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to get file extension from MIME type
export const getFileExtension = (mimeType: string): string => {
  const mimeToExt: { [key: string]: string } = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/rtf': '.rtf',
  };
  
  return mimeToExt[mimeType] || '.bin';
};

// Helper function to get MIME type from file extension
export const getMimeType = (extension: string): string => {
  const extToMime: { [key: string]: string } = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.rtf': 'application/rtf',
  };
  
  return extToMime[extension.toLowerCase()] || 'application/octet-stream';
};

export const uploadToCloudinary = async (file: Buffer, folder: string = 'print-service', mimetype?: string): Promise<string> => {
  try {
    console.log(`📤 Uploading file to Cloudinary (${file.length} bytes) to folder: ${folder}`);
    
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
      ).end(file);
    });

    if (!result.secure_url) {
      throw new Error('Upload succeeded but no URL returned');
    }

    return result.secure_url;
  } catch (error) {
    console.error('❌ Error uploading to Cloudinary:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Function to get a file URL with proper filename
export const getFileUrl = (cloudinaryUrl: string, filename: string = 'document'): string => {
  // If it's already a raw URL, we can serve it directly
  return cloudinaryUrl;
};

// Function to create a downloadable file URL
export const getDownloadableFileUrl = (cloudinaryUrl: string, filename: string = 'document'): string => {
  // For raw files, we can append a query parameter to force download
  return `${cloudinaryUrl}?download=${encodeURIComponent(filename)}`;
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};
