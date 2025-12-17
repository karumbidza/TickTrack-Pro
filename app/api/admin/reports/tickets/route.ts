import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin roles can access reports
    const adminRoles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const status = searchParams.get('status')

    // Build filter conditions
    const where: any = {}

    // Tenant filter for company admins (not super admin)
    if (session.user.role !== 'SUPER_ADMIN' && session.user.tenantId) {
      where.tenantId = session.user.tenantId
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        // Include the entire day
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

    // Status filter
    if (status && status !== 'all') {
      where.status = status
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        assignedTo: {
          select: {
            name: true,
            email: true
          }
        },
        category: {
          select: {
            name: true
          }
        },
        branch: {
          select: {
            name: true
          }
        },
        asset: {
          select: {
            name: true,
            assetNumber: true,
            location: true
          }
        },
        invoice: {
          select: {
            invoiceNumber: true,
            amount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Map tickets with additional fields for the report
    const reportData = tickets.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      completedAt: ticket.completedAt,
      resolutionDeadline: ticket.resolutionDeadline,
      repairCost: ticket.invoice?.amount || null,
      invoiceNumber: ticket.invoice?.invoiceNumber || null,
      location: ticket.branch?.name || ticket.location || ticket.asset?.location || null,
      user: ticket.user,
      contractor: ticket.assignedTo,
      category: ticket.category,
      asset: ticket.asset
    }))

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error generating ticket report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
