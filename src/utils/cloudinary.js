/**
 * Cloudinary Upload Utility
 * Uses unsigned upload preset for browser-based uploads.
 * IMPORTANT: The upload preset in Cloudinary dashboard MUST be set to "Unsigned"
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

// Determine Cloudinary resource type based on MIME type
function getResourceType(file) {
  const mime = file.type || ''
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  // PDF, DOC, DOCX, PPT, PPTX, XLS etc. → raw
  return 'raw'
}

/**
 * Upload a file to Cloudinary and return its metadata.
 * @param {File} file
 * @returns {Promise<{url: string, originalFilename: string, format: string, bytes: number, resourceType: string}>}
 */
export async function uploadToCloudinary(file) {
  if (!file) throw new Error('No file provided for upload')

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env')
  }

  const resourceType = getResourceType(file)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`

  let response
  try {
    response = await fetch(url, { method: 'POST', body: formData })
  } catch (networkErr) {
    throw new Error('Network error — check your internet connection.')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    // Common Cloudinary errors
    const msg = data?.error?.message || ''
    if (msg.includes('upload_preset')) {
      throw new Error('Cloudinary upload preset not found or is not set to "Unsigned". Please check your Cloudinary dashboard.')
    }
    if (response.status === 401) {
      throw new Error('Cloudinary authentication failed. Make sure the upload preset is set to Unsigned.')
    }
    throw new Error(msg || `Upload failed (HTTP ${response.status})`)
  }

  return {
    url: data.secure_url,
    originalFilename: data.original_filename || file.name,
    format: (data.format || file.name.split('.').pop() || 'FILE').toUpperCase(),
    bytes: data.bytes || file.size,
    resourceType,
  }
}

/**
 * Format file size from bytes to human-readable string
 */
export function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
