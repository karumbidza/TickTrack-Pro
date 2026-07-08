import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adapterAuthorized } from '@/lib/admin/adapter-auth'

export const dynamic = 'force-dynamic'

/** Adapter health probe for Pulse: service + DB reachability. */
export async function GET(req: Request) {
  if (!adapterAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let db = false
  try {
    await prisma.tenant.count()
    db = true
  } catch {
    db = false
  }

  return NextResponse.json({
    ok: true,
    service: 'ticktrack-pro',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    time: new Date().toISOString(),
    db,
  })
}
