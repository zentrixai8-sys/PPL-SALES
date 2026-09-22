/**
 * Cloudinary File & Document Upload Service
 * Automatically uploads Images, PDFs, and Documents to Cloudinary
 * and returns the CDN URL to store in Supabase and Google Sheets.
 */

export const CLOUDINARY_CLOUD_NAME = 'dfbllmnld';
export const CLOUDINARY_UPLOAD_PRESET = 'PPL SALES';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format?: string;
  resourceType?: string;
  originalFilename?: string;
}

/**
 * Uploads a single file (image, PDF, doc) directly to Cloudinary
 * @param file The browser File object
 * @returns The secure CDN URL or null if upload fails
 */
export async function uploadToCloudinary(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    // Using 'auto' allows uploading images, pdfs, audio, raw documents seamlessly
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('Cloudinary Upload Failed:', errData);
      return null;
    }

    const data = await res.json();
    return data.secure_url || data.url || null;
  } catch (error) {
    console.error('Cloudinary Network/Upload Error:', error);
    return null;
  }
}

/**
 * Uploads multiple files in parallel to Cloudinary
 * @param files Array of File objects
 * @returns Array of uploaded secure URLs (skips any failed ones)
 */
export async function uploadMultipleToCloudinary(files: File[]): Promise<string[]> {
  const uploadPromises = files.map(file => uploadToCloudinary(file));
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => Boolean(url));
}
