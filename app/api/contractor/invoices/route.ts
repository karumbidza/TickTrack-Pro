import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const body = await request.json()
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
      variationDescription
    } = body

    // Validate required fields (simplified - only invoice number, amount, and file required)
    if (!ticketId || !invoiceNumber || !amount || !invoiceFileUrl) {
      return NextResponse.json(
        { message: 'Missing required fields: ticketId, invoiceNumber, amount, and invoiceFileUrl are required' },
        { status: 400 }
      )
    }

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

    // Check if invoice already exists for this ticket
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        ticketId: ticketId,
        contractorId: session.user.id
      }
    })

    if (existingInvoice) {
      return NextResponse.json(
        { message: 'Invoice already exists for this ticket' },
        { status: 400 }
      )
    }

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        amount: parseFloat(amount),
        quotedAmount,
        variationDescription: variationDescription || null,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        description: description || `Invoice for ticket ${ticket.ticketNumber}`,
        workDescription,
        notes,
        invoiceFileUrl,
        status: 'PENDING',
        balance: parseFloat(amount), // Initially, balance equals full amount
        paidAmount: 0,
        contractorId: session.user.id,
        ticketId: ticketId,
        tenantId: ticket.tenantId
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
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}