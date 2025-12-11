import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// User requests cancellation of their ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { reason } = await request.json()

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 })
    }

    // Get the ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: true
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check ownership
    if (ticket.userId !== session.user.id) {
      return NextResponse.json({ error: 'You can only cancel your own tickets' }, { status: 403 })
    }

    // Check if ticket can be cancelled - only before contractor accepts
    // Allowed statuses: OPEN, PROCESSING
    const cancellableStatuses = ['OPEN', 'PROCESSING']
    if (!cancellableStatuses.includes(ticket.status)) {
      return NextResponse.json({ 
        error: 'This ticket cannot be cancelled. Tickets can only be cancelled before a contractor accepts the job.' 
      }, { status: 400 })
    }

    // If status is OPEN (not yet assigned), user can cancel directly
    if (ticket.status === 'OPEN' && !ticket.assignedToId) {
      await prisma.ticket.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason.trim(),
          cancellationRequestedAt: new Date(),
          cancellationRequestedBy: session.user.id,
          cancelledAt: new Date()
        }
      })

      return NextResponse.json({ 
        message: 'Ticket cancelled successfully',
        status: 'cancelled'
      })
    }

    // If assigned but not yet accepted (PROCESSING), request cancellation from admin
    await prisma.ticket.update({
      where: { id },
      data: {
        cancellationReason: reason.trim(),
        cancellationRequestedAt: new Date(),
        cancellationRequestedBy: session.user.id
      }
    })

    return NextResponse.json({ 
      message: 'Cancellation request submitted. An admin will review your request.',
      status: 'pending_approval'
    })

  } catch (error) {
    logger.error('Error requesting ticket cancellation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
