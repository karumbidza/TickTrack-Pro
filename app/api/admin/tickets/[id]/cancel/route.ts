import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Admin cancels a ticket or approves user's cancellation request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { reason, action } = await request.json()

    // Get the ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        user: true
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check tenant
    if (ticket.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'approve') {
      // Admin approves user's cancellation request
      if (!ticket.cancellationRequestedAt) {
        return NextResponse.json({ error: 'No cancellation request pending' }, { status: 400 })
      }

      await prisma.ticket.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          assignedToId: null // Unassign contractor if any
        }
      })

      return NextResponse.json({ 
        message: 'Cancellation request approved. Ticket has been cancelled.',
        status: 'cancelled'
      })
    }

    if (action === 'reject') {
      // Admin rejects user's cancellation request
      await prisma.ticket.update({
        where: { id },
        data: {
          cancellationReason: null,
          cancellationRequestedAt: null,
          cancellationRequestedBy: null
        }
      })

      return NextResponse.json({ 
        message: 'Cancellation request rejected.',
        status: 'rejected'
      })
    }

    if (action === 'cancel') {
      // Admin directly cancels the ticket
      if (!reason && !ticket.cancellationReason) {
        return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 })
      }

      // Can cancel tickets that are not yet completed
      const notCancellable = ['COMPLETED', 'CLOSED', 'CANCELLED']
      if (notCancellable.includes(ticket.status)) {
        return NextResponse.json({ 
          error: 'This ticket cannot be cancelled as it is already completed or closed.' 
        }, { status: 400 })
      }

      await prisma.ticket.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason?.trim() || ticket.cancellationReason,
          cancelledAt: new Date(),
          assignedToId: null // Unassign contractor if any
        }
      })

      return NextResponse.json({ 
        message: 'Ticket cancelled successfully',
        status: 'cancelled'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error processing ticket cancellation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
