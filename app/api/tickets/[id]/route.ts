import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { unlink } from 'fs/promises'
import path from 'path'
import { uploadToR2, isR2Configured, deleteFromR2, getKeyFromUrl } from '@/lib/r2-storage'

// Route segment config for large file uploads (100MB for videos)
export const maxDuration = 300 // 5 minutes timeout for large uploads
export const dynamic = 'force-dynamic'

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

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true }
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
        asset: {
          select: {
            id: true,
            name: true,
            assetNumber: true,
            location: true
          }
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            mimeType: true,
            size: true,
            createdAt: true
          }
        },
        messages: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { messages: true }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check access permissions
    const isOwner = ticket.userId === userId
    const isAssignedContractor = ticket.assignedToId === userId
    const isAdmin = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN', 'SUPER_ADMIN'].includes(role)
    const isSameTenant = ticket.tenantId === tenantId

    if (!isOwner && !isAssignedContractor && !(isAdmin && isSameTenant)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    logger.error('Error fetching ticket:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      logger.warn('PATCH ticket - Unauthorized: no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    const ticketId = params.id
    logger.info(`PATCH ticket ${ticketId} - Starting update`)
    
    // Check content type to determine if it's FormData or JSON
    const contentType = request.headers.get('content-type') || ''
    logger.info(`PATCH ticket - Content-Type: ${contentType}`)
    
    let title: string | undefined
    let description: string | undefined
    let priority: string | undefined
    let type: string | undefined
    let categoryId: string | undefined
    let location: string | undefined
    let assetId: string | undefined
    let deleteAttachments: string[] = []
    let files: File[] = []
    
    if (contentType.includes('multipart/form-data')) {
      logger.info('PATCH ticket - Parsing FormData')
      const formData = await request.formData()
      title = formData.get('title') as string | undefined
      description = formData.get('description') as string | undefined
      priority = formData.get('priority') as string | undefined
      type = formData.get('type') as string | undefined
      categoryId = formData.get('categoryId') as string | undefined
      location = formData.get('location') as string | undefined
      assetId = formData.get('assetId') as string | undefined
      
      const deleteAttachmentsJson = formData.get('deleteAttachments') as string | undefined
      if (deleteAttachmentsJson) {
        try {
          deleteAttachments = JSON.parse(deleteAttachmentsJson)
        } catch (e) {
          // ignore parse error
        }
      }
      
      // Get files
      const fileEntries = formData.getAll('files')
      files = fileEntries.filter((entry): entry is File => entry instanceof File)
    } else {
      const body = await request.json()
      title = body.title
      description = body.description
      priority = body.priority
      type = body.type
      categoryId = body.categoryId
      location = body.location
      assetId = body.assetId
    }

    // First, fetch the ticket to check permissions
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignedTo: true,
        attachments: true
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if user owns this ticket
    const isOwner = ticket.userId === userId
    const isAdmin = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN', 'SUPER_ADMIN'].includes(role)
    const isSameTenant = ticket.tenantId === tenantId

    if (!isOwner && !(isAdmin && isSameTenant)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if ticket can be edited (only OPEN or PROCESSING without contractor)
    const canEdit = ticket.status === 'OPEN' || (ticket.status === 'PROCESSING' && !ticket.assignedToId)
    
    if (!canEdit) {
      return NextResponse.json({ 
        error: 'Ticket cannot be edited once a contractor has been assigned' 
      }, { status: 400 })
    }

    // Delete attachments if requested
    if (deleteAttachments.length > 0) {
      for (const attachmentId of deleteAttachments) {
        const attachment = ticket.attachments.find(a => a.id === attachmentId)
        if (attachment) {
          // Delete file from R2 or filesystem
          try {
            if (attachment.url.startsWith('http')) {
              // R2 URL - delete from R2
              const key = getKeyFromUrl(attachment.url)
              if (key) {
                await deleteFromR2(key)
              }
            } else {
              // Local file - delete from filesystem
              const filePath = path.join(process.cwd(), 'public', attachment.url)
              await unlink(filePath)
            }
          } catch (e) {
            // File might not exist, continue anyway
            logger.warn(`Could not delete file: ${attachment.url}`)
          }
          // Delete from database
          await prisma.attachment.delete({ where: { id: attachmentId } })
        }
      }
    }

    // Handle new file uploads
    if (files.length > 0 && isR2Configured()) {
      for (const file of files) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        // Generate safe filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        
        // Upload to R2
        const result = await uploadToR2(buffer, safeName, `tickets/${ticketId}`, file.type, authCtx.tenantId)
        
        if (!result.success || !result.url) {
          logger.error(`Failed to upload file ${file.name} to R2: ${result.error}`)
          continue
        }
        
        // Determine file type
        let fileType = 'document'
        if (file.type.startsWith('image/')) fileType = 'image'
        else if (file.type.startsWith('video/')) fileType = 'video'
        else if (file.type.startsWith('audio/')) fileType = 'audio'
        
        // Create attachment record
        await prisma.attachment.create({
          data: {
            filename: result.key || safeName,
            originalName: file.name,
            url: result.url,
            mimeType: file.type,
            size: file.size,
            type: fileType,
            ticketId,
            uploadedById: userId
          }
        })
      }
    }

    // Build update data object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    }
    
    if (title) updateData.title = title.trim()
    if (description !== undefined && description !== null) updateData.description = description.trim()
    if (priority) updateData.priority = priority
    if (type) updateData.type = type
    if (categoryId !== undefined) updateData.categoryId = categoryId || null
    if (location !== undefined && location !== null) updateData.location = location.trim()
    if (assetId !== undefined) updateData.assetId = assetId || null

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updateData as any,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true }
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
        category: {
          select: { id: true, name: true, color: true }
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
      }
    })

    logger.info(`Ticket ${ticketId} updated by user ${userId}`)

    return NextResponse.json({ 
      message: 'Ticket updated successfully',
      ticket: updatedTicket 
    })
  } catch (error) {
    logger.error('Error updating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}
