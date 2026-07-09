import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDateRange } from '@/lib/reports/date-utils'
import { TicketStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authCtx = await requireTenantAuth()
    const { tenantId } = authCtx

    const { searchParams } = new URL(request.url)
    const rangeParam = searchParams.get('range') ?? '30d'
    const { from, to } = getDateRange(
      rangeParam,
      searchParams.get('dateFrom') ?? undefined,
      searchParams.get('dateTo') ?? undefined
    )

    const completedStatuses: TicketStatus[] = [TicketStatus.COMPLETED, TicketStatus.CLOSED]

    // ── MTTR ──────────────────────────────────────────────────────────────────
    const closedTickets = await prisma.ticket.findMany({
      where: {
        tenantId,
        status: { in: completedStatuses },
        createdAt: { gte: from, lte: to },
        OR: [
          { resolvedAt: { not: null } },
          { completedAt: { not: null } },
        ],
      },
      select: { createdAt: true, resolvedAt: true, completedAt: true },
    })

    let mttr: number | null = null
    if (closedTickets.length > 0) {
      const totalMs = closedTickets.reduce((sum, t) => {
        const end = t.resolvedAt ?? t.completedAt!
        return sum + (end.getTime() - t.createdAt.getTime())
      }, 0)
      mttr = Math.round((totalMs / closedTickets.length / 3_600_000) * 10) / 10
    }

    // ── MTBF ──────────────────────────────────────────────────────────────────
    const assetTickets = await prisma.ticket.findMany({
      where: {
        tenantId,
        assetId: { not: null },
        createdAt: { gte: from, lte: to },
      },
      select: { assetId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const byAsset = new Map<string, Date[]>()
    for (const t of assetTickets) {
      if (!t.assetId) continue
      const arr = byAsset.get(t.assetId) ?? []
      arr.push(t.createdAt)
      byAsset.set(t.assetId, arr)
    }

    const assetIntervals: number[] = []
    for (const [, dates] of byAsset) {
      if (dates.length < 2) continue
      const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
      let totalDays = 0
      for (let i = 1; i < sorted.length; i++) {
        totalDays += (sorted[i].getTime() - sorted[i - 1].getTime()) / 86_400_000
      }
      assetIntervals.push(totalDays / (sorted.length - 1))
    }

    let mtbf: number | null = null
    if (assetIntervals.length > 0) {
      mtbf = Math.round(
        assetIntervals.reduce((a, b) => a + b, 0) / assetIntervals.length
      )
    }

    // ── SLA Compliance ────────────────────────────────────────────────────────
    const slaTickets = await prisma.ticket.findMany({
      where: {
        tenantId,
        status: { in: completedStatuses },
        createdAt: { gte: from, lte: to },
      },
      select: { slaResolutionBreached: true, slaFirstResponseBreached: true },
    })

    let slaRate: number | null = null
    if (slaTickets.length > 0) {
      const compliant = slaTickets.filter(
        (t) => !t.slaResolutionBreached && !t.slaFirstResponseBreached
      ).length
      slaRate = Math.round((compliant / slaTickets.length) * 100 * 10) / 10
    }

    // ── Repeat Jobs ───────────────────────────────────────────────────────────
    const repeatAssets = new Set<string>()
    for (const [assetId, dates] of byAsset) {
      const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
      for (let i = 0; i < sorted.length; i++) {
        const windowEnd = new Date(sorted[i].getTime() + 30 * 86_400_000)
        const inWindow = sorted.filter((d) => d >= sorted[i] && d <= windowEnd)
        if (inWindow.length >= 3) {
          repeatAssets.add(assetId)
          break
        }
      }
    }

    return NextResponse.json({
      mttr,
      mtbf,
      slaRate,
      repeatJobs: repeatAssets.size,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    if (msg === 'Unauthorized' || msg === 'No organisation context') {
      return NextResponse.json({ error: msg }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
