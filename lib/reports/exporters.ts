import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import JSZip from 'jszip'

// ─── helpers ─────────────────────────────────────────────────────────────────

function row(values: (string | number | boolean | null | undefined)[]): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    })
    .join(',')
}

function csv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  return [row(headers), ...rows.map(row)].join('\n')
}

function hoursBetween(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 10) / 10
}

function fmt(d: Date | null | undefined): string {
  if (!d) return ''
  return format(d, 'yyyy-MM-dd HH:mm')
}

// ─── exportTicketReport ───────────────────────────────────────────────────────

export async function exportTicketReport(
  organisationId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<string> {
  const tickets = await prisma.ticket.findMany({
    where: {
      tenantId: organisationId,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    include: {
      branch: true,
      category: true,
      assignedTo: true,
      user: true,
      invoices: { where: { isActive: true } },
      asset: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Ticket Number', 'Title', 'Description', 'Branch', 'Category', 'Type',
    'Priority', 'Status', 'Requester Name', 'Requester Email',
    'Assigned Contractor', 'Date Created', 'First Response At', 'Date Closed',
    'Time To Close (hours)', 'SLA Status', 'SLA First Response Due',
    'SLA Resolution Due', 'SLA Breached', 'Invoice Amount',
    'Asset Name', 'Asset Number',
  ]

  const rows = tickets.map((t) => {
    const invoice = t.invoices[0]
    const ttc = hoursBetween(t.createdAt, t.completedAt ?? t.resolvedAt)
    const slaBreached = t.slaResolutionBreached || t.slaFirstResponseBreached
    return [
      t.ticketNumber ?? t.id,
      t.title,
      t.description,
      t.branch?.name ?? '',
      t.category?.name ?? '',
      t.type,
      t.priority,
      t.status,
      t.reporterName ?? t.user?.name ?? '',
      t.user?.email ?? '',
      t.assignedTo?.name ?? '',
      fmt(t.createdAt),
      fmt(t.firstResponseAt ?? t.assignedAt),
      fmt(t.completedAt ?? t.resolvedAt),
      ttc ?? '',
      slaBreached ? 'BREACHED' : 'OK',
      fmt(t.responseDeadline),
      fmt(t.resolutionDeadline),
      slaBreached ? 'Y' : 'N',
      invoice?.amount ?? '',
      t.asset?.name ?? '',
      t.asset?.assetNumber ?? '',
    ]
  })

  return csv(headers, rows)
}

// ─── exportRepeatJobsReport ───────────────────────────────────────────────────

export async function exportRepeatJobsReport(
  organisationId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<string> {
  const tickets = await prisma.ticket.findMany({
    where: {
      tenantId: organisationId,
      createdAt: { gte: dateFrom, lte: dateTo },
      assetId: { not: null },
    },
    include: {
      asset: true,
      branch: true,
      assignedTo: true,
      invoices: { where: { isActive: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Group by assetId
  const byAsset = new Map<string, typeof tickets>()
  for (const t of tickets) {
    if (!t.assetId) continue
    const arr = byAsset.get(t.assetId) ?? []
    arr.push(t)
    byAsset.set(t.assetId, arr)
  }

  const headers = [
    'Asset Name', 'Asset Number', 'Branch', 'Category',
    'Job Count', 'First Job Date', 'Last Job Date', 'Days Between Failures',
    'Total Cost', 'Contractor Names', 'Recommendation',
  ]

  const rows: (string | number | null)[][] = []

  for (const [, group] of byAsset) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const daysBetween =
      sorted.length >= 2
        ? Math.round(
            (last.createdAt.getTime() - first.createdAt.getTime()) /
              86_400_000 /
              (sorted.length - 1)
          )
        : null

    const totalCost = group.reduce((sum, t) => {
      const inv = t.invoices[0]
      return sum + (inv?.amount ?? 0)
    }, 0)

    const contractors = [...new Set(group.map((t) => t.assignedTo?.name).filter(Boolean))].join('; ')

    const jobCount = group.length
    const recommendation =
      jobCount >= 4 ? 'Consider replacement' : jobCount === 3 ? 'Review with contractor' : 'Monitor'

    rows.push([
      first.asset?.name ?? '',
      first.asset?.assetNumber ?? '',
      first.branch?.name ?? '',
      first.asset ? '' : '',
      jobCount,
      fmt(first.createdAt),
      fmt(last.createdAt),
      daysBetween ?? '',
      totalCost ? Math.round(totalCost * 100) / 100 : '',
      contractors,
      recommendation,
    ])
  }

  return csv(headers, rows)
}

// ─── exportCostReport ─────────────────────────────────────────────────────────

export async function exportCostReport(
  organisationId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<string> {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: organisationId,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    include: {
      ticket: {
        include: {
          branch: true,
          asset: true,
          category: true,
          assignedTo: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get branch spend totals and budgets
  const branchSpend = new Map<string, number>()
  const branchBudget = new Map<string, number>()

  for (const inv of invoices) {
    const branchId = inv.ticket.branchId ?? ''
    if (inv.status === 'APPROVED' || inv.status === 'PAID') {
      branchSpend.set(branchId, (branchSpend.get(branchId) ?? 0) + inv.amount)
    }
    if (inv.ticket.branch?.maintenanceBudget) {
      branchBudget.set(branchId, inv.ticket.branch.maintenanceBudget)
    }
  }

  const headers = [
    'Branch', 'Asset Name', 'Asset Category', 'Ticket Number', 'Contractor',
    'Invoice Amount', 'Invoice Date', 'Invoice Status', 'Budget Period',
    'Branch Budget', 'Branch Spend To Date', 'Budget Remaining', 'Over Budget (Y/N)',
  ]

  const dateLabel = `${fmt(dateFrom)} to ${fmt(dateTo)}`

  const rows = invoices.map((inv) => {
    const branchId = inv.ticket.branchId ?? ''
    const budget = branchBudget.get(branchId) ?? 0
    const spend = branchSpend.get(branchId) ?? 0
    const remaining = budget - spend
    return [
      inv.ticket.branch?.name ?? '',
      inv.ticket.asset?.name ?? '',
      inv.ticket.category?.name ?? '',
      inv.ticket.ticketNumber ?? inv.ticketId,
      inv.ticket.assignedTo?.name ?? '',
      inv.amount,
      fmt(inv.createdAt),
      inv.status,
      dateLabel,
      budget || '',
      spend ? Math.round(spend * 100) / 100 : '',
      budget ? Math.round(remaining * 100) / 100 : '',
      budget && spend > budget ? 'Y' : 'N',
    ]
  })

  return csv(headers, rows)
}

// ─── exportSLAReport ──────────────────────────────────────────────────────────

export async function exportSLAReport(
  organisationId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<string> {
  const tickets = await prisma.ticket.findMany({
    where: {
      tenantId: organisationId,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    include: { branch: true },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Ticket Number', 'Title', 'Priority', 'Branch',
    'Created At', 'First Response Due', 'First Response At', 'First Response Breached (Y/N)',
    'Resolution Due', 'Resolved At', 'Resolution Breached (Y/N)',
    'Time To First Response (hours)', 'Time To Resolution (hours)', 'SLA Status',
  ]

  const rows = tickets.map((t) => {
    const firstResponseAt = t.firstResponseAt ?? t.assignedAt
    const resolvedAt = t.resolvedAt ?? t.completedAt
    const ttfr = hoursBetween(t.createdAt, firstResponseAt)
    const ttr = hoursBetween(t.createdAt, resolvedAt)
    const slaStatus =
      t.slaResolutionBreached || t.slaFirstResponseBreached ? 'BREACHED' : 'COMPLIANT'
    return [
      t.ticketNumber ?? t.id,
      t.title,
      t.priority,
      t.branch?.name ?? '',
      fmt(t.createdAt),
      fmt(t.responseDeadline),
      fmt(firstResponseAt),
      t.slaFirstResponseBreached ? 'Y' : 'N',
      fmt(t.resolutionDeadline),
      fmt(resolvedAt),
      t.slaResolutionBreached ? 'Y' : 'N',
      ttfr ?? '',
      ttr ?? '',
      slaStatus,
    ]
  })

  return csv(headers, rows)
}

// ─── exportContractorReport ───────────────────────────────────────────────────

export async function exportContractorReport(
  organisationId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<string> {
  const tickets = await prisma.ticket.findMany({
    where: {
      tenantId: organisationId,
      createdAt: { gte: dateFrom, lte: dateTo },
      assignedToId: { not: null },
    },
    include: {
      assignedTo: true,
      invoices: { where: { isActive: true } },
      ratings: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Group by contractor
  const byContractor = new Map<
    string,
    {
      name: string
      email: string
      jobs: typeof tickets
    }
  >()

  for (const t of tickets) {
    if (!t.assignedToId || !t.assignedTo) continue
    const c = byContractor.get(t.assignedToId) ?? {
      name: t.assignedTo.name ?? '',
      email: t.assignedTo.email ?? '',
      jobs: [],
    }
    c.jobs.push(t)
    byContractor.set(t.assignedToId, c)
  }

  const headers = [
    'Contractor Name', 'Contractor Email', 'Specialty', 'Total Jobs',
    'Completed Jobs', 'Recall Count', 'Average Rating', 'Total Invoiced',
    'Average Invoice Amount', 'Average Response Time (hours)', 'SLA Compliance %',
  ]

  const rows: (string | number | null)[][] = []

  for (const [contractorId, { name, email, jobs }] of byContractor) {
    const completed = jobs.filter((t) =>
      ['COMPLETED', 'CLOSED'].includes(t.status)
    )

    // Recall: new ticket on same asset within 7 days of job completion
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
    const avgRating =
      allRatings.length > 0
        ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
        : null

    const responseTimes = jobs
      .map((t) => hoursBetween(t.createdAt, t.firstResponseAt ?? t.assignedAt))
      .filter((v): v is number => v !== null)
    const avgResponse =
      responseTimes.length > 0
        ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
        : null

    const slaJobs = jobs.filter((t) => ['COMPLETED', 'CLOSED'].includes(t.status))
    const slaCompliant = slaJobs.filter(
      (t) => !t.slaResolutionBreached && !t.slaFirstResponseBreached
    )
    const slaRate =
      slaJobs.length > 0
        ? Math.round((slaCompliant.length / slaJobs.length) * 100 * 10) / 10
        : null

    rows.push([
      name,
      email,
      '',
      jobs.length,
      completed.length,
      recalls,
      avgRating ?? '',
      totalInvoiced ? Math.round(totalInvoiced * 100) / 100 : '',
      jobs.length > 0 && totalInvoiced
        ? Math.round((totalInvoiced / jobs.length) * 100) / 100
        : '',
      avgResponse ?? '',
      slaRate !== null ? `${slaRate}%` : '',
    ])
  }

  return csv(headers, rows)
}

// ─── exportBranchReport ───────────────────────────────────────────────────────

export async function exportBranchReport(
  organisationId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<string> {
  const branches = await prisma.branch.findMany({
    where: { tenantId: organisationId },
    include: {
      tickets: {
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
        include: {
          invoices: { where: { isActive: true, status: { in: ['APPROVED', 'PAID'] } } },
          category: true,
          assignedTo: true,
        },
      },
    },
  })

  const headers = [
    'Branch Name', 'Location', 'Total Tickets', 'Open Tickets', 'Completed Tickets',
    'Average Resolution Time (hours)', 'SLA Compliance %', 'Total Maintenance Spend',
    'Budget', 'Budget Variance', 'Repeat Job Count', 'Most Common Issue Category',
    'Top Contractor Used',
  ]

  const rows = branches.map((b) => {
    const tickets = b.tickets
    const open = tickets.filter((t) => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(t.status)).length
    const completed = tickets.filter((t) => ['COMPLETED', 'CLOSED'].includes(t.status))

    const resTimes = completed
      .map((t) => hoursBetween(t.createdAt, t.resolvedAt ?? t.completedAt))
      .filter((v): v is number => v !== null)
    const avgRes =
      resTimes.length > 0
        ? Math.round((resTimes.reduce((a, b) => a + b, 0) / resTimes.length) * 10) / 10
        : null

    const slaCompliant = completed.filter(
      (t) => !t.slaResolutionBreached && !t.slaFirstResponseBreached
    )
    const slaRate =
      completed.length > 0
        ? Math.round((slaCompliant.length / completed.length) * 100 * 10) / 10
        : null

    const totalSpend = tickets.reduce(
      (sum, t) => sum + t.invoices.reduce((s, inv) => s + inv.amount, 0),
      0
    )

    // Repeat jobs: assets with 3+ tickets in any 30-day window
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

    // Most common category
    const catCount = new Map<string, number>()
    for (const t of tickets) {
      if (t.category?.name) catCount.set(t.category.name, (catCount.get(t.category.name) ?? 0) + 1)
    }
    const topCat = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

    // Top contractor
    const contCount = new Map<string, number>()
    for (const t of tickets) {
      if (t.assignedTo?.name) contCount.set(t.assignedTo.name, (contCount.get(t.assignedTo.name) ?? 0) + 1)
    }
    const topCont = [...contCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

    const budget = b.maintenanceBudget ?? 0
    const variance = budget ? Math.round((budget - totalSpend) * 100) / 100 : null

    return [
      b.name,
      b.address ?? '',
      tickets.length,
      open,
      completed.length,
      avgRes ?? '',
      slaRate !== null ? `${slaRate}%` : '',
      totalSpend ? Math.round(totalSpend * 100) / 100 : '',
      budget || '',
      variance ?? '',
      repeatCount,
      topCat,
      topCont,
    ]
  })

  return csv(headers, rows)
}

// ─── exportAllReports ─────────────────────────────────────────────────────────

export async function exportAllReports(
  orgId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<Blob> {
  const zip = new JSZip()
  const dateStr = format(new Date(), 'yyyy-MM-dd')

  zip.file(`tickets-${dateStr}.csv`, await exportTicketReport(orgId, dateFrom, dateTo))
  zip.file(`repeat-jobs-${dateStr}.csv`, await exportRepeatJobsReport(orgId, dateFrom, dateTo))
  zip.file(`costs-${dateStr}.csv`, await exportCostReport(orgId, dateFrom, dateTo))
  zip.file(`sla-${dateStr}.csv`, await exportSLAReport(orgId, dateFrom, dateTo))
  zip.file(`contractors-${dateStr}.csv`, await exportContractorReport(orgId, dateFrom, dateTo))
  zip.file(`branches-${dateStr}.csv`, await exportBranchReport(orgId, dateFrom, dateTo))

  return zip.generateAsync({ type: 'blob' })
}
