import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only admins can upload POPs
    const adminRoles = ['TENANT_ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!session?.user || !adminRoles.includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'payments')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `POP-${timestamp}-${sanitizedFileName}`
    const filePath = join(uploadsDir, fileName)

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Return public URL
    const url = `/uploads/payments/${fileName}`

    return NextResponse.json({ 
      url,
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
