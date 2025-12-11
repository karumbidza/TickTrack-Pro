import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['REPAIR', 'MAINTENANCE', 'INSPECTION', 'INSTALLATION', 'REPLACEMENT', 'EMERGENCY', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build where clause based on user role
    let whereClause: any = {}
    
    if (session.user.role === 'END_USER') {
      // End users see only their own tickets
      whereClause.userId = session.user.id
    } else if (['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(session.user.role)) {
      // Admins see tickets for their tenant and type
      whereClause.tenantId = session.user.tenantId
      
      if (session.user.role !== 'TENANT_ADMIN') {
        // Specific admin roles see only their type
        const typeMap: Record<string, string> = {
          'IT_ADMIN': 'IT',
          'SALES_ADMIN': 'SALES',
          'RETAIL_ADMIN': 'RETAIL',
          'MAINTENANCE_ADMIN': 'MAINTENANCE',
          'PROJECTS_ADMIN': 'PROJECTS'
        }
        whereClause.type = typeMap[session.user.role]
      }
    } else if (session.user.role === 'CONTRACTOR') {
      // Contractors see assigned tickets
      whereClause.assignedToId = session.user.id
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            phone: true,
            contractorProfile: {
              select: {
                id: true,
                specialties: true,
                rating: true
              }
            }
          }
        },
        admin: {
          select: { id: true, name: true, email: true }
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            mimeType: true
          }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    logger.error('Tickets fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only END_USER can create tickets
    if (session.user.role !== 'END_USER') {
      return NextResponse.json({ 
        error: 'Only end users can create tickets. Admins create projects, contractors view assigned work.' 
      }, { status: 403 })
    }

    // End users must have a tenant association
    if (!session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user account' }, { status: 400 })
    }

    const userTenantId = session.user.tenantId

    const contentType = request.headers.get('content-type')
    let data: any
    let uploadedFiles: File[] = []

    // Check if it's FormData (with file uploads) or JSON
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      // Extract text fields
      data = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        type: formData.get('type') as string,
        priority: formData.get('priority') as string,
        reporterName: (formData.get('reporterName') as string) || null,
        reporterContact: (formData.get('reporterContact') as string) || null,
        ticketNumber: formData.get('ticketNumber') as string,
        department: (formData.get('department') as string) || 'MAINTENANCE',
        assetId: formData.get('assetId') ? (formData.get('assetId') as string) : null,
        categoryId: formData.get('categoryId') ? (formData.get('categoryId') as string) : null,
        location: (formData.get('location') as string) || null
      }

      // Get uploaded files
      uploadedFiles = formData.getAll('files') as File[]
      logger.debug('Uploaded files:', uploadedFiles.map(f => f.name))
      
    } else {
      data = await request.json()
    }

    // Validate required fields
    if (!data.title || !data.description || !data.type || !data.priority) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        ticketNumber: data.ticketNumber || `TK${Date.now()}`,
        reporterName: data.reporterName || null,
        reporterContact: data.reporterContact || null,
        department: data.department || 'MAINTENANCE',
        assetId: data.assetId || null,
        categoryId: data.categoryId || null,
        location: data.location || null,
        status: 'OPEN',
        userId: session.user.id,
        tenantId: userTenantId
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        asset: {
          select: { id: true, name: true, assetNumber: true, location: true }
        }
      }
    })

    // Create status history
    await prisma.statusHistory.create({
      data: {
        ticketId: ticket.id,
        toStatus: 'OPEN',
        changedById: session.user.id,
        reason: 'Ticket created'
      }
    })

    // Save uploaded files and create attachment records
    if (uploadedFiles.length > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tickets', ticket.id)
      await mkdir(uploadsDir, { recursive: true })

      for (const file of uploadedFiles) {
        try {
          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          
          // Create safe filename
          const timestamp = Date.now()
          const safeFilename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          const filePath = path.join(uploadsDir, safeFilename)
          
          await writeFile(filePath, buffer)
          
          // Determine attachment type from mime type
          const getAttachmentType = (mimeType: string): string => {
            if (mimeType.startsWith('image/')) return 'image'
            if (mimeType.startsWith('video/')) return 'video'
            if (mimeType.startsWith('audio/')) return 'audio'
            return 'document'
          }

          // Create attachment record in database
          await prisma.attachment.create({
            data: {
              filename: safeFilename,
              originalName: file.name,
              url: `/uploads/tickets/${ticket.id}/${safeFilename}`,
              mimeType: file.type || 'application/octet-stream',
              type: getAttachmentType(file.type || 'application/octet-stream'),
              size: file.size,
              ticketId: ticket.id,
              uploadedById: session.user.id
            }
          })
          
          logger.debug(`Saved file: ${safeFilename}`)
        } catch (fileError) {
          logger.error(`Error saving file ${file.name}:`, fileError)
        }
      }
    }

    // Find appropriate admin to assign based on ticket type
    const adminRoleMap: Record<string, string> = {
      'IT': 'IT_ADMIN',
      'SALES': 'SALES_ADMIN',
      'RETAIL': 'RETAIL_ADMIN',
      'MAINTENANCE': 'MAINTENANCE_ADMIN',
      'PROJECTS': 'PROJECTS_ADMIN',
      'GENERAL': 'TENANT_ADMIN'
    }

    const adminRole = adminRoleMap[data.type] || 'TENANT_ADMIN'
    
    const admin = await prisma.user.findFirst({
      where: {
        tenantId: userTenantId,
        role: adminRole as any,
        isActive: true
      }
    })

    if (admin) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { adminId: admin.id }
      })

      // Create notification for admin
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'ticket_assigned',
          title: 'New Ticket Assigned',
          message: `A new ${data.type} ticket has been assigned to you: ${data.title}`,
          data: { ticketId: ticket.id }
        }
      })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    logger.error('Ticket creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}