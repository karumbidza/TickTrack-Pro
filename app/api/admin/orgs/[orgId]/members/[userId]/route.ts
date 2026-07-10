import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adapterAuthorized } from '@/lib/admin/adapter-auth'
import { ASSIGNABLE_ROLES } from '@/lib/admin/mappings'
import type { UserRole } from '@prisma/client'

export const dynamic = 'force-dynamic'

type Ctx = { params: { orgId: string; userId: string } }

/** Enable or disable a member's access. Disabling suspends the account
 *  (status=SUSPENDED, isActive=false); enabling restores it (status=ACTIVE). */
export async function POST(req: Request, { params }: Ctx) {
  if (!adapterAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = (await req.json().catch(() => ({}))) as { action?: string }
  if (body.action !== 'disable' && body.action !== 'enable') {
    return NextResponse.json({ error: 'action must be "disable" or "enable"' }, { status: 400 })
  }

  const target = await prisma.user.findFirst({
    where: { id: params.userId, tenantId: params.orgId },
    select: { role: true },
  })
  if (!target) return NextResponse.json({ error: 'member not found' }, { status: 404 })
  if (target.role === 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'cannot manage a platform super admin' }, { status: 400 })
  }

  const disable = body.action === 'disable'
  await prisma.user.update({
    where: { id: params.userId },
    data: { status: disable ? 'SUSPENDED' : 'ACTIVE', isActive: !disable },
  })
  return NextResponse.json({ ok: true })
}

/** Change a member's role. Restricted to tenant-assignable roles; never touches a
 *  platform super admin and never grants SUPER_ADMIN. */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!adapterAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = (await req.json().catch(() => ({}))) as { role?: string }
  const role = body.role ?? ''
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json(
      { error: `role must be one of ${ASSIGNABLE_ROLES.join(', ')}` },
      { status: 400 },
    )
  }

  const target = await prisma.user.findFirst({
    where: { id: params.userId, tenantId: params.orgId },
    select: { role: true },
  })
  if (!target) return NextResponse.json({ error: 'member not found' }, { status: 404 })
  if (target.role === 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'cannot change a platform super admin' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: params.userId },
    data: { role: role as UserRole },
  })
  return NextResponse.json({ ok: true })
}
