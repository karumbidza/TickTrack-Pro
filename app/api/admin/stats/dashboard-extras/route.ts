import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_ROLES = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const RESOLVED = ['COMPLETED', 'CLOSED'] as const

/**
 * GET /api/admin/stats/dashboard-extras
 * Dashboard-only aggregates that the main stats route doesn't cover:
 *  - weekly created/resolved volume for the last 8 weeks
 *  - SLA compliance % MTD (resolution deadline met) + delta vs last month
 * Tenant-scoped, admin-gated.
 */
export async function GET() {
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ctx.isSuperAdmin && !ADMIN_ROLES.includes(ctx.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!ctx.tenantId) return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    const tenantId = ctx.tenantId

    const now = new Date()
    const windowStart = new Date(now.getTime() - 8 * WEEK_MS)

    // ── Weekly volume ─────────────────────────────────────────────
    const [created, resolved] = await Promise.all([
      prisma.ticket.findMany({
        where: { tenantId, createdAt: { gte: windowStart } },
        select: { createdAt: true },
      }),
      prisma.ticket.findMany({
        where: { tenantId, status: { in: [...RESOLVED] }, completedAt: { gte: windowStart } },
        select: { completedAt: true },
      }),
    ])

    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(now.getTime() - (8 - i) * WEEK_MS)
      const end = new Date(now.getTime() - (7 - i) * WEEK_MS)
      const label = `${start.getDate()}/${start.getMonth() + 1}`
      const inRange = (d: Date | null) => !!d && d >= start && d < end
      return {
        label,
        created: created.filter((t) => inRange(t.createdAt)).length,
        resolved: resolved.filter((t) => inRange(t.completedAt)).length,
      }
    })

    // ── SLA compliance (resolution deadline met) ──────────────────
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const judged = await prisma.ticket.findMany({
      where: {
        tenantId,
        status: { in: [...RESOLVED] },
        completedAt: { gte: startOfLastMonth },
        resolutionDeadline: { not: null },
      },
      select: { completedAt: true, resolutionDeadline: true },
    })

    const rateFor = (from: Date, to?: Date) => {
      const rows = judged.filter((t) => t.completedAt && t.completedAt >= from && (!to || t.completedAt < to))
      if (rows.length === 0) return null
      const met = rows.filter((t) => t.completedAt! <= t.resolutionDeadline!).length
      return Math.round((met / rows.length) * 1000) / 10
    }

    const rate = rateFor(startOfThisMonth)
    const lastRate = rateFor(startOfLastMonth, startOfThisMonth)
    const delta = rate !== null && lastRate !== null ? Math.round((rate - lastRate) * 10) / 10 : null

    return NextResponse.json({ weeks, sla: { rate, delta } })
  } catch (error) {
    console.error('Failed to fetch dashboard extras:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
