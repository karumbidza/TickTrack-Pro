import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Support bridge — the in-app widget (tenant admins) posts here; this route
 * forwards to Pulse using the adapter secret (kept server-side). The org is the
 * caller's own tenant, taken from auth — never trusted from the client.
 */

const PULSE_URL = process.env.PULSE_URL
const SECRET = process.env.ADMIN_ADAPTER_SECRET

async function requester() {
  if (!PULSE_URL || !SECRET) {
    return { error: NextResponse.json({ error: 'support not configured' }, { status: 503 }) }
  }
  const ctx = await getAuthContext()
  if (!ctx) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  if (!ctx.isAdmin || !ctx.tenantId) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { email: true } })
  return { orgId: ctx.tenantId, userId: ctx.userId, label: user?.email ?? null }
}

export async function GET() {
  const r = await requester()
  if (r.error) return r.error
  const res = await fetch(
    `${PULSE_URL}/api/support/messages?orgId=${encodeURIComponent(r.orgId)}&requesterUserId=${encodeURIComponent(r.userId)}`,
    { headers: { authorization: `Bearer ${SECRET}` }, cache: 'no-store' },
  )
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { body?: string }
  if (!body.body?.trim()) return NextResponse.json({ error: 'body required' }, { status: 400 })
  const r = await requester()
  if (r.error) return r.error

  const res = await fetch(`${PULSE_URL}/api/support/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      orgId: r.orgId,
      requesterUserId: r.userId,
      requesterLabel: r.label,
      body: body.body,
    }),
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
