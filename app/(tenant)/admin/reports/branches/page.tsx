'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { ReportPage } from '@/components/admin/reports/report-page'

interface BranchRow {
  branchId: string
  branchName: string
  address: string
  totalTickets: number
  openTickets: number
  completedTickets: number
  avgResolutionHours: number | null
  slaCompliancePct: number | null
  totalSpend: number
  budget: number | null
  budgetVariance: number | null
  repeatJobCount: number
  topCategory: string
  topContractor: string
  [key: string]: unknown
}

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

export default function BranchesPage() {
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
        <ReportPage<BranchRow>
          title="Branch Comparison"
          exportType="branches"
          exportFilename="branch-comparison-[date].csv"
          fetchData={async (qs) => {
            const res = await fetch(`/api/reports/branches?${qs}`)
            return res.ok ? res.json() : []
          }}
          statCards={(rows) => {
            const totalTickets = rows.reduce((s, r) => s + r.totalTickets, 0)
            const totalSpend = rows.reduce((s, r) => s + r.totalSpend, 0)
            const overBudget = rows.filter((r) => r.budget !== null && r.totalSpend > r.budget).length
            const avgSLA = rows.filter((r) => r.slaCompliancePct !== null).length > 0
              ? (rows.filter((r) => r.slaCompliancePct !== null).reduce((s, r) => s + r.slaCompliancePct!, 0) /
                rows.filter((r) => r.slaCompliancePct !== null).length).toFixed(1)
              : null
            return [
              { label: 'Total branches', value: String(rows.length) },
              { label: 'Total tickets', value: String(totalTickets) },
              { label: 'Total spend', value: totalSpend ? fmt(totalSpend) : null },
              { label: 'Over budget', value: String(overBudget), color: overBudget > 0 ? '#991b1b' : '#2d6a4f' },
            ]
          }}
          columns={[
            { key: 'branchName', label: 'Branch' },
            { key: 'address', label: 'Location' },
            { key: 'totalTickets', label: 'Total', width: 60 },
            { key: 'openTickets', label: 'Open', width: 60,
              render: (r) => (
                <span style={{ color: r.openTickets > 0 ? '#92400e' : 'var(--text-muted)' }}>{r.openTickets}</span>
              )
            },
            { key: 'completedTickets', label: 'Done', width: 60 },
            { key: 'avgResolutionHours', label: 'Avg Res (h)', width: 90,
              render: (r) => r.avgResolutionHours !== null ? `${r.avgResolutionHours}h` : '—'
            },
            { key: 'slaCompliancePct', label: 'SLA %', width: 70,
              render: (r) => {
                if (r.slaCompliancePct === null) return '—'
                const color = r.slaCompliancePct >= 90 ? '#2d6a4f' : r.slaCompliancePct >= 70 ? '#92400e' : '#991b1b'
                return <span style={{ color, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{r.slaCompliancePct}%</span>
              }
            },
            { key: 'totalSpend', label: 'Spend', width: 90,
              render: (r) => <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{fmt(r.totalSpend)}</span>
            },
            { key: 'budget', label: 'Budget', width: 90,
              render: (r) => r.budget ? <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{fmt(r.budget)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
            },
            { key: 'budgetVariance', label: 'Variance', width: 90,
              render: (r) => {
                if (r.budgetVariance === null) return '—'
                const isNeg = r.budgetVariance < 0
                return (
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: isNeg ? '#991b1b' : '#2d6a4f' }}>
                    {isNeg ? '-' : '+'}{fmt(Math.abs(r.budgetVariance))}
                  </span>
                )
              }
            },
            { key: 'repeatJobCount', label: 'Repeat', width: 60,
              render: (r) => (
                <span style={{ color: r.repeatJobCount > 0 ? '#991b1b' : 'var(--text-muted)' }}>{r.repeatJobCount}</span>
              )
            },
            { key: 'topCategory', label: 'Top Category' },
            { key: 'topContractor', label: 'Top Contractor' },
          ]}
          emptyMessage="No branches found"
        />
      )}
    </AuthGuard>
  )
}
