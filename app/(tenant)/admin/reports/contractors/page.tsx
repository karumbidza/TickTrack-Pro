'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { ReportPage } from '@/components/admin/reports/report-page'

interface ContractorRow {
  contractorId: string
  name: string
  email: string
  totalJobs: number
  completedJobs: number
  recallCount: number
  avgRating: number | null
  totalInvoiced: number
  avgInvoice: number | null
  avgResponseHours: number | null
  slaCompliancePct: number | null
  [key: string]: unknown
}

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

export default function ContractorsPage() {
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
        <ReportPage<ContractorRow>
          title="Contractor Performance"
          exportType="contractors"
          exportFilename="contractor-performance-[date].csv"
          fetchData={async (qs) => {
            const res = await fetch(`/api/reports/contractors?${qs}`)
            return res.ok ? res.json() : []
          }}
          statCards={(rows) => {
            const totalJobs = rows.reduce((s, r) => s + r.totalJobs, 0)
            const totalRecalls = rows.reduce((s, r) => s + r.recallCount, 0)
            const avgSLA = rows.filter((r) => r.slaCompliancePct !== null).length > 0
              ? (rows.filter((r) => r.slaCompliancePct !== null).reduce((s, r) => s + r.slaCompliancePct!, 0) /
                rows.filter((r) => r.slaCompliancePct !== null).length).toFixed(1)
              : null
            const totalSpend = rows.reduce((s, r) => s + r.totalInvoiced, 0)
            return [
              { label: 'Active contractors', value: String(rows.length) },
              { label: 'Total jobs', value: String(totalJobs) },
              { label: 'Recall count', value: String(totalRecalls), color: totalRecalls > 0 ? '#991b1b' : '#2d6a4f' },
              { label: 'Avg SLA compliance', value: avgSLA !== null ? `${avgSLA}%` : null },
            ]
          }}
          columns={[
            { key: 'name', label: 'Contractor' },
            { key: 'email', label: 'Email' },
            { key: 'totalJobs', label: 'Total Jobs', width: 80 },
            { key: 'completedJobs', label: 'Completed', width: 80 },
            { key: 'recallCount', label: 'Recalls', width: 70,
              render: (r) => (
                <span style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 12,
                  color: r.recallCount > 0 ? '#991b1b' : '#2d6a4f',
                  fontWeight: 500,
                }}>
                  {r.recallCount}
                </span>
              )
            },
            { key: 'avgRating', label: 'Avg Rating', width: 80,
              render: (r) => r.avgRating !== null ? (
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>★ {r.avgRating}</span>
              ) : '—'
            },
            { key: 'totalInvoiced', label: 'Total Invoiced', width: 100,
              render: (r) => <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{fmt(r.totalInvoiced)}</span>
            },
            { key: 'avgResponseHours', label: 'Avg Response', width: 100,
              render: (r) => r.avgResponseHours !== null ? `${r.avgResponseHours}h` : '—'
            },
            { key: 'slaCompliancePct', label: 'SLA %', width: 70,
              render: (r) => {
                if (r.slaCompliancePct === null) return '—'
                const color = r.slaCompliancePct >= 90 ? '#2d6a4f' : r.slaCompliancePct >= 70 ? '#92400e' : '#991b1b'
                return <span style={{ color, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{r.slaCompliancePct}%</span>
              }
            },
          ]}
          emptyMessage="No contractor jobs in this period"
        />
      )}
    </AuthGuard>
  )
}
