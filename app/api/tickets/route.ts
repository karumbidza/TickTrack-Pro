import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSLADeadlines } from '@/lib/sla-utils'
import { sendNewTicketEmailToAdmin } from '@/lib/email'
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
        branch: {
          select: { id: true, name: true }
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
        location: (formData.get('location') as string) || null,
        branchId: formData.get('branchId') ? (formData.get('branchId') as string) : null
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

    // Calculate SLA deadlines based on priority
    const now = new Date()
    const { responseDeadline, resolutionDeadline } = calculateSLADeadlines(now, data.priority)

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
        branchId: data.branchId || session.user.branchId || null,
        status: 'OPEN',
        userId: session.user.id,
        tenantId: userTenantId,
        responseDeadline,
        resolutionDeadline,
        dueDate: resolutionDeadline // Also set dueDate for compatibility
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        asset: {
          select: { id: true, name: true, assetNumber: true, location: true }
        },
        branch: {
          select: { id: true, name: true }
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
    
    // Find admins in the user's branch(es) or tenant admins
    const userBranches = await prisma.userBranch.findMany({
      where: { userId: session.user.id },
      select: { branchId: true, branch: { select: { name: true, isHeadOffice: true } } }
    })
    
    const branchIds = userBranches.map(ub => ub.branchId)
    const branchName = userBranches[0]?.branch?.name || 'Unknown Branch'
    
    // Find admins assigned to the same branch(es) or HQ admins
    const adminsInBranch = await prisma.user.findMany({
      where: {
        tenantId: userTenantId,
        isActive: true,
        role: { in: ['TENANT_ADMIN', 'MAINTENANCE_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'PROJECTS_ADMIN'] },
        OR: [
          // Admins in the same branch
          { branches: { some: { branchId: { in: branchIds } } } },
          // HQ admins (have access to all branches)
          { branches: { some: { branch: { isHeadOffice: true } } } }
        ]
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true
      }
    })
    
    // Find the primary admin for this ticket type
    const admin = adminsInBranch.find(a => a.role === adminRole) || adminsInBranch[0]

    if (admin) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { adminId: admin.id }
      })

      // Create in-app notification for the primary admin
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

    // Send email to all admins in the branch
    const adminEmails = adminsInBranch.filter(a => a.email)
    for (const adminUser of adminEmails) {
      sendNewTicketEmailToAdmin(adminUser.email!, {
        adminName: adminUser.name || 'Admin',
        ticketNumber: ticket.ticketNumber || ticket.id.slice(-8),
        ticketTitle: data.title,
        ticketDescription: data.description,
        priority: data.priority,
        type: data.type,
        branchName: branchName,
        userName: session.user.name || 'User',
        userEmail: session.user.email || '',
        responseDeadline: responseDeadline
      }).catch(err => logger.error('Failed to send new ticket email:', err))
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