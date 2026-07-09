import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDateRange } from '@/lib/reports/date-utils'

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

    const branches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        maintenanceBudget: true,
        tickets: {
          where: { createdAt: { gte: from, lte: to } },
          select: {
            id: true,
            assetId: true,
            status: true,
            createdAt: true,
            resolvedAt: true,
            completedAt: true,
            slaResolutionBreached: true,
            slaFirstResponseBreached: true,
            category: { select: { name: true } },
            assignedTo: { select: { name: true } },
            invoices: {
              where: { isActive: true, status: { in: ['APPROVED', 'PAID'] } },
              select: { amount: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const results = branches.map((b) => {
      const tickets = b.tickets
      const open = tickets.filter((t) => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(t.status)).length
      const completed = tickets.filter((t) => ['COMPLETED', 'CLOSED'].includes(t.status))

      const resTimes = completed
        .map((t) => {
          const end = t.resolvedAt ?? t.completedAt
          if (!end) return null
          return Math.round(((end.getTime() - t.createdAt.getTime()) / 3_600_000) * 10) / 10
        })
        .filter((v): v is number => v !== null)
      const avgResHours = resTimes.length > 0
        ? Math.round((resTimes.reduce((a, b) => a + b, 0) / resTimes.length) * 10) / 10
        : null

      const slaCompliant = completed.filter((t) => !t.slaResolutionBreached && !t.slaFirstResponseBreached)
      const slaRate = completed.length > 0
        ? Math.round((slaCompliant.length / completed.length) * 100 * 10) / 10
        : null

      const totalSpend = tickets.reduce(
        (sum, t) => sum + t.invoices.reduce((s, inv) => s + inv.amount, 0),
        0
      )

      const catCount = new Map<string, number>()
      for (const t of tickets) {
        if (t.category?.name) catCount.set(t.category.name, (catCount.get(t.category.name) ?? 0) + 1)
      }
      const topCategory = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

      const contCount = new Map<string, number>()
      for (const t of tickets) {
        if (t.assignedTo?.name) contCount.set(t.assignedTo.name, (contCount.get(t.assignedTo.name) ?? 0) + 1)
      }
      const topContractor = [...contCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

      const assetTickets = new Map<string, Date[]>()
      for (const t of tickets) {
        if (!t.assetId) continue
        const arr = assetTickets.get(t.assetId) ?? []
        arr.push(t.createdAt)
        assetTickets.set(t.assetId, arr)
      }
      let repeatCount = 0
      for (const [, dates] of assetTickets) {
        const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
        for (let i = 0; i < sorted.length - 2; i++) {
          const windowEnd = new Date(sorted[i].getTime() + 30 * 86_400_000)
          const inWindow = sorted.filter((d) => d >= sorted[i] && d <= windowEnd)
          if (inWindow.length >= 3) { repeatCount++; break }
        }
      }

      const budget = b.maintenanceBudget ?? null
      const budgetVariance = budget !== null ? Math.round((budget - totalSpend) * 100) / 100 : null

      return {
        branchId: b.id,
        branchName: b.name,
        address: b.address ?? '',
        totalTickets: tickets.length,
        openTickets: open,
        completedTickets: completed.length,
        avgResolutionHours: avgResHours,
        slaCompliancePct: slaRate,
        totalSpend: Math.round(totalSpend * 100) / 100,
        budget,
        budgetVariance,
        repeatJobCount: repeatCount,
        topCategory,
        topContractor,
      }
    })

    return NextResponse.json(results)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    if (msg === 'Unauthorized' || msg === 'No organisation context') {
      return NextResponse.json({ error: msg }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
