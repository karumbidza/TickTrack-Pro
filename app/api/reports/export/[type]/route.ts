import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/auth'
import { getDateRange } from '@/lib/reports/date-utils'
import {
  exportTicketReport,
  exportRepeatJobsReport,
  exportCostReport,
  exportSLAReport,
  exportContractorReport,
  exportBranchReport,
} from '@/lib/reports/exporters'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['tickets', 'repeat-jobs', 'costs', 'sla', 'contractors', 'branches'] as const
type ReportType = (typeof VALID_TYPES)[number]

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const authCtx = await requireTenantAuth()
    const { tenantId } = authCtx

    const type = params.type as ReportType
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const rangeParam = searchParams.get('range') ?? '30d'
    const { from, to } = getDateRange(
      rangeParam,
      searchParams.get('dateFrom') ?? undefined,
      searchParams.get('dateTo') ?? undefined
    )

    const dateStr = format(new Date(), 'yyyy-MM-dd')

    const exportFns: Record<ReportType, () => Promise<string>> = {
      tickets: () => exportTicketReport(tenantId, from, to),
      'repeat-jobs': () => exportRepeatJobsReport(tenantId, from, to),
      costs: () => exportCostReport(tenantId, from, to),
      sla: () => exportSLAReport(tenantId, from, to),
      contractors: () => exportContractorReport(tenantId, from, to),
      branches: () => exportBranchReport(tenantId, from, to),
    }

    const filenames: Record<ReportType, string> = {
      tickets: `tickets-${dateStr}.csv`,
      'repeat-jobs': `repeat-jobs-${dateStr}.csv`,
      costs: `costs-${dateStr}.csv`,
      sla: `sla-performance-${dateStr}.csv`,
      contractors: `contractor-performance-${dateStr}.csv`,
      branches: `branch-comparison-${dateStr}.csv`,
    }

    const csvContent = await exportFns[type]()

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenames[type]}"`,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    if (msg === 'Unauthorized' || msg === 'No organisation context') {
      return NextResponse.json({ error: msg }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
