import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadToR2, isR2Configured } from '@/lib/r2-storage'
import { logger } from '@/lib/logger'

// Route segment config for large file uploads (100MB for videos)
export const maxDuration = 300 // 5 minutes timeout for large uploads
export const dynamic = 'force-dynamic'

// GET - Fetch messages for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    const ticketId = params.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Verify user has access to this ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        userId: true,
        tenantId: true,
        assignedToId: true,
        adminId: true
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check access based on role
    let hasAccess = false
    let canSeeInternal = false // Can see internal messages (admin/contractor only)

    if (role === 'SUPER_ADMIN') {
      hasAccess = true
      canSeeInternal = true
    } else if (['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(role)) {
      // Admin can see tickets from their tenant
      hasAccess = tenantId === ticket.tenantId
      canSeeInternal = true
    } else if (role === 'CONTRACTOR') {
      // Contractor can only see tickets assigned to them
      hasAccess = ticket.assignedToId === userId
      canSeeInternal = true
    } else if (role === 'END_USER') {
      // End user can only see their own tickets
      hasAccess = ticket.userId === userId
      canSeeInternal = false
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build where clause - filter internal messages for end users
    const whereClause: any = { ticketId }
    if (!canSeeInternal) {
      whereClause.isInternal = false
    }

    // Get messages with pagination
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          attachments: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              url: true,
              mimeType: true,
              size: true
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit
      }),
      prisma.message.count({ where: whereClause })
    ])

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    logger.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST - Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    const ticketId = params.id

    // Verify user has access to this ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        userId: true,
        tenantId: true,
        assignedToId: true,
        adminId: true,
        ticketNumber: true,
        title: true
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check access based on role
    let hasAccess = false
    let canSendInternal = false

    if (role === 'SUPER_ADMIN') {
      hasAccess = true
      canSendInternal = true
    } else if (['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(role)) {
      hasAccess = tenantId === ticket.tenantId
      canSendInternal = true
    } else if (role === 'CONTRACTOR') {
      hasAccess = ticket.assignedToId === userId
      canSendInternal = true
    } else if (role === 'END_USER') {
      hasAccess = ticket.userId === userId
      canSendInternal = false
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse form data (supports file uploads)
    const contentType = request.headers.get('content-type')
    let content: string = ''
    let isInternal: boolean = false
    let uploadedFiles: File[] = []

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      content = formData.get('content') as string || ''
      isInternal = formData.get('isInternal') === 'true'
      uploadedFiles = formData.getAll('files') as File[]
    } else {
      const body = await request.json()
      content = body.content || ''
      isInternal = body.isInternal || false
    }

    // Validate - must have content or files
    if (!content.trim() && uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: 'Message content or attachment required' },
        { status: 400 }
      )
    }

    // End users cannot send internal messages
    if (isInternal && !canSendInternal) {
      isInternal = false
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        ticketId,
        userId,
        isInternal
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Handle file uploads to R2
    const attachments: any[] = []
    if (uploadedFiles.length > 0 && isR2Configured()) {
      for (const file of uploadedFiles) {
        try {
          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          
          const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          
          // Upload to R2
          const result = await uploadToR2(buffer, safeFilename, `messages/${message.id}`, file.type || 'application/octet-stream', authCtx.tenantId)
          
          if (!result.success || !result.url) {
            logger.error(`Failed to upload file ${file.name} to R2: ${result.error}`)
            continue
          }
          
          const getAttachmentType = (mimeType: string): string => {
            if (mimeType.startsWith('image/')) return 'image'
            if (mimeType.startsWith('video/')) return 'video'
            if (mimeType.startsWith('audio/')) return 'audio'
            return 'document'
          }

          const attachment = await prisma.attachment.create({
            data: {
              filename: result.key || safeFilename,
              originalName: file.name,
              url: result.url,
              mimeType: file.type || 'application/octet-stream',
              type: getAttachmentType(file.type || 'application/octet-stream'),
              size: file.size,
              messageId: message.id,
              uploadedById: userId
            }
          })
          attachments.push(attachment)
        } catch (fileError) {
          logger.error(`Error saving file ${file.name}:`, fileError)
        }
      }
    }

    // Create notifications for other participants
    const participantIds = new Set<string>()
    
    // Add ticket creator
    if (ticket.userId !== userId) {
      participantIds.add(ticket.userId)
    }
    
    // Add assigned contractor
    if (ticket.assignedToId && ticket.assignedToId !== userId) {
      participantIds.add(ticket.assignedToId)
    }
    
    // Add admin
    if (ticket.adminId && ticket.adminId !== userId) {
      participantIds.add(ticket.adminId)
    }

    // Create notifications (skip for internal messages to end users)
    for (const participantId of participantIds) {
      // Check if this is an internal message and the participant is an end user
      if (isInternal) {
        const participant = await prisma.user.findUnique({
          where: { id: participantId },
          select: { role: true }
        })
        if (participant?.role === 'END_USER') {
          continue // Skip notification for internal messages to end users
        }
      }

      await prisma.notification.create({
        data: {
          userId: participantId,
          type: 'new_message',
          title: 'New Message',
          message: `New message on ticket ${ticket.ticketNumber}: "${ticket.title}"`,
          data: JSON.stringify({
            ticketId,
            ticketNumber: ticket.ticketNumber,
            messageId: message.id,
            senderId: userId
          })
        }
      })
    }

    return NextResponse.json({
      message: {
        ...message,
        attachments
      }
    })
  } catch (error) {
    logger.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
