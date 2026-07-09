'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

// ─── types ────────────────────────────────────────────────────────────────────

interface KPIData {
  mttr: number | null
  mtbf: number | null
  slaRate: number | null
  repeatJobs: number
}

interface RepeatJob {
  assetId: string
  assetName: string
  branchName: string
  category: string
  jobCount: number
  totalCost: number
}

interface SpendBranch {
  branchId: string
  branchName: string
  maintenanceBudget: number | null
  totalSpend: number
}

// ─── icon SVGs ───────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b6860" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function ActivityIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

function AlertCircleIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

function CreditCardIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
}

function ClockIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function PeopleIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function BuildingIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <path d="M9 22V12h6v10"/>
      <path d="M3 9h18"/>
    </svg>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

function buildQueryString(range: string, customFrom: string, customTo: string): string {
  const params = new URLSearchParams({ range })
  if (range === 'custom') {
    if (customFrom) params.set('dateFrom', customFrom)
    if (customTo) params.set('dateTo', customTo)
  }
  return params.toString()
}

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Tag({ label }: { label: string }) {
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace',
      fontSize: 9,
      textTransform: 'uppercase',
      background: '#f7f6f3',
      border: '1px solid #e2e0d8',
      borderRadius: 99,
      padding: '2px 7px',
      color: 'var(--text-muted)',
      letterSpacing: '0.04em',
    }}>
      {label}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'DM Mono, monospace',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--text-muted)',
      marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

function IconBtn({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28,
        height: 28,
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <DownloadIcon />
    </button>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  subtext,
  color,
}: {
  label: string
  value: string | null
  subtext: string
  color: string
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 9,
      padding: '16px 18px',
    }}>
      <div style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: 300,
        letterSpacing: '-0.03em',
        color: value === null ? 'var(--text-muted)' : color,
      }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
        {subtext}
      </div>
    </div>
  )
}

// ─── Report Module Card ───────────────────────────────────────────────────────

function ReportCard({
  iconBg,
  icon,
  title,
  description,
  tags,
  onDownload,
  onView,
}: {
  iconBg: string
  icon: React.ReactNode
  title: string
  description: string
  tags: string[]
  onDownload: () => void
  onView: () => void
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{description}</div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #f0efe9',
        paddingTop: 14,
        marginTop: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {tags.map((t) => <Tag key={t} label={t} />)}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <IconBtn onClick={onDownload} title="Download CSV" />
          <button
            onClick={onView}
            style={{
              fontSize: 11,
              padding: '5px 10px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontWeight: 400,
            }}
          >
            View →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportsHub() {
  const router = useRouter()
  const [range, setRange] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [repeatJobs, setRepeatJobs] = useState<RepeatJob[]>([])
  const [spendData, setSpendData] = useState<SpendBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const qs = buildQueryString(range, customFrom, customTo)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [kpisRes, repeatRes, spendRes] = await Promise.all([
        fetch(`/api/reports/kpis?${qs}`),
        fetch(`/api/reports/repeat-jobs?${qs}&limit=5`),
        fetch(`/api/reports/spend-vs-budget?${qs}`),
      ])
      if (kpisRes.ok) setKpis(await kpisRes.json())
      if (repeatRes.ok) setRepeatJobs(await repeatRes.json())
      if (spendRes.ok) setSpendData(await spendRes.json())
    } finally {
      setLoading(false)
    }
  }, [qs])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExport = async (type: string, filename: string) => {
    try {
      await downloadFile(`/api/reports/export/${type}?${qs}`, filename)
    } catch {
      // silent
    }
  }

  const handleExportAll = async () => {
    setExporting(true)
    try {
      const dateStr = format(new Date(), 'yyyy-MM-dd')
      await downloadFile(`/api/reports/export/all?${qs}`, `ticktrack-reports-${dateStr}.zip`)
    } finally {
      setExporting(false)
    }
  }

  // ── KPI colours ──────────────────────────────────────────────────────────────
  const mttrColor = kpis?.mttr !== null && kpis?.mttr !== undefined
    ? (kpis.mttr <= 12 ? '#2d6a4f' : '#92400e')
    : 'var(--text-primary)'

  const mtbfColor = kpis?.mtbf !== null && kpis?.mtbf !== undefined
    ? (kpis.mtbf > 30 ? '#2d6a4f' : kpis.mtbf >= 14 ? '#92400e' : '#991b1b')
    : 'var(--text-primary)'

  const slaColor = kpis?.slaRate !== null && kpis?.slaRate !== undefined
    ? (kpis.slaRate >= 90 ? '#2d6a4f' : kpis.slaRate >= 70 ? '#92400e' : '#991b1b')
    : 'var(--text-primary)'

  const repeatColor = kpis?.repeatJobs !== undefined
    ? (kpis.repeatJobs > 0 ? '#991b1b' : '#2d6a4f')
    : 'var(--text-primary)'

  const dateStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Topbar ── */}
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            Reports &amp; Analytics
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
            Maintenance intelligence across all branches
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Date range selector */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{
              fontSize: 11,
              padding: '5px 8px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="year">This year</option>
            <option value="custom">Custom range</option>
          </select>

          {range === 'custom' && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  fontSize: 11,
                  padding: '5px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontFamily: 'DM Mono, monospace',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  fontSize: 11,
                  padding: '5px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontFamily: 'DM Mono, monospace',
                }}
              />
            </>
          )}

          <button
            onClick={handleExportAll}
            disabled={exporting}
            style={{
              padding: '5px 12px',
              border: '1px solid var(--accent)',
              borderRadius: 7,
              background: 'var(--accent)',
              cursor: exporting ? 'default' : 'pointer',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--bg)',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? 'Exporting…' : 'Export all'}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Section 1: KPI Cards ── */}
        <div>
          <SectionLabel>Key metrics</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <KPICard
              label="Mean Time to Repair"
              value={kpis?.mttr !== null && kpis?.mttr !== undefined ? `${kpis.mttr}h` : null}
              subtext="target: under 12h"
              color={mttrColor}
            />
            <KPICard
              label="Mean Time Between Failures"
              value={kpis?.mtbf !== null && kpis?.mtbf !== undefined ? `${kpis.mtbf} days` : null}
              subtext="per asset average"
              color={mtbfColor}
            />
            <KPICard
              label="SLA Compliance"
              value={kpis?.slaRate !== null && kpis?.slaRate !== undefined ? `${kpis.slaRate}%` : null}
              subtext="target: 90%+"
              color={slaColor}
            />
            <KPICard
              label="Repeat Jobs Flagged"
              value={kpis ? String(kpis.repeatJobs) : null}
              subtext="same asset · 30 days"
              color={repeatColor}
            />
          </div>
        </div>

        {/* ── Section 2: Report Module Cards ── */}
        <div>
          <SectionLabel>Report modules</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <ReportCard
              iconBg="#fef3c7"
              icon={<ActivityIcon stroke="#92400e" />}
              title="Equipment Failure Patterns"
              description="Analyse asset failure frequency, detect recurring breakdowns, and map failure hotspots across your fleet."
              tags={['MTBF', 'Heatmap', 'Timeline']}
              onDownload={() => handleExport('repeat-jobs', `equipment-failures-${dateStr}.csv`)}
              onView={() => router.push('/admin/reports/equipment-failures')}
            />
            <ReportCard
              iconBg="#fef2f2"
              icon={<AlertCircleIcon stroke="#991b1b" />}
              title="Repeat Jobs & Problem Assets"
              description="Identify assets generating repeated work orders. Spot recall patterns and escalation risks before they compound."
              tags={['Repeat', 'Recall', 'Escalation']}
              onDownload={() => handleExport('repeat-jobs', `repeat-jobs-${dateStr}.csv`)}
              onView={() => router.push('/admin/reports/repeat-jobs')}
            />
            <ReportCard
              iconBg="#e8f5ee"
              icon={<CreditCardIcon stroke="#2d6a4f" />}
              title="Cost per Asset & Site"
              description="Break down maintenance expenditure by asset and branch. Track budget utilisation and total cost of ownership."
              tags={['Budget', 'Variance', 'TCO']}
              onDownload={() => handleExport('costs', `costs-${dateStr}.csv`)}
              onView={() => router.push('/admin/reports/costs')}
            />
            <ReportCard
              iconBg="#eff6ff"
              icon={<ClockIcon stroke="#1e40af" />}
              title="SLA Performance"
              description="Track first response and resolution times against agreed service levels. Identify breach patterns by branch and priority."
              tags={['Response', 'Resolution', 'Breach']}
              onDownload={() => handleExport('sla', `sla-performance-${dateStr}.csv`)}
              onView={() => router.push('/admin/reports/sla')}
            />
            <ReportCard
              iconBg="#f0efe9"
              icon={<PeopleIcon stroke="#6b6860" />}
              title="Contractor Performance"
              description="Evaluate contractors by recall rate, average rating, invoice accuracy, and SLA compliance across all sites."
              tags={['Rating', 'Recall', 'Cost']}
              onDownload={() => handleExport('contractors', `contractor-performance-${dateStr}.csv`)}
              onView={() => router.push('/admin/reports/contractors')}
            />
            <ReportCard
              iconBg="#fbeaf0"
              icon={<BuildingIcon stroke="#993556" />}
              title="Branch Comparison"
              description="Compare ticket volumes, resolution times, SLA compliance, and maintenance spend across all branches."
              tags={['Volume', 'Score', 'Health']}
              onDownload={() => handleExport('branches', `branch-comparison-${dateStr}.csv`)}
              onView={() => router.push('/admin/reports/branches')}
            />
          </div>
        </div>

        {/* ── Section 3: Preview Tables ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* Repeat Jobs Preview */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px 12px',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Repeat jobs — problem assets
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Same asset · multiple tickets · 30 days
                </div>
              </div>
              <IconBtn
                onClick={() => handleExport('repeat-jobs', `repeat-jobs-${dateStr}.csv`)}
                title="Download CSV"
              />
            </div>

            {loading ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Loading…
              </div>
            ) : repeatJobs.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No repeat jobs in this period
              </div>
            ) : (
              repeatJobs.map((job, i) => (
                <div
                  key={job.assetId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '11px 18px',
                    borderBottom: i < repeatJobs.length - 1 ? '1px solid #f7f6f3' : 'none',
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {job.assetName}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)', marginTop: 1 }}>
                      {[job.branchName, job.category].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontFamily: 'DM Mono, monospace',
                    padding: '2px 7px',
                    borderRadius: 99,
                    background: job.jobCount >= 3 ? '#fef2f2' : '#fef3c7',
                    color: job.jobCount >= 3 ? '#991b1b' : '#92400e',
                    fontWeight: 500,
                    flexShrink: 0,
                  }}>
                    {job.jobCount} jobs
                  </span>
                  <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 12,
                    fontWeight: 500,
                    width: 65,
                    textAlign: 'right',
                    flexShrink: 0,
                    color: 'var(--text-primary)',
                  }}>
                    {job.totalCost ? formatCurrency(job.totalCost) : '—'}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Spend vs Budget */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px 12px',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Maintenance spend vs budget
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  By branch · this period
                </div>
              </div>
              <IconBtn
                onClick={() => handleExport('branches', `branch-comparison-${dateStr}.csv`)}
                title="Download CSV"
              />
            </div>

            {loading ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Loading…
              </div>
            ) : spendData.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No branch data available
              </div>
            ) : (
              spendData.map((branch, i) => {
                const hasBudget = branch.maintenanceBudget && branch.maintenanceBudget > 0
                const ratio = hasBudget ? branch.totalSpend / branch.maintenanceBudget! : 0
                const pct = Math.min(ratio * 100, 100)
                const isOver = hasBudget ? branch.totalSpend >= branch.maintenanceBudget! * 0.9 : false
                const isOverBudget = hasBudget ? branch.totalSpend >= branch.maintenanceBudget! : false

                return (
                  <div
                    key={branch.branchId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '11px 18px',
                      borderBottom: i < spendData.length - 1 ? '1px solid #f7f6f3' : 'none',
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 13, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                      {branch.branchName}
                    </div>

                    {hasBudget ? (
                      <>
                        <div style={{ width: 90, flexShrink: 0 }}>
                          <div style={{ height: 4, background: '#f0efe9', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: isOver ? '#991b1b' : '#1a1916',
                              borderRadius: 99,
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                        </div>
                        <div style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 12,
                          fontWeight: 500,
                          width: 50,
                          textAlign: 'right',
                          flexShrink: 0,
                          color: isOverBudget ? '#991b1b' : 'var(--text-primary)',
                        }}>
                          {formatCurrency(branch.totalSpend)}
                        </div>
                        <div style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 11,
                          width: 55,
                          textAlign: 'right',
                          flexShrink: 0,
                          color: isOverBudget ? '#991b1b' : 'var(--text-muted)',
                        }}>
                          / {formatCurrency(branch.maintenanceBudget!)}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                        — No budget set &nbsp;
                        <a
                          href="/admin/settings/branches"
                          style={{ color: 'var(--text-muted)', textDecoration: 'underline', fontSize: 11 }}
                        >
                          Set budget
                        </a>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
