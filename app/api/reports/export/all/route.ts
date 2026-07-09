import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/auth'
import { getDateRange } from '@/lib/reports/date-utils'
import { exportAllReports } from '@/lib/reports/exporters'
import { format } from 'date-fns'

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

    const zipBlob = await exportAllReports(tenantId, from, to)
    const dateStr = format(new Date(), 'yyyy-MM-dd')

    // Convert Blob to ArrayBuffer for the response
    const arrayBuffer = await zipBlob.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="ticktrack-reports-${dateStr}.zip"`,
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
