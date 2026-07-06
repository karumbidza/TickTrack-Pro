import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomBytes } from 'crypto'

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
 * Upload a file to Cloudflare R2 (PRIVATE bucket).
 *
 * Objects are stored under a tenant-scoped key (`t/<tenantId>/<folder>/...`) so
 * the authenticated file route can authorize access by key prefix. When no
 * tenantId is given the object is stored under `public/<folder>/...`.
 *
 * The returned `url` is an in-app access path (`/api/files/<key>`) served by the
 * authenticated file route — it is NOT a public bucket URL. Store this value.
 *
 * @param file - The file buffer to upload
 * @param fileName - The desired file name
 * @param folder - The folder path (e.g., 'assets', 'invoices', 'pop')
 * @param contentType - The MIME type of the file
 * @param tenantId - Owning tenant; omit only for genuinely public/system objects
 */
export async function uploadToR2(
  file: Buffer,
  fileName: string,
  folder: string,
  contentType: string,
  tenantId?: string | null
): Promise<UploadResult> {
  try {
    // Generate a tenant-scoped, hard-to-guess key.
    const timestamp = Date.now()
    const randomSuffix = randomBytes(6).toString('hex')
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const scope = tenantId ? `t/${tenantId}` : 'public'
    const key = `${scope}/${folder}/${timestamp}-${randomSuffix}-${sanitizedName}`

    // Upload to R2 (bucket is private; no public-read ACL)
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })

    await s3Client.send(command)

    return {
      success: true,
      url: fileAccessUrl(key),
      key,
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
 * The in-app access path for an object key. Files are served through the
 * authenticated /api/files route (presigned redirect), never a public URL.
 */
export function fileAccessUrl(key: string): string {
  return `/api/files/${key}`
}

/**
 * Extract the R2 object key from any stored form:
 * - new app path:      /api/files/<key>
 * - legacy public URL: <R2_PUBLIC_URL>/<key>
 * - a raw key
 * Returns null if it cannot be resolved.
 */
export function getKeyFromUrl(url: string): string | null {
  if (!url) return null
  if (url.startsWith('/api/files/')) {
    return url.slice('/api/files/'.length)
  }
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return url.replace(`${R2_PUBLIC_URL}/`, '')
  }
  // Already a bare key (no scheme, no leading slash)
  if (!url.includes('://') && !url.startsWith('/')) {
    return url
  }
  return null
}

// A safe object key: at least folder/file, only safe chars. Traversal ("..") and
// empty segments ("//") are rejected separately. This also accepts legacy keys
// minted before tenant scoping (e.g. "assets/..."), which are treated as
// untenanted by keyTenantId().
const KEY_PATTERN = /^[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)+$/

export function isValidObjectKey(key: string): boolean {
  if (!key || key.includes('..') || key.includes('//')) return false
  return KEY_PATTERN.test(key)
}

/**
 * The tenant id encoded in a tenant-scoped key (`t/<tenantId>/...`), or null for
 * `public/...` keys and legacy keys minted before tenant scoping existed.
 */
export function keyTenantId(key: string): string | null {
  const m = key.match(/^t\/([a-zA-Z0-9_-]+)\//)
  return m ? m[1] : null
}

/**
 * Generate a short-lived presigned GET URL for a private object.
 * @param expiresInSeconds - default 300s (5 min)
 */
export async function getSignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds })
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
