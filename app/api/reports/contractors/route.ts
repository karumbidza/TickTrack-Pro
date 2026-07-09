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

    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
        assignedToId: { not: null },
      },
      select: {
        id: true,
        assetId: true,
        status: true,
        createdAt: true,
        completedAt: true,
        resolvedAt: true,
        firstResponseAt: true,
        assignedAt: true,
        assignedToId: true,
        slaResolutionBreached: true,
        slaFirstResponseBreached: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        invoices: { where: { isActive: true }, select: { amount: true } },
        ratings: { select: { overallRating: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const byContractor = new Map<string, {
      contractorId: string
      name: string
      email: string
      jobs: typeof tickets
    }>()

    for (const t of tickets) {
      if (!t.assignedToId || !t.assignedTo) continue
      const c = byContractor.get(t.assignedTo.id) ?? {
        contractorId: t.assignedTo.id,
        name: t.assignedTo.name ?? '',
        email: t.assignedTo.email ?? '',
        jobs: [],
      }
      c.jobs.push(t)
      byContractor.set(t.assignedTo.id, c)
    }

    const results = []
    for (const { contractorId, name, email, jobs } of byContractor.values()) {
      const completed = jobs.filter((t) => ['COMPLETED', 'CLOSED'].includes(t.status))

      let recalls = 0
      for (const t of completed) {
        if (!t.assetId || !t.completedAt) continue
        const sevenDaysLater = new Date(t.completedAt.getTime() + 7 * 86_400_000)
        const recall = jobs.find(
          (other) =>
            other.id !== t.id &&
            other.assetId === t.assetId &&
            other.createdAt > t.completedAt! &&
            other.createdAt <= sevenDaysLater
        )
        if (recall) recalls++
      }

      const totalInvoiced = jobs.reduce((sum, t) => sum + (t.invoices[0]?.amount ?? 0), 0)
      const allRatings = jobs.flatMap((t) => t.ratings.map((r) => r.overallRating))
      const avgRating = allRatings.length > 0
        ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
        : null

      const responseTimes = jobs
        .map((t) => {
          const fr = t.firstResponseAt ?? t.assignedAt
          if (!fr) return null
          return Math.round(((fr.getTime() - t.createdAt.getTime()) / 3_600_000) * 10) / 10
        })
        .filter((v): v is number => v !== null)
      const avgResponse = responseTimes.length > 0
        ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
        : null

      const slaCompliant = completed.filter((t) => !t.slaResolutionBreached && !t.slaFirstResponseBreached)
      const slaRate = completed.length > 0
        ? Math.round((slaCompliant.length / completed.length) * 100 * 10) / 10
        : null

      results.push({
        contractorId,
        name,
        email,
        totalJobs: jobs.length,
        completedJobs: completed.length,
        recallCount: recalls,
        avgRating,
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        avgInvoice: jobs.length > 0 && totalInvoiced
          ? Math.round((totalInvoiced / jobs.length) * 100) / 100
          : null,
        avgResponseHours: avgResponse,
        slaCompliancePct: slaRate,
      })
    }

    results.sort((a, b) => b.totalJobs - a.totalJobs)
    return NextResponse.json(results)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    if (msg === 'Unauthorized' || msg === 'No organisation context') {
      return NextResponse.json({ error: msg }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
