import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List pending users awaiting approval
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'PENDING_APPROVAL'

    const where: any = {
      tenantId: tenantId!
    }

    if (status !== 'all') {
      where.status = status
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: true,
        createdAt: true,
        invitedBy: {
          select: { id: true, name: true, email: true }
        },
        invitedFromInvitation: {
          select: { createdAt: true }
        },
        branches: {
          include: { branch: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Error fetching pending users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
