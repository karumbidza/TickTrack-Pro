import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// POST - Contractor submits work description
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
    const userId = meta.dbUserId ?? clerkUserId
    const tenantId = meta.tenantId ?? null
    const role = (meta.role as string) ?? 'END_USER'

    // Only contractors can submit work descriptions
    if (role !== 'CONTRACTOR') {
      return NextResponse.json({ error: 'Only contractors can submit work descriptions' }, { status: 403 })
    }

    const { workDescription } = await request.json()

    if (!workDescription || workDescription.trim().length === 0) {
      return NextResponse.json({ error: 'Work description is required' }, { status: 400 })
    }

    // Get the ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.id,
        assignedToId: userId // Must be assigned to this contractor
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found or not assigned to you' }, { status: 404 })
    }

    // Check if ticket is in the correct status
    if (ticket.status !== 'AWAITING_DESCRIPTION') {
      return NextResponse.json({ 
        error: 'Ticket is not waiting for a work description. Current status: ' + ticket.status 
      }, { status: 400 })
    }

    // Update the ticket with work description
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        workDescription: workDescription.trim(),
        workDescriptionSubmittedAt: new Date(),
        status: 'AWAITING_WORK_APPROVAL',
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        tenant: {
          select: { id: true, name: true }
        },
        asset: {
          select: { id: true, name: true, assetNumber: true, location: true }
        },
        attachments: true,
        invoices: true,
        _count: { select: { messages: true } }
      }
    })

    // Create status history entry
    await prisma.statusHistory.create({
      data: {
        ticketId: params.id,
        fromStatus: 'AWAITING_DESCRIPTION',
        toStatus: 'AWAITING_WORK_APPROVAL',
        changedById: userId,
        reason: 'Contractor submitted work description for user approval'
      }
    })

    // Create a message about the submission
    await prisma.message.create({
      data: {
        content: `**Work Description Submitted**\n\nThe contractor has submitted a description of the work done:\n\n---\n${workDescription}\n---\n\nAwaiting user approval.`,
        ticketId: params.id,
        userId: userId
      }
    })

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: 'WORK_DESCRIPTION_SUBMITTED',
        title: 'Work Description Submitted',
        message: `The contractor has submitted a work description for ticket ${ticket.ticketNumber}. Please review and approve.`,
        data: JSON.stringify({
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Work description submitted successfully. Waiting for user approval.',
      ticket: updatedTicket
    })

  } catch (error) {
    console.error('Failed to submit work description:', error)
    return NextResponse.json(
      { error: 'Failed to submit work description' },
      { status: 500 }
    )
  }
}
