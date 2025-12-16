import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const assetId = formData.get('assetId') as string | null

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No files uploaded' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'assets')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const uploadedUrls: string[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        // Validate file type (images only)
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name}: Only image files are allowed`)
          continue
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          errors.push(`${file.name}: File size exceeds 10MB limit`)
          continue
        }

        // Generate unique filename
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(2, 8)
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]*$/, '')
        const fileName = `${assetId || 'temp'}-${timestamp}-${randomSuffix}-${sanitizedName}.${extension}`
        const filePath = join(uploadsDir, fileName)

        // Write file
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        // Add to uploaded URLs
        uploadedUrls.push(`/uploads/assets/${fileName}`)
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
