import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Submit clarification response
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'CONTRACTOR') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const invoiceId = params.id
    const { response } = await request.json()

    if (!response?.trim()) {
      return NextResponse.json(
        { message: 'Response is required' },
        { status: 400 }
      )
    }

    // Find the invoice and verify ownership
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        contractorId: session.user.id
      },
      include: {
        ticket: {
          select: {
            ticketNumber: true,
            tenantId: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (!invoice.clarificationRequest) {
      return NextResponse.json(
        { message: 'No clarification request pending' },
        { status: 400 }
      )
    }

    // Update invoice with clarification response
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        clarificationResponse: response,
        status: 'PENDING' // Set back to pending for review
      }
    })

    // Notify admins
    const admins = await prisma.user.findMany({
      where: {
        tenantId: invoice.ticket.tenantId,
        role: {
          in: ['TENANT_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
        },
        isActive: true
      },
      select: { id: true }
    })

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'INVOICE_CLARIFICATION_RESPONSE',
          title: 'Clarification Response Received',
          message: `Contractor responded to clarification request for invoice ${invoice.invoiceNumber}`,
          data: JSON.stringify({
            invoiceId: invoice.id,
            ticketId: invoice.ticketId
          })
        }))
      })
    }

    return NextResponse.json({ 
      message: 'Clarification response submitted',
      invoice: updatedInvoice 
    })
  } catch (error) {
    console.error('Error submitting clarification response:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
