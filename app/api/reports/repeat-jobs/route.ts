import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDateRange } from '@/lib/reports/date-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authCtx = await requireTenantAuth()
    const { tenantId } = authCtx

    const { searchParams } = new URL(request.url)
    const rangeParam = searchParams.get('range') ?? '30d'
    const limit = parseInt(searchParams.get('limit') ?? '5', 10)
    const { from, to } = getDateRange(
      rangeParam,
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
        invoices: {
          where: { isActive: true },
          select: { amount: true, status: true },
        },
        asset: {
          select: { name: true, assetNumber: true },
        },
        branch: {
          select: { name: true },
        },
        category: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by assetId
    const byAsset = new Map<
      string,
      {
        assetId: string
        assetName: string
        branchName: string
        category: string
        jobCount: number
        totalCost: number
      }
    >()

    for (const t of tickets) {
      if (!t.assetId) continue
      const existing = byAsset.get(t.assetId)
      const invoiceCost = t.invoices.reduce((sum, inv) => sum + inv.amount, 0)
      if (existing) {
        existing.jobCount++
        existing.totalCost += invoiceCost
      } else {
        byAsset.set(t.assetId, {
          assetId: t.assetId,
          assetName: t.asset?.name ?? 'Unknown',
          branchName: t.branch?.name ?? '',
          category: t.category?.name ?? '',
          jobCount: 1,
          totalCost: invoiceCost,
        })
      }
    }

    const results = [...byAsset.values()]
      .filter((a) => a.jobCount >= 2)
      .sort((a, b) => b.jobCount - a.jobCount || b.totalCost - a.totalCost)
      .slice(0, limit)
      .map((a) => ({ ...a, totalCost: Math.round(a.totalCost * 100) / 100 }))

    return NextResponse.json(results)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    if (msg === 'Unauthorized' || msg === 'No organisation context') {
      return NextResponse.json({ error: msg }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
