import { NextRequest, NextResponse } from 'next/server'
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

    // Ensure user has tenantId
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
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId: user.tenantId,
        ...departmentFilter
      },
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
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            mimeType: true
          }
        },
        messages: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Limit for initial load
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
            invoiceFileUrl: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ tickets }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch admin tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}