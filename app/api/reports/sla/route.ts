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
        createdAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
        firstResponseAt: true,
        assignedAt: true,
        resolvedAt: true,
        completedAt: true,
        responseDeadline: true,
        resolutionDeadline: true,
        slaFirstResponseBreached: true,
        slaResolutionBreached: true,
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    function hoursBetween(a: Date | null, b: Date | null): number | null {
      if (!a || !b) return null
      return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 10) / 10
    }

    const results = tickets.map((t) => {
      const firstResponseAt = t.firstResponseAt ?? t.assignedAt
      const resolvedAt = t.resolvedAt ?? t.completedAt
      return {
        id: t.id,
        ticketNumber: t.ticketNumber ?? t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        branchName: t.branch?.name ?? '',
        createdAt: format(t.createdAt, 'yyyy-MM-dd HH:mm'),
        responseDeadline: t.responseDeadline ? format(t.responseDeadline, 'yyyy-MM-dd HH:mm') : null,
        firstResponseAt: firstResponseAt ? format(firstResponseAt, 'yyyy-MM-dd HH:mm') : null,
        slaFirstResponseBreached: t.slaFirstResponseBreached,
        resolutionDeadline: t.resolutionDeadline ? format(t.resolutionDeadline, 'yyyy-MM-dd HH:mm') : null,
        resolvedAt: resolvedAt ? format(resolvedAt, 'yyyy-MM-dd HH:mm') : null,
        slaResolutionBreached: t.slaResolutionBreached,
        ttfr: hoursBetween(t.createdAt, firstResponseAt),
        ttr: hoursBetween(t.createdAt, resolvedAt),
        slaStatus: (t.slaResolutionBreached || t.slaFirstResponseBreached) ? 'BREACHED' : 'COMPLIANT',
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
