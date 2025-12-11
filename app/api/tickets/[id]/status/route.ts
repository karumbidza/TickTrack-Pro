import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// PATCH - Update ticket status (for users to confirm on-site/completed)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: ticketId } = await params
    const body = await request.json()
    const { status } = body

    // Get the ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Validate permissions based on role and status transition
    const userRole = session.user.role
    const userId = session.user.id

    // END_USER can update their own tickets to ON_SITE or AWAITING_DESCRIPTION
    if (userRole === 'END_USER') {
      if (ticket.userId !== userId) {
        return NextResponse.json({ error: 'You can only update your own tickets' }, { status: 403 })
      }
      
      // Validate allowed transitions for end users
      const allowedTransitions: Record<string, string[]> = {
        'ACCEPTED': ['ON_SITE'],              // User confirms contractor arrived
        'ON_SITE': ['AWAITING_DESCRIPTION'],  // User marks job complete - now needs contractor description
        'IN_PROGRESS': ['AWAITING_DESCRIPTION'], // Also allow from IN_PROGRESS
        'AWAITING_WORK_APPROVAL': ['COMPLETED'], // User approves work description
        'COMPLETED': ['CLOSED']               // User closes after approval
      }
      
      if (!allowedTransitions[ticket.status]?.includes(status)) {
        return NextResponse.json({ 
          error: `Cannot change status from ${ticket.status} to ${status}` 
        }, { status: 400 })
      }
    }
    
    // ADMIN can update to CLOSED
    else if (['TENANT_ADMIN', 'SUPER_ADMIN', 'IT_ADMIN', 'MAINTENANCE_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'PROJECTS_ADMIN'].includes(userRole)) {
      const allowedTransitions: Record<string, string[]> = {
        'COMPLETED': ['CLOSED']
      }
      
      if (!allowedTransitions[ticket.status]?.includes(status)) {
        return NextResponse.json({ 
          error: `Cannot change status from ${ticket.status} to ${status}` 
        }, { status: 400 })
      }
    }
    
    else {
      return NextResponse.json({ error: 'You do not have permission to update this ticket' }, { status: 403 })
    }

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: status,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
        workDescriptionRequestedAt: status === 'AWAITING_DESCRIPTION' ? new Date() : undefined,
        workDescriptionApprovedAt: status === 'COMPLETED' ? new Date() : undefined,
        workDescriptionApproved: status === 'COMPLETED' ? true : undefined,
        updatedAt: new Date()
      }
    })

    // Create status history entry
    await prisma.statusHistory.create({
      data: {
        ticketId: ticketId,
        fromStatus: ticket.status,
        toStatus: status,
        changedById: session.user.id,
        reason: getStatusChangeReason(ticket.status, status, userRole)
      }
    })

    // Create a message about the status change
    await prisma.message.create({
      data: {
        content: getStatusChangeMessage(status, session.user.name || session.user.email || 'User'),
        ticketId: ticketId,
        userId: session.user.id
      }
    })

    return NextResponse.json({ 
      success: true, 
      ticket: updatedTicket,
      message: `Status updated to ${status}`
    })
  } catch (error) {
    logger.error('Status update error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

function getStatusChangeReason(fromStatus: string, toStatus: string, role: string): string {
  if (toStatus === 'ON_SITE') {
    return 'User confirmed contractor has arrived on site'
  }
  if (toStatus === 'AWAITING_DESCRIPTION') {
    return 'User marked job as complete - waiting for contractor to describe work done'
  }
  if (toStatus === 'COMPLETED') {
    return 'User approved the work description'
  }
  if (toStatus === 'CLOSED') {
    return 'Admin closed the ticket'
  }
  return `Status changed from ${fromStatus} to ${toStatus}`
}

function getStatusChangeMessage(status: string, userName: string): string {
  if (status === 'ON_SITE') {
    return `**Contractor Arrival Confirmed**\n\n${userName} has confirmed that the contractor has arrived on site.`
  }
  if (status === 'AWAITING_DESCRIPTION') {
    return `**Job Marked Complete - Description Required**\n\n${userName} has marked the job as complete. Contractor must now provide a description of the work done.`
  }
  if (status === 'COMPLETED') {
    return `**Work Description Approved**\n\n${userName} has approved the work description. The job is now complete.`
  }
  if (status === 'CLOSED') {
    return `**Ticket Closed**\n\n${userName} has closed this ticket.`
  }
  return `Status updated to ${status} by ${userName}`
}
