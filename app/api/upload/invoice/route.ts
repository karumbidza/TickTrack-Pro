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


    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json({ 
        message: 'Cloud storage not configured. Please contact administrator.' 
      }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const ticketId = formData.get('ticketId') as string

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    if (!ticketId) {
      return NextResponse.json({ message: 'Ticket ID required' }, { status: 400 })
    }

    // Validate file type - allow PDFs and common document/image formats
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        message: 'Only PDF, images (JPEG, PNG, GIF), Word, and Excel files are allowed' 
      }, { status: 400 })
    }

    // Validate file size (max 20MB for documents)
    if (!validateFileSize(file.size, 20)) {
      return NextResponse.json({ 
        message: 'File size exceeds 20MB limit' 
      }, { status: 400 })
    }

    // Get file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate filename with ticket ID prefix
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${ticketId}-${sanitizedFileName}`

    // Upload to R2
    const result = await uploadToR2(buffer, fileName, 'invoices', file.type)

    if (!result.success) {
      return NextResponse.json({ 
        message: result.error || 'Upload failed' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      fileUrl: result.url,
      message: 'File uploaded successfully' 
    })
  } catch (error) {
    console.error('Error uploading invoice:', error)
    return NextResponse.json(
      { message: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
