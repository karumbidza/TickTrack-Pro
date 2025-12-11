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

    const tickets = await prisma.ticket.findMany({
      where: {
        assignedToId: session.user.id,
      },
      include: {
        tenant: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        asset: {
          select: {
            id: true,
            name: true,
            assetNumber: true,
            location: true
          }
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            mimeType: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
            invoiceFileUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform tickets to match Job interface
    const jobs = tickets.map(ticket => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status === 'PROCESSING' ? 'PROCESSING' : ticket.status,
      priority: ticket.priority,
      type: ticket.type || 'OTHER',
      location: ticket.location || ticket.asset?.location || 'Remote',
      estimatedHours: ticket.estimatedHours || 8,
      hourlyRate: 75,
      scheduledDate: ticket.dueDate?.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      tenant: {
        name: ticket.tenant.name
      },
      user: {
        name: ticket.user.name || 'Unknown',
        email: ticket.user.email
      },
      asset: ticket.asset ? {
        name: ticket.asset.name,
        assetNumber: ticket.asset.assetNumber,
        location: ticket.asset.location
      } : null,
      attachments: ticket.attachments || [],
      invoice: ticket.invoice ? {
        id: ticket.invoice.id,
        invoiceNumber: ticket.invoice.invoiceNumber,
        amount: ticket.invoice.amount,
        status: ticket.invoice.status,
        invoiceFileUrl: ticket.invoice.invoiceFileUrl
      } : null
    }))

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error fetching contractor jobs:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}