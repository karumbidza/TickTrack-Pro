import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { uploadToR2, isR2Configured, validateFileSize } from '@/lib/r2-storage'

// Route segment config for large file uploads
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    // Only admins can upload POPs
    const adminRoles = ['TENANT_ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!adminRoles.includes(role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json({ 
        message: 'Cloud storage not configured. Please contact administrator.' 
      }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type - allow PDFs and images
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        message: 'Only PDF and image files (JPEG, PNG, GIF) are allowed' 
      }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (!validateFileSize(file.size, 10)) {
      return NextResponse.json({ 
        message: 'File size exceeds 10MB limit' 
      }, { status: 400 })
    }

    // Get file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate filename
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `POP-${sanitizedFileName}`

    // Upload to R2
    const result = await uploadToR2(buffer, fileName, 'payments', file.type)

    if (!result.success) {
      return NextResponse.json({ 
        message: result.error || 'Upload failed' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      url: result.url,
      message: 'Proof of Payment uploaded successfully' 
    })
  } catch (error) {
    console.error('Error uploading POP:', error)
    return NextResponse.json(
      { message: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
