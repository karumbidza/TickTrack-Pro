import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDateRange } from '@/lib/reports/date-utils'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantAuth()
    const { searchParams } = new URL(request.url)
    const { from, to } = getDateRange(
      searchParams.get('range') ?? '30d',
      searchParams.get('dateFrom') ?? undefined,
      searchParams.get('dateTo') ?? undefined
    )

    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId,
        assetId: { not: null },
        createdAt: { gte: from, lte: to },
      },
      select: {
        assetId: true,
        createdAt: true,
        asset: { select: { name: true, assetNumber: true } },
        branch: { select: { name: true } },
        category: { select: { name: true } },
        status: true,
        invoices: {
          where: { isActive: true },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by asset
    const byAsset = new Map<string, {
      assetId: string
      assetName: string
      assetNumber: string
      branchName: string
      category: string
      jobCount: number
      totalCost: number
      firstJobDate: Date
      lastJobDate: Date
      avgDaysBetween: number | null
    }>()

    for (const t of tickets) {
      if (!t.assetId) continue
      const cost = t.invoices.reduce((s, inv) => s + inv.amount, 0)
      const existing = byAsset.get(t.assetId)
      if (existing) {
        existing.jobCount++
        existing.totalCost += cost
        if (t.createdAt > existing.lastJobDate) existing.lastJobDate = t.createdAt
      } else {
        byAsset.set(t.assetId, {
          assetId: t.assetId,
          assetName: t.asset?.name ?? 'Unknown',
          assetNumber: t.asset?.assetNumber ?? '',
          branchName: t.branch?.name ?? '',
          category: t.category?.name ?? '',
          jobCount: 1,
          totalCost: cost,
          firstJobDate: t.createdAt,
          lastJobDate: t.createdAt,
          avgDaysBetween: null,
        })
      }
    }

    // Calculate avg days between failures
    for (const [assetId, data] of byAsset) {
      if (data.jobCount < 2) continue
      const assetTickets = tickets.filter((t) => t.assetId === assetId).sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      )
      let totalDays = 0
      for (let i = 1; i < assetTickets.length; i++) {
        totalDays += (assetTickets[i].createdAt.getTime() - assetTickets[i - 1].createdAt.getTime()) / 86_400_000
      }
      data.avgDaysBetween = Math.round((totalDays / (assetTickets.length - 1)) * 10) / 10
    }

    const results = [...byAsset.values()]
      .filter((a) => a.jobCount >= 2)
      .sort((a, b) => b.jobCount - a.jobCount)
      .map((a) => ({
        ...a,
        totalCost: Math.round(a.totalCost * 100) / 100,
        firstJobDate: format(a.firstJobDate, 'yyyy-MM-dd'),
        lastJobDate: format(a.lastJobDate, 'yyyy-MM-dd'),
      }))

    return NextResponse.json(results)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    if (msg === 'Unauthorized' || msg === 'No organisation context') {
      return NextResponse.json({ error: msg }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
