import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimitCheck } from '@/lib/api-rate-limit'

export async function GET(request: NextRequest) {
  // Rate limit: 50 requests per minute for admin endpoints
  const rateLimitResponse = await rateLimitCheck(request, 'admin')
  if (rateLimitResponse) return rateLimitResponse

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

    // Ensure user has tenantId
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    // Filter tickets based on admin role
    let departmentFilter = {}
    if (user.role === 'IT_ADMIN') {
      departmentFilter = { department: 'IT' }
    } else if (user.role === 'SALES_ADMIN') {
      departmentFilter = { department: 'SALES' }
    } else if (user.role === 'MAINTENANCE_ADMIN') {
      departmentFilter = { department: 'MAINTENANCE' }
    }

    const whereClause = {
      tenantId: user.tenantId,
      ...departmentFilter
    }

    // Run count and data query in parallel
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
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
          branch: {
            select: {
              id: true,
              name: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              color: true
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
          invoices: {
            where: { isActive: true },
            select: {
              id: true,
              invoiceNumber: true,
              amount: true,
              status: true,
              invoiceFileUrl: true
            },
            take: 1
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.ticket.count({ where: whereClause })
    ])

    return NextResponse.json({ 
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch admin tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}