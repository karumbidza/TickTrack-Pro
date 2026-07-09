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

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        ticket: {
          select: {
            ticketNumber: true,
            branch: { select: { name: true, maintenanceBudget: true } },
            asset: { select: { name: true } },
            category: { select: { name: true } },
            assignedTo: { select: { name: true } },
          },
        },
      },
      orderBy: { amount: 'desc' },
    })

    // Compute branch spend totals
    const branchSpend = new Map<string, number>()
    for (const inv of invoices) {
      if (inv.status === 'APPROVED' || inv.status === 'PAID') {
        const branchName = inv.ticket.branch?.name ?? ''
        branchSpend.set(branchName, (branchSpend.get(branchName) ?? 0) + inv.amount)
      }
    }

    const results = invoices.map((inv) => {
      const branchName = inv.ticket.branch?.name ?? ''
      const budget = inv.ticket.branch?.maintenanceBudget ?? null
      const spend = branchSpend.get(branchName) ?? 0
      return {
        id: inv.id,
        ticketNumber: inv.ticket.ticketNumber ?? '',
        branchName,
        assetName: inv.ticket.asset?.name ?? '',
        category: inv.ticket.category?.name ?? '',
        contractor: inv.ticket.assignedTo?.name ?? '',
        amount: inv.amount,
        status: inv.status,
        date: format(inv.createdAt, 'yyyy-MM-dd'),
        branchBudget: budget,
        branchSpend: Math.round(spend * 100) / 100,
        overBudget: budget !== null && spend > budget,
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
