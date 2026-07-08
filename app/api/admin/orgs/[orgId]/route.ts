import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adapterAuthorized } from '@/lib/admin/adapter-auth'
import {
  tenantStatus,
  userStatus,
  canManageRole,
  ASSIGNABLE_ROLES,
} from '@/lib/admin/mappings'

export const dynamic = 'force-dynamic'

/** One tenant's access picture: members + pending invitations. */
export async function GET(req: Request, { params }: { params: { orgId: string } }) {
  if (!adapterAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.orgId },
    include: {
      subscription: { select: { plan: true } },
      _count: { select: { users: true } },
    },
  })
  if (!tenant) return NextResponse.json({ error: 'org not found' }, { status: 404 })

  const [members, invites] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.userInvitation.findMany({
      where: { tenantId: tenant.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        invitedRole: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
      },
    }),
  ])

  return NextResponse.json({
    org: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.subscription?.plan ? tenant.subscription.plan.toLowerCase() : null,
      memberCount: tenant._count.users,
      status: tenantStatus(tenant.status),
      createdAt: tenant.createdAt.toISOString(),
    },
    members: members.map((m) => ({
      userId: m.id,
      email: m.email,
      name: m.name,
      role: m.role,
      memberType: null,
      status: userStatus(m.status),
      joinedAt: m.createdAt.toISOString(),
      canManage: canManageRole(m.role),
    })),
    invitations: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.invitedRole ?? 'END_USER',
      createdAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt ? i.expiresAt.toISOString() : null,
      acceptedAt: i.acceptedAt ? i.acceptedAt.toISOString() : null,
    })),
    roles: [...ASSIGNABLE_ROLES],
  })
}
