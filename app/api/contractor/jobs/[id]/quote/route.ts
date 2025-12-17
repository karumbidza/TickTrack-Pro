import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// POST - Submit a quote for a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CONTRACTOR') {
      return NextResponse.json({ error: 'Forbidden - Only contractors can submit quotes' }, { status: 403 })
    }

    const ticketId = params.id
    const { quoteAmount, quoteDescription, quoteFileUrl } = await request.json()

    if (!quoteAmount || quoteAmount <= 0) {
      return NextResponse.json({ error: 'Quote amount is required and must be positive' }, { status: 400 })
    }

    // Get the ticket and verify it's assigned to this contractor and awaiting quote
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        assignedToId: session.user.id,
        status: 'AWAITING_QUOTE' as any,
        quoteRequested: true
      } as any
    })

    if (!ticket) {
      return NextResponse.json({ 
        error: 'Ticket not found or not awaiting quote from you' 
      }, { status: 404 })
    }

    // Update ticket with quote details
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'QUOTE_SUBMITTED' as any,
        quoteAmount: parseFloat(quoteAmount.toString()),
        quoteDescription: quoteDescription || null,
        quoteFileUrl: quoteFileUrl || null,
        quoteSubmittedAt: new Date(),
        updatedAt: new Date()
      } as any,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        tenant: {
          select: { name: true }
        }
      }
    })

    // Create a message about the quote submission (internal - not visible to end user)
    await prisma.message.create({
      data: {
        content: `Quote submitted: $${quoteAmount.toFixed(2)}${quoteDescription ? `. Details: ${quoteDescription}` : ''}`,
        ticketId,
        userId: session.user.id,
        isInternal: true
      }
    })

    logger.info('Quote submitted', { ticketId, quoteAmount, contractorId: session.user.id })

    return NextResponse.json({ ticket: updatedTicket })
  } catch (error) {
    logger.error('Failed to submit quote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
