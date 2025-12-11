import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Filter tickets based on admin role
    let departmentFilter = {}
    if (user.role === 'IT_ADMIN') {
      departmentFilter = { department: 'IT' }
    } else if (user.role === 'SALES_ADMIN') {
      departmentFilter = { department: 'SALES' }
    } else if (user.role === 'MAINTENANCE_ADMIN') {
      departmentFilter = { department: 'MAINTENANCE' }
    } else if (user.role === 'PROJECTS_ADMIN') {
      departmentFilter = { department: 'PROJECTS' }
    }

    // Get ticket stats
    const [
      totalTickets,
      openTickets,
      processingTickets,
      inProgressTickets,
      completedTickets,
      cancelledTickets,
      rejectedTickets
    ] = await Promise.all([
      prisma.ticket.count({ where: { tenantId: user.tenantId, ...departmentFilter } }),
      prisma.ticket.count({ where: { tenantId: user.tenantId, status: 'OPEN', ...departmentFilter } }),
      prisma.ticket.count({ where: { tenantId: user.tenantId, status: 'PROCESSING', ...departmentFilter } }),
      prisma.ticket.count({ where: { tenantId: user.tenantId, status: { in: ['IN_PROGRESS', 'ON_SITE', 'ACCEPTED'] }, ...departmentFilter } }),
      prisma.ticket.count({ where: { tenantId: user.tenantId, status: { in: ['COMPLETED', 'CLOSED'] }, ...departmentFilter } }),
      prisma.ticket.count({ where: { tenantId: user.tenantId, status: 'CANCELLED', ...departmentFilter } }),
      // Count tickets that were rejected by contractor (we'll track this in a new way)
      prisma.ticket.count({ 
        where: { 
          tenantId: user.tenantId, 
          status: 'OPEN',
          assignedToId: { not: null }, // Was assigned
          ...departmentFilter 
        } 
      })
    ])

    // Get month-to-date date range
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get month-to-date completed tickets
    const completedMTD = await prisma.ticket.count({
      where: {
        tenantId: user.tenantId,
        status: { in: ['COMPLETED', 'CLOSED'] },
        completedAt: { gte: startOfMonth },
        ...departmentFilter
      }
    })

    // Get month-to-date approved invoice cost
    const invoiceCostMTD = await prisma.invoice.aggregate({
      where: {
        tenantId: user.tenantId,
        status: { in: ['APPROVED', 'PAID'] },
        updatedAt: { gte: startOfMonth }
      },
      _sum: {
        amount: true
      }
    })

    // Get total cost from approved/paid invoices (all time)
    const invoiceCostResult = await prisma.invoice.aggregate({
      where: {
        tenantId: user.tenantId,
        status: { in: ['APPROVED', 'PAID'] }
      },
      _sum: {
        amount: true
      }
    })

    // Get pending invoice cost
    const pendingCostResult = await prisma.invoice.aggregate({
      where: {
        tenantId: user.tenantId,
        status: 'PENDING'
      },
      _sum: {
        amount: true
      }
    })

    // Get contractor count
    const contractorCount = await prisma.contractor.count({
      where: { tenantId: user.tenantId }
    })

    // Get user count
    const userCount = await prisma.user.count({
      where: { tenantId: user.tenantId }
    })

    // Get average resolution time (completed tickets)
    const completedTicketsData = await prisma.ticket.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['COMPLETED', 'CLOSED'] },
        completedAt: { not: null },
        ...departmentFilter
      },
      select: {
        createdAt: true,
        completedAt: true
      }
    })

    let avgResolutionTime = 0
    if (completedTicketsData.length > 0) {
      const totalHours = completedTicketsData.reduce((acc, ticket) => {
        if (ticket.completedAt) {
          const hours = (ticket.completedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
          return acc + hours
        }
        return acc
      }, 0)
      avgResolutionTime = Math.round(totalHours / completedTicketsData.length)
    }

    // Get high priority tickets
    const highPriorityTickets = await prisma.ticket.count({
      where: {
        tenantId: user.tenantId,
        priority: { in: ['HIGH', 'CRITICAL'] },
        status: { in: ['OPEN', 'PROCESSING', 'IN_PROGRESS'] },
        ...departmentFilter
      }
    })

    // Get tickets needing attention (rejected or awaiting approval)
    const needsAttention = await prisma.ticket.count({
      where: {
        tenantId: user.tenantId,
        status: 'AWAITING_APPROVAL',
        ...departmentFilter
      }
    })

    return NextResponse.json({
      stats: {
        totalTickets,
        openTickets,
        processingTickets,
        inProgressTickets,
        completedTickets,
        completedMTD,
        cancelledTickets,
        highPriorityTickets,
        needsAttention,
        contractorCount,
        userCount,
        avgResolutionTime,
        totalCost: invoiceCostResult._sum.amount || 0,
        totalCostMTD: invoiceCostMTD._sum.amount || 0,
        pendingCost: pendingCostResult._sum.amount || 0
      }
    })
  } catch (error) {
    console.error('Failed to fetch admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
