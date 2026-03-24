import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Validation schema for quote submission
const quoteSubmitSchema = z.object({
  quoteAmount: z.number().positive('Quote amount must be positive'),
  quoteDescription: z.string().max(2000).optional(),
  quoteFileUrl: z.string().url().optional().or(z.literal('')),
  estimatedDays: z.number().int().positive().optional(),
})

// POST - Submit a quote for a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCtx = await getAuthContext()
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, tenantId, role } = authCtx

    if (role !== 'CONTRACTOR') {
      return NextResponse.json({ error: 'Forbidden - Only contractors can submit quotes' }, { status: 403 })
    }

    const ticketId = params.id
    
    // Validate request body with Zod schema
    const body = await request.json()
    const parseResult = quoteSubmitSchema.safeParse(body)
    
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { quoteAmount, quoteDescription, quoteFileUrl, estimatedDays } = parseResult.data

    // Check if there's a QuoteRequest for this contractor on this ticket
    const quoteRequest = await prisma.quoteRequest.findFirst({
      where: {
        ticketId: ticketId,
        contractorId: userId,
        status: 'pending'
      }
    })

    if (quoteRequest) {
      // Update the QuoteRequest with the submitted quote
      await prisma.quoteRequest.update({
        where: { id: quoteRequest.id },
        data: {
          status: 'submitted',
          quoteAmount: quoteAmount,
          quoteDescription: quoteDescription || null,
          quoteFileUrl: quoteFileUrl || null,
          estimatedDays: estimatedDays || null,
          submittedAt: new Date()
        }
      })

      // Check if all quote requests for this ticket have been submitted
      const pendingRequests = await prisma.quoteRequest.count({
        where: {
          ticketId: ticketId,
          status: 'pending'
        }
      })

      // Update ticket status if at least one quote is submitted
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'QUOTE_SUBMITTED' as any,
          updatedAt: new Date()
        }
      })

      // Create a message about the quote submission
      await prisma.message.create({
        data: {
          content: `Quote submitted: $${quoteAmount.toFixed(2)}${quoteDescription ? `. Details: ${quoteDescription}` : ''}${estimatedDays ? `. Estimated completion: ${estimatedDays} days` : ''}`,
          ticketId,
          userId: userId,
          isInternal: true
        }
      })

      logger.info('Quote submitted via QuoteRequest', { ticketId, quoteRequestId: quoteRequest.id, quoteAmount, contractorId: userId })

      return NextResponse.json({ 
        success: true,
        message: 'Quote submitted successfully',
        pendingQuotes: pendingRequests
      })
    }

    // Fallback: Check if ticket is directly assigned to this contractor (old flow)
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        assignedToId: userId,
        status: 'AWAITING_QUOTE' as any,
        quoteRequested: true
      } as any
    })

    if (!ticket) {
      return NextResponse.json({ 
        error: 'Ticket not found or not awaiting quote from you' 
      }, { status: 404 })
    }

    // Update ticket with quote details (old flow - single contractor)
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
        userId: userId,
        isInternal: true
      }
    })

    logger.info('Quote submitted', { ticketId, quoteAmount, contractorId: userId })

    return NextResponse.json({ ticket: updatedTicket })
  } catch (error) {
    logger.error('Failed to submit quote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
