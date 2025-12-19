import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSLADeadlines } from '@/lib/sla-utils'
import { sendSMS } from '@/lib/africastalking-service'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { status, priority, type, notes, assetId, categoryId } = await request.json()
    const ticketId = params.id

    // Ensure user has tenantId
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Verify ticket belongs to user's tenant
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        tenantId: user.tenantId
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        admin: { select: { id: true, name: true, email: true } }
      }
    })

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Prevent changes to closed/completed tickets (except reopening via status change)
    const closedStatuses = ['CLOSED', 'COMPLETED', 'CANCELLED']
    if (closedStatuses.includes(existingTicket.status)) {
      if (priority || type) {
        return NextResponse.json({ 
          error: 'Failed to update priority/category - ticket closed!' 
        }, { status: 400 })
      }
    }

    // Update ticket
    const updateData: any = {}
    if (status) updateData.status = status
    if (type) updateData.type = type
    if (assetId !== undefined) updateData.assetId = assetId || null
    if (categoryId !== undefined) updateData.categoryId = categoryId || null
    updateData.updatedAt = new Date()

    // If priority is changing, recalculate SLA deadlines
    const priorityChanged = priority && priority !== existingTicket.priority
    if (priorityChanged) {
      updateData.priority = priority
      // Recalculate SLA based on new priority from ticket creation time
      const { responseDeadline, resolutionDeadline } = calculateSLADeadlines(
        existingTicket.createdAt,
        priority
      )
      updateData.responseDeadline = responseDeadline
      updateData.resolutionDeadline = resolutionDeadline
      updateData.dueDate = resolutionDeadline
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        asset: {
          select: {
            id: true,
            name: true,
            assetNumber: true,
            location: true,
            categoryId: true,
            category: {
              select: { id: true, name: true, color: true }
            }
          }
        },
        category: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    // Create notifications for priority change
    if (priorityChanged) {
      const notifications = []
      const priorityMessage = `Ticket #${existingTicket.ticketNumber} priority changed from ${existingTicket.priority} to ${priority}. SLA deadlines have been updated.`
      
      // Notify the ticket creator (user)
      if (existingTicket.userId) {
        notifications.push({
          userId: existingTicket.userId,
          title: 'Ticket Priority Changed',
          message: priorityMessage,
          type: 'TICKET_UPDATE',
          data: { ticketId, link: `/dashboard?ticket=${ticketId}` }
        })
      }
      
      // Notify assigned contractor
      if (existingTicket.assignedToId) {
        notifications.push({
          userId: existingTicket.assignedToId,
          title: 'Job Priority Changed',
          message: `Job #${existingTicket.ticketNumber} priority changed to ${priority}. New deadline: ${updateData.resolutionDeadline?.toLocaleString()}`,
          type: 'JOB_UPDATE',
          data: { ticketId, link: `/contractor?job=${ticketId}` }
        })
      }
      
      // Notify assigned admin (if different from current user)
      if (existingTicket.adminId && existingTicket.adminId !== user.id) {
        notifications.push({
          userId: existingTicket.adminId,
          title: 'Ticket Priority Changed',
          message: priorityMessage,
          type: 'TICKET_UPDATE',
          data: { ticketId, link: `/admin/tickets?id=${ticketId}` }
        })
      }
      
      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications
        })
      }
      
      // Send SMS notifications for priority change
      const smsMessage = `TICKTRACK: Ticket ${existingTicket.ticketNumber} priority changed from ${existingTicket.priority} to ${priority}. New deadline: ${updateData.resolutionDeadline?.toLocaleString()}.`
      
      // Get phone numbers for SMS
      const userWithPhone = await prisma.user.findUnique({
        where: { id: existingTicket.userId },
        select: { phone: true }
      })
      const contractorWithPhone = existingTicket.assignedToId 
        ? await prisma.user.findUnique({
            where: { id: existingTicket.assignedToId },
            select: { phone: true }
          })
        : null
      
      if (userWithPhone?.phone) {
        sendSMS(userWithPhone.phone, smsMessage).catch(err => logger.error('SMS error:', err))
      }
      if (contractorWithPhone?.phone) {
        sendSMS(contractorWithPhone.phone, smsMessage).catch(err => logger.error('SMS error:', err))
      }
      
      // Add a system message to the ticket
      await prisma.message.create({
        data: {
          content: `⚡ Priority changed from ${existingTicket.priority} to ${priority} by ${user.name || 'Admin'}. SLA deadlines recalculated.`,
          ticketId,
          userId: user.id,
          isInternal: false
        }
      })
    }

    // Add update message if notes provided
    if (notes) {
      await prisma.message.create({
        data: {
          content: `Ticket updated by admin. Notes: ${notes}`,
          ticketId,
          userId: user.id
        }
      })
    }

    // Add system message for type change
    if (type && type !== existingTicket.type) {
      await prisma.message.create({
        data: {
          content: `🔄 Ticket type changed from ${existingTicket.type} to ${type} by ${user.name || 'Admin'}.`,
          ticketId,
          userId: user.id,
          isInternal: false
        }
      })
    }

    // Add system message for asset change
    if (assetId !== undefined && assetId !== existingTicket.assetId) {
      const newAsset = assetId ? await prisma.asset.findUnique({
        where: { id: assetId },
        select: { name: true, assetNumber: true }
      }) : null
      
      const message = newAsset 
        ? `📦 Asset changed to ${newAsset.name} (${newAsset.assetNumber}) by ${user.name || 'Admin'}.`
        : `📦 Asset removed from ticket by ${user.name || 'Admin'}.`
      
      await prisma.message.create({
        data: {
          content: message,
          ticketId,
          userId: user.id,
          isInternal: false
        }
      })
    }

    // Add system message for category change
    if (categoryId !== undefined && categoryId !== existingTicket.categoryId) {
      const newCategory = categoryId ? await prisma.category.findUnique({
        where: { id: categoryId },
        select: { name: true }
      }) : null
      
      const message = newCategory 
        ? `🏷️ Category changed to ${newCategory.name} by ${user.name || 'Admin'}.`
        : `🏷️ Category removed from ticket by ${user.name || 'Admin'}.`
      
      await prisma.message.create({
        data: {
          content: message,
          ticketId,
          userId: user.id,
          isInternal: false
        }
      })
    }

    return NextResponse.json({ ticket: updatedTicket }, { status: 200 })
  } catch (error) {
    console.error('Failed to update ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}