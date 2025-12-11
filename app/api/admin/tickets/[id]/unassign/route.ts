import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Unassign/revoke assignment from ticket (works for both contractors and HQ admins)
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
      return NextResponse.json({ error: 'Only admins can unassign tickets' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'User has no tenant association' }, { status: 400 })
    }

    const { reason } = await request.json()

    // Get the ticket with current assignment info
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.id,
        tenantId: user.tenantId
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if ticket is in a state that can be unassigned
    if (['CANCELLED', 'CLOSED', 'COMPLETED'].includes(ticket.status)) {
      return NextResponse.json({ 
        error: 'Cannot unassign a ticket that is cancelled, closed, or completed' 
      }, { status: 400 })
    }

    // Check if ticket is actually assigned
    if (!ticket.assignedToId) {
      return NextResponse.json({ 
        error: 'Ticket is not currently assigned to anyone' 
      }, { status: 400 })
    }

    const previousAssignee = ticket.assignedTo
    const wasHQAssigned = !!ticket.hqAssignedAt

    // Unassign the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        assignedToId: null,
        status: 'OPEN', // Reset to open for reassignment
        hqAssignedAt: null, // Clear HQ assignment timestamp if it was HQ-assigned
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        asset: {
          select: { id: true, name: true, assetNumber: true, location: true }
        },
        attachments: true,
        _count: { select: { messages: true } }
      }
    })

    // Create status history entry
    const assigneeType = wasHQAssigned ? 'HQ Admin' : 'Contractor'
    await prisma.statusHistory.create({
      data: {
        ticketId: params.id,
        fromStatus: ticket.status,
        toStatus: 'OPEN',
        changedById: user.id,
        reason: reason || `Assignment revoked from ${assigneeType}: ${previousAssignee?.name || previousAssignee?.email}`
      }
    })

    return NextResponse.json({
      success: true,
      message: `Assignment revoked from ${previousAssignee?.name || previousAssignee?.email}. Ticket is now open for reassignment.`,
      ticket: updatedTicket,
      previousAssignee: {
        id: previousAssignee?.id,
        name: previousAssignee?.name,
        email: previousAssignee?.email,
        wasHQAssigned
      }
    })

  } catch (error) {
    console.error('Failed to unassign ticket:', error)
    return NextResponse.json(
      { error: 'Failed to unassign ticket' },
      { status: 500 }
    )
  }
}
