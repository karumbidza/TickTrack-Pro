import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Assign ticket to an HQ admin (self or other admin)
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
      return NextResponse.json({ error: 'Only admins can assign tickets' }, { status: 403 })
    }

    const { adminId, notes } = await request.json()

    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'User has no tenant association' }, { status: 400 })
    }

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

    // Check if ticket is in a state that can be assigned
    if (['CANCELLED', 'CLOSED', 'COMPLETED'].includes(ticket.status)) {
      return NextResponse.json({ 
        error: 'Cannot assign a ticket that is cancelled, closed, or completed' 
      }, { status: 400 })
    }

    // Check if already assigned
    if (ticket.assignedToId) {
      return NextResponse.json({ 
        error: 'Ticket is already assigned. Please reassign if needed.' 
      }, { status: 400 })
    }

    // Verify the admin user exists and belongs to the same tenant
    const adminUser = await prisma.user.findFirst({
      where: {
        id: adminId,
        tenantId: user.tenantId,
        role: { in: ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'] }
      }
    })

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    // Update the ticket - assign to admin
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        assignedToId: adminId,
        adminId: user.id, // The admin who made the assignment
        status: 'IN_PROGRESS', // Move to in progress since HQ is handling it
        hqAssignedAt: new Date() // Track when HQ took over
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
        toStatus: 'IN_PROGRESS',
        changedById: user.id,
        reason: notes || `Assigned to HQ staff: ${adminUser.name || adminUser.email}`
      }
    })

    // Create a system message about the assignment
    await prisma.message.create({
      data: {
        ticketId: params.id,
        userId: user.id,
        content: `Ticket assigned to HQ staff: ${adminUser.name || adminUser.email}${notes ? `. Notes: ${notes}` : ''}`,
        isInternal: true
      }
    })

    // Create notification for the assigned admin (if not self-assignment)
    if (adminId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: adminId,
          type: 'ticket_assigned',
          title: 'Ticket Assigned to You',
          message: `You have been assigned ticket ${ticket.ticketNumber}: ${ticket.title}`,
          data: { ticketId: params.id, ticketNumber: ticket.ticketNumber }
        }
      })
    }

    return NextResponse.json({ 
      ticket: updatedTicket,
      message: 'Ticket assigned to HQ admin successfully' 
    })
  } catch (error) {
    console.error('Failed to assign ticket to admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
