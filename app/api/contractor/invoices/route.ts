import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for invoice creation
const invoiceCreateSchema = z.object({
  ticketId: z.string().cuid('Invalid ticket ID'),
  invoiceNumber: z.string().min(1, 'Invoice number required').max(50),
  amount: z.number().positive('Amount must be positive'),
  invoiceFileUrl: z.string().url('Invalid invoice file URL'),
  hoursWorked: z.number().nonnegative().optional(),
  hourlyRate: z.number().nonnegative().optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  workDescription: z.string().max(5000).optional(),
  variationDescription: z.string().max(2000).optional(),
  revisionNotes: z.string().max(2000).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'CONTRACTOR') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if contractor has invoice access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        contractorProfile: {
          include: {
            contractorSubscription: true
          }
        }
      }
    })

    if (!user?.contractorProfile?.contractorSubscription?.hasInvoiceAccess) {
      return NextResponse.json({ 
        message: 'Invoice access not activated. Please subscribe to Invoice Management.',
        requiresSubscription: true 
      }, { status: 403 })
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        contractorId: session.user.id,
      },
      include: {
        ticket: {
          select: {
            title: true,
            ticketNumber: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error fetching contractor invoices:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'CONTRACTOR') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Validate request body with Zod schema
    const body = await request.json()
    const parseResult = invoiceCreateSchema.safeParse(body)
    
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ message: errors }, { status: 400 })
    }

    const {
      ticketId,
      invoiceNumber,
      amount,
      invoiceFileUrl,
      hoursWorked,
      hourlyRate,
      description,
      notes,
      workDescription,
      variationDescription,
      revisionNotes
    } = parseResult.data

    // Verify ticket exists and contractor has access
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        assignedToId: session.user.id,
        status: 'CLOSED' // Only allow invoice creation for closed tickets
      },
      include: {
        quoteRequests: {
          where: {
            contractorId: session.user.id,
            status: 'AWARDED'
          },
          select: {
            quoteAmount: true
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { message: 'Ticket not found or not eligible for invoicing' },
        { status: 404 }
      )
    }

    // Get the quoted amount if available
    const quotedAmount = ticket.quoteRequests?.[0]?.quoteAmount || ticket.quoteAmount || null

    // Check if an active invoice already exists for this ticket
    const existingActiveInvoice = await prisma.invoice.findFirst({
      where: {
        ticketId: ticketId,
        contractorId: session.user.id,
        isActive: true
      }
    })

    // If there's an active invoice that isn't rejected, don't allow new submission
    if (existingActiveInvoice && existingActiveInvoice.status !== 'REJECTED') {
      return NextResponse.json(
        { message: 'An active invoice already exists for this ticket. Only rejected invoices can be revised.' },
        { status: 400 }
      )
    }

    // If this is a resubmission (replacing a rejected invoice)
    let revisionNumber = 1
    let previousInvoiceId = null
    
    if (existingActiveInvoice && existingActiveInvoice.status === 'REJECTED') {
      // Require revision notes for resubmissions
      if (!revisionNotes || revisionNotes.trim().length < 10) {
        return NextResponse.json(
          { message: 'Please provide revision notes explaining what changes were made (minimum 10 characters)' },
          { status: 400 }
        )
      }
      
      // Deactivate the rejected invoice (keep as historical record)
      await prisma.invoice.update({
        where: { id: existingActiveInvoice.id },
        data: { isActive: false }
      })
      
      revisionNumber = (existingActiveInvoice.revisionNumber || 1) + 1
      previousInvoiceId = existingActiveInvoice.id
    }

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        amount: amount,
        quotedAmount,
        variationDescription: variationDescription || null,
        hoursWorked: hoursWorked || null,
        hourlyRate: hourlyRate || null,
        description: description || `Invoice for ticket ${ticket.ticketNumber}`,
        workDescription,
        notes,
        invoiceFileUrl,
        status: 'PENDING',
        balance: amount, // Initially, balance equals full amount
        paidAmount: 0,
        contractorId: session.user.id,
        ticketId: ticketId,
        tenantId: ticket.tenantId,
        isActive: true,
        revisionNumber,
        previousInvoiceId,
        revisionNotes: revisionNotes || null
      },
      include: {
        ticket: {
          select: {
            title: true,
            ticketNumber: true,
          }
        }
      }
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    
    // Check for unique constraint error on invoice number
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { message: 'Invoice number already exists. Please use a different invoice number.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}