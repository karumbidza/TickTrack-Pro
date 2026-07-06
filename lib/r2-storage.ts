import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'ticktrack-pro'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!

// Initialize S3 Client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export interface UploadResult {
  success: boolean
  url?: string
  key?: string
  error?: string
}

/**
 * Upload a file to Cloudflare R2
 * @param file - The file buffer to upload
 * @param fileName - The desired file name
 * @param folder - The folder path (e.g., 'assets', 'invoices', 'tickets')
 * @param contentType - The MIME type of the file
 */
export async function uploadToR2(
  file: Buffer,
  fileName: string,
  folder: string,
  contentType: string
): Promise<UploadResult> {
  try {
    // Generate unique key with folder structure
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `${folder}/${timestamp}-${randomSuffix}-${sanitizedName}`

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })

    await s3Client.send(command)

    // Return the public URL
    const publicUrl = `${R2_PUBLIC_URL}/${key}`

    return {
      success: true,
      url: publicUrl,
      key: key,
    }
  } catch (error) {
    console.error('[R2] Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

/**
 * Delete a file from Cloudflare R2
 * @param key - The object key to delete
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })

    await s3Client.send(command)
    return true
  } catch (error) {
    console.error('[R2] Delete error:', error)
    return false
  }
}

/**
 * Extract the R2 key from a public URL
 * @param url - The public URL of the file
 */
export function getKeyFromUrl(url: string): string | null {
  if (!url.startsWith(R2_PUBLIC_URL)) {
    return null
  }
  return url.replace(`${R2_PUBLIC_URL}/`, '')
}

/**
 * Validate file type
 * @param contentType - The MIME type to validate
 * @param allowedTypes - Array of allowed MIME type prefixes
 */
export function validateFileType(contentType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => contentType.startsWith(type))
}

/**
 * Validate file size
 * @param size - File size in bytes
 * @param maxSizeMB - Maximum allowed size in MB
 */
export function validateFileSize(size: number, maxSizeMB: number): boolean {
  return size <= maxSizeMB * 1024 * 1024
}

// Known file signatures ("magic bytes"). A client-supplied MIME type is not
// trustworthy, so we verify the buffer's leading bytes against the declared type.
// Types absent from this map (notably image/svg+xml and text/html) are rejected,
// which prevents storing active content that would be served from the R2 domain.
const MAGIC_BYTES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF container (WEBP verified separately)
  'image/bmp': [[0x42, 0x4d]], // BM
  'application/msword': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]], // OLE2
  'application/vnd.ms-excel': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4b, 0x03, 0x04]], // PK (zip)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4b, 0x03, 0x04]],
}

/**
 * Verify a file's actual bytes match its declared MIME type. Returns false for
 * any type we do not have a signature for (fail closed), and for content whose
 * leading bytes do not match. `image/webp` additionally requires the WEBP tag.
 */
export function verifyFileSignature(buffer: Buffer, declaredType: string): boolean {
  const signatures = MAGIC_BYTES[declaredType]
  if (!signatures) return false
  const matches = signatures.some(sig => sig.every((byte, i) => buffer[i] === byte))
  if (!matches) return false
  if (declaredType === 'image/webp') {
    // Bytes 8..11 must spell "WEBP" inside the RIFF container.
    return buffer.slice(8, 12).toString('ascii') === 'WEBP'
  }
  return true
}

// Export configuration for checking if R2 is configured
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL)
}
