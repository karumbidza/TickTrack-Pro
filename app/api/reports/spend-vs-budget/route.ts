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
    const { from, to } = getDateRange(
      rangeParam,
      searchParams.get('dateFrom') ?? undefined,
      searchParams.get('dateTo') ?? undefined
    )

    const branches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        maintenanceBudget: true,
        tickets: {
          where: { createdAt: { gte: from, lte: to } },
          select: {
            invoices: {
              where: {
                isActive: true,
                status: { in: ['APPROVED', 'PAID'] },
              },
              select: { amount: true },
            },
          },
        },
      },
    })

    const results = branches
      .map((b) => {
        const totalSpend = b.tickets.reduce(
          (sum, t) => sum + t.invoices.reduce((s, inv) => s + inv.amount, 0),
          0
        )
        return {
          branchId: b.id,
          branchName: b.name,
          maintenanceBudget: b.maintenanceBudget,
          totalSpend: Math.round(totalSpend * 100) / 100,
        }
      })
      .sort((a, b) => {
        const ratioA = a.maintenanceBudget ? a.totalSpend / a.maintenanceBudget : 0
        const ratioB = b.maintenanceBudget ? b.totalSpend / b.maintenanceBudget : 0
        return ratioB - ratioA
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
