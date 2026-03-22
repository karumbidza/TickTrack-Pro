import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { uploadToR2, isR2Configured, validateFileType, validateFileSize } from '@/lib/r2-storage'

// Route segment config for large file uploads (100MB for videos)
export const maxDuration = 300 // 5 minutes timeout for large uploads
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
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
        // Validate file type (images only)
        if (!validateFileType(file.type, ['image/'])) {
          errors.push(`${file.name}: Only image files are allowed`)
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
