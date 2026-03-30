// Utility for handling file uploads

/**
 * Uploads an image to Cloudinary using an unsigned upload preset.
 * 
 * NOTE FOR PRODUCTION: Never expose your Cloudinary API Secret in frontend React code.
 * Instead, configure an "Unsigned Upload Preset" in your Cloudinary Dashboard
 * (Settings -> Upload -> Add upload preset -> Signing Mode: Unsigned).
 * 
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export async function uploadImageToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'teachconnect_preset';

  if (!cloudName) {
    throw new Error('Cloudinary Cloud Name is missing from .env');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to upload image');
    }

    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}
