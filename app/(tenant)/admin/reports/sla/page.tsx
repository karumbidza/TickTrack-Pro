'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { ReportPage } from '@/components/admin/reports/report-page'

interface SLARow {
  id: string
  ticketNumber: string
  title: string
  priority: string
  status: string
  branchName: string
  createdAt: string
  responseDeadline: string | null
  firstResponseAt: string | null
  slaFirstResponseBreached: boolean
  resolutionDeadline: string | null
  resolvedAt: string | null
  slaResolutionBreached: boolean
  ttfr: number | null
  ttr: number | null
  slaStatus: string
  [key: string]: unknown
}

export default function SLAPage() {
  const { user, isLoaded } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string>
  const role = meta.role ?? 'END_USER'
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && user && role !== 'TENANT_ADMIN') router.push('/dashboard')
  }, [isLoaded, user, role, router])

  return (
    <AuthGuard>
      {user && role === 'TENANT_ADMIN' && (
        <ReportPage<SLARow>
          title="SLA Performance"
          exportType="sla"
          exportFilename="sla-performance-[date].csv"
          fetchData={async (qs) => {
            const res = await fetch(`/api/reports/sla?${qs}`)
            return res.ok ? res.json() : []
          }}
          statCards={(rows) => {
            const closed = rows.filter((r) => ['COMPLETED', 'CLOSED'].includes(r.status))
            const breached = closed.filter((r) => r.slaResolutionBreached || r.slaFirstResponseBreached)
            const slaRate = closed.length > 0
              ? Math.round(((closed.length - breached.length) / closed.length) * 100 * 10) / 10
              : null
            const avgTTR = rows.filter((r) => r.ttr !== null).length > 0
              ? (rows.filter((r) => r.ttr !== null).reduce((s, r) => s + r.ttr!, 0) / rows.filter((r) => r.ttr !== null).length).toFixed(1)
              : null
            return [
              { label: 'Total tickets', value: String(rows.length) },
              { label: 'SLA compliance', value: slaRate !== null ? `${slaRate}%` : null, color: slaRate !== null ? (slaRate >= 90 ? '#2d6a4f' : slaRate >= 70 ? '#92400e' : '#991b1b') : undefined },
              { label: 'SLA breaches', value: String(breached.length), color: breached.length > 0 ? '#991b1b' : '#2d6a4f' },
              { label: 'Avg resolution time', value: avgTTR !== null ? `${avgTTR}h` : null },
            ]
          }}
          filterOptions={[
            {
              key: 'priority',
              label: 'Priority',
              options: [
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ],
            },
          ]}
          columns={[
            { key: 'ticketNumber', label: 'Ticket #', width: 90 },
            { key: 'title', label: 'Title' },
            { key: 'priority', label: 'Priority', width: 80,
              render: (r) => {
                const colors: Record<string, string> = { CRITICAL: '#991b1b', HIGH: '#92400e', MEDIUM: '#1e40af', LOW: '#2d6a4f' }
                return (
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 99,
                    background: (colors[r.priority] ?? '#6b6860') + '18',
                    color: colors[r.priority] ?? '#6b6860',
                    fontFamily: 'DM Mono, monospace',
                  }}>
                    {r.priority}
                  </span>
                )
              }
            },
            { key: 'branchName', label: 'Branch' },
            { key: 'createdAt', label: 'Created', width: 120 },
            { key: 'firstResponseAt', label: 'First Response', width: 120,
              render: (r) => r.firstResponseAt ?? <span style={{ color: 'var(--text-muted)' }}>—</span>
            },
            { key: 'ttfr', label: 'TTFR (h)', width: 80,
              render: (r) => r.ttfr !== null ? `${r.ttfr}h` : '—'
            },
            { key: 'resolvedAt', label: 'Resolved', width: 120,
              render: (r) => r.resolvedAt ?? <span style={{ color: 'var(--text-muted)' }}>—</span>
            },
            { key: 'ttr', label: 'TTR (h)', width: 70,
              render: (r) => r.ttr !== null ? `${r.ttr}h` : '—'
            },
            { key: 'slaStatus', label: 'SLA', width: 90,
              render: (r) => (
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 99,
                  background: r.slaStatus === 'BREACHED' ? '#fef2f2' : '#e8f5ee',
                  color: r.slaStatus === 'BREACHED' ? '#991b1b' : '#2d6a4f',
                  fontFamily: 'DM Mono, monospace',
                }}>
                  {r.slaStatus}
                </span>
              )
            },
          ]}
          emptyMessage="No tickets in this period"
        />
      )}
    </AuthGuard>
  )
}
