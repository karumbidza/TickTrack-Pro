'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

// ─── types ────────────────────────────────────────────────────────────────────

export interface ReportColumn<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: number | string
}

export interface StatCard {
  label: string
  value: string | null
  subtext?: string
  color?: string
}

export interface ReportPageProps<T> {
  title: string
  backHref?: string
  exportType: string
  exportFilename: string
  columns: ReportColumn<T>[]
  fetchData: (qs: string) => Promise<T[]>
  statCards?: (rows: T[]) => StatCard[]
  filterOptions?: {
    key: string
    label: string
    options: { value: string; label: string }[]
  }[]
  emptyMessage?: string
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildQS(range: string, customFrom: string, customTo: string, filters: Record<string, string>): string {
  const params = new URLSearchParams({ range })
  if (range === 'custom') {
    if (customFrom) params.set('dateFrom', customFrom)
    if (customTo) params.set('dateTo', customTo)
  }
  for (const [k, v] of Object.entries(filters)) {
    if (v && v !== 'all') params.set(k, v)
  }
  return params.toString()
}

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) return
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportPage<T extends Record<string, unknown>>({
  title,
  backHref = '/admin/settings/reports',
  exportType,
  exportFilename,
  columns,
  fetchData,
  statCards,
  filterOptions = [],
  emptyMessage = 'No data for this period',
}: ReportPageProps<T>) {
  const router = useRouter()
  const [range, setRange] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const qs = buildQS(range, customFrom, customTo, filters)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchData(qs)
      setRows(data)
    } finally {
      setLoading(false)
    }
  }, [qs, fetchData])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    setExporting(true)
    try {
      const dateStr = format(new Date(), 'yyyy-MM-dd')
      await downloadFile(
        `/api/reports/export/${exportType}?${qs}`,
        exportFilename.replace('[date]', dateStr)
      )
    } finally {
      setExporting(false)
    }
  }

  // Sort
  const sorted = [...rows].sort((a, b) => {
    if (!sortKey) return 0
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const cards = statCards ? statCards(rows) : []

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>

      {/* Topbar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => router.push(backHref)}
            style={{
              padding: '4px 8px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ← Back
          </button>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  fontSize: 11, padding: '5px 8px', border: '1px solid var(--border)',
                  borderRadius: 6, background: 'var(--surface)', color: 'var(--text-primary)',
                  fontFamily: 'DM Mono, monospace',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  fontSize: 11, padding: '5px 8px', border: '1px solid var(--border)',
                  borderRadius: 6, background: 'var(--surface)', color: 'var(--text-primary)',
                  fontFamily: 'DM Mono, monospace',
                }}
              />
            </>
          )}

          {filterOptions.map((f) => (
            <select
              key={f.key}
              value={filters[f.key] ?? 'all'}
              onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
              style={{
                fontSize: 11, padding: '5px 8px', border: '1px solid var(--border)',
                borderRadius: 6, background: 'var(--surface)', color: 'var(--text-primary)',
                cursor: 'pointer', fontFamily: 'DM Mono, monospace',
              }}
            >
              <option value="all">{f.label}: All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}

          <button
            onClick={handleExport}
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
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Stat Cards */}
        {cards.length > 0 && (
          <div>
            <SectionLabel>Summary</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length}, 1fr)`, gap: 10 }}>
              {cards.map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 9,
                    padding: '16px 18px',
                  }}
                >
                  <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                  }}>
                    {card.label}
                  </div>
                  <div style={{
                    fontSize: 22,
                    fontWeight: 300,
                    letterSpacing: '-0.03em',
                    color: card.value === null ? 'var(--text-muted)' : (card.color ?? 'var(--text-primary)'),
                  }}>
                    {card.value ?? '—'}
                  </div>
                  {card.subtext && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                      {card.subtext}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Table */}
        <div>
          <SectionLabel>
            {loading ? 'Loading…' : `${rows.length} record${rows.length === 1 ? '' : 's'}`}
          </SectionLabel>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {columns.map((col) => (
                      <th
                        key={String(col.key)}
                        onClick={col.sortable !== false ? () => handleSort(String(col.key)) : undefined}
                        style={{
                          padding: '10px 14px',
                          textAlign: 'left',
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-muted)',
                          fontWeight: 400,
                          whiteSpace: 'nowrap',
                          cursor: col.sortable !== false ? 'pointer' : 'default',
                          userSelect: 'none',
                          width: col.width,
                        }}
                      >
                        {col.label}
                        {sortKey === String(col.key) && (
                          <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={columns.length} style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading…
                      </td>
                    </tr>
                  ) : sorted.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    sorted.map((row, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: i < sorted.length - 1 ? '1px solid #f7f6f3' : 'none' }}
                      >
                        {columns.map((col) => (
                          <td
                            key={String(col.key)}
                            style={{
                              padding: '10px 14px',
                              color: 'var(--text-primary)',
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {col.render ? col.render(row) : String(row[String(col.key)] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
