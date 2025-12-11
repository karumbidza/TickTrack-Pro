import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Mark ticket as completed by HQ admin
export async function POST(
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
      return NextResponse.json({ error: 'Only admins can complete tickets' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'User has no tenant association' }, { status: 400 })
    }

    const { completionNotes } = await request.json()

    // Get the ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenantId
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Verify the current user is the assigned HQ admin
    if (ticket.assignedToId !== user.id) {
      return NextResponse.json({ 
        error: 'Only the assigned HQ admin can mark this ticket as complete' 
      }, { status: 403 })
    }

    // Check if ticket has HQ assignment
    if (!ticket.hqAssignedAt) {
      return NextResponse.json({ 
        error: 'This ticket was not assigned to HQ staff' 
      }, { status: 400 })
    }

    // Check if already completed
    if (['CANCELLED', 'CLOSED', 'COMPLETED'].includes(ticket.status)) {
      return NextResponse.json({ 
        error: 'Ticket is already completed or closed' 
      }, { status: 400 })
    }

    // Update the ticket - mark as completed by HQ
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        hqCompletedAt: new Date(),
        completedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true }
        },
        asset: {
          select: { id: true, name: true, assetNumber: true, location: true }
        },
        attachments: true,
        _count: { select: { messages: true } }
      }
    })

    // Create status history entry
    await prisma.statusHistory.create({
      data: {
        ticketId: params.id,
        fromStatus: ticket.status,
        toStatus: 'COMPLETED',
        changedById: user.id,
        reason: completionNotes || 'Job marked complete by HQ staff'
      }
    })

    // Create a system message about the completion
    await prisma.message.create({
      data: {
        ticketId: params.id,
        userId: user.id,
        content: `Job marked as complete by HQ staff${completionNotes ? `. Notes: ${completionNotes}` : ''}`,
        isInternal: false // User should see this
      }
    })

    // Create notification for the ticket creator
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: 'ticket_completed',
        title: 'Job Completed - Please Review',
        message: `Your ticket ${ticket.ticketNumber}: ${ticket.title} has been completed. Please review and close the ticket.`,
        data: { ticketId: params.id, ticketNumber: ticket.ticketNumber }
      }
    })

    return NextResponse.json({ 
      ticket: updatedTicket,
      message: 'Job marked as complete. User can now close and rate.' 
    })
  } catch (error) {
    console.error('Failed to complete ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
