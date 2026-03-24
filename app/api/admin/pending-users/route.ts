import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// GET - List pending users awaiting approval
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId, sessionClaims } = await auth()
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
    const tenantId = meta.tenantId ?? null
    const role = (meta.role as string) ?? 'END_USER'

    const adminRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']
    if (!adminRoles.includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!tenantId && role !== 'SUPER_ADMIN') {
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
