import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adapterAuthorized } from '@/lib/admin/adapter-auth'
import { tenantStatus } from '@/lib/admin/mappings'

export const dynamic = 'force-dynamic'

/** List every tenant (org) with a member count and plan — the org roster for Pulse. */
export async function GET(req: Request) {
  if (!adapterAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      subscription: { select: { plan: true } },
      _count: { select: { users: true } },
    },
  })

  return NextResponse.json({
    orgs: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.subscription?.plan ? t.subscription.plan.toLowerCase() : null,
      memberCount: t._count.users,
      status: tenantStatus(t.status),
      createdAt: t.createdAt.toISOString(),
    })),
  })
}
