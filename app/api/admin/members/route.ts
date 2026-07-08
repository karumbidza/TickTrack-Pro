import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adapterAuthorized } from '@/lib/admin/adapter-auth'
import { userStatus, canManageRole } from '@/lib/admin/mappings'

export const dynamic = 'force-dynamic'

/** Cross-tenant people search for Pulse: find a person by email/name and see the
 *  tenant they belong to (with role + status). */
export async function GET(req: Request) {
  if (!adapterAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const limit = Math.min(Number(url.searchParams.get('limit')) || 25, 50)
  if (q.length < 2) return NextResponse.json({ people: [] })

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: limit,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      tenantId: true,
      tenant: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({
    people: users.map((u) => ({
      userId: u.id,
      email: u.email,
      name: u.name,
      orgs: u.tenant
        ? [
            {
              orgId: u.tenant.id,
              orgName: u.tenant.name,
              role: u.role,
              memberType: null,
              status: userStatus(u.status),
              canManage: canManageRole(u.role),
            },
          ]
        : [],
    })),
  })
}
