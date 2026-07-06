import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { uploadToR2, isR2Configured, validateFileSize, verifyFileSignature } from '@/lib/r2-storage'

const ASSET_UPLOAD_ROLES = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']

// Route segment config for large file uploads (100MB for videos)
export const maxDuration = 300 // 5 minutes timeout for large uploads
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    // Asset images are managed from the admin asset register.
    if (!authCtx.isSuperAdmin && !ASSET_UPLOAD_ROLES.includes(role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json({ 
        message: 'Cloud storage not configured. Please contact administrator.' 
      }, { status: 500 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const assetId = formData.get('assetId') as string | null

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No files uploaded' }, { status: 400 })
    }

    const uploadedUrls: string[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        // Validate declared type against an explicit allowlist (no SVG — XSS risk).
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          errors.push(`${file.name}: Only JPEG, PNG, GIF, WEBP or BMP images are allowed`)
          continue
        }

        // Validate file size (max 10MB)
        if (!validateFileSize(file.size, 10)) {
          errors.push(`${file.name}: File size exceeds 10MB limit`)
          continue
        }

        // Get file buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Verify actual bytes match the declared type (client MIME is not trusted).
        if (!verifyFileSignature(buffer, file.type)) {
          errors.push(`${file.name}: File content does not match its declared image type`)
          continue
        }

        // Generate filename with asset ID prefix
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]*$/, '')
        const fileName = `${assetId || 'temp'}-${sanitizedName}.${extension}`

        // Upload to R2
        const result = await uploadToR2(buffer, fileName, 'assets', file.type)

        if (result.success && result.url) {
          uploadedUrls.push(result.url)
        } else {
          errors.push(`${file.name}: ${result.error || 'Upload failed'}`)
        }
      } catch (fileError) {
        console.error(`Error uploading file ${file.name}:`, fileError)
        errors.push(`${file.name}: Upload failed`)
      }
    }

    if (uploadedUrls.length === 0 && errors.length > 0) {
      return NextResponse.json({ 
        message: 'All uploads failed',
        errors 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      urls: uploadedUrls,
      errors: errors.length > 0 ? errors : undefined,
      message: `${uploadedUrls.length} file(s) uploaded successfully` 
    })
  } catch (error) {
    console.error('Error uploading asset images:', error)
    return NextResponse.json(
      { message: 'Failed to upload files' },
      { status: 500 }
    )
  }
}
