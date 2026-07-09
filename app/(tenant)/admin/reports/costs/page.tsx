'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { ReportPage } from '@/components/admin/reports/report-page'

interface CostRow {
  id: string
  ticketNumber: string
  branchName: string
  assetName: string
  category: string
  contractor: string
  amount: number
  status: string
  date: string
  branchBudget: number | null
  branchSpend: number
  overBudget: boolean
  [key: string]: unknown
}

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)

export default function CostsPage() {
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
        <ReportPage<CostRow>
          title="Cost per Asset & Site"
          exportType="costs"
          exportFilename="costs-[date].csv"
          fetchData={async (qs) => {
            const res = await fetch(`/api/reports/costs?${qs}`)
            return res.ok ? res.json() : []
          }}
          statCards={(rows) => {
            const total = rows.reduce((s, r) => s + r.amount, 0)
            const approved = rows.filter((r) => r.status === 'APPROVED' || r.status === 'PAID')
            const approvedTotal = approved.reduce((s, r) => s + r.amount, 0)
            const overBudgetCount = new Set(rows.filter((r) => r.overBudget).map((r) => r.branchName)).size
            return [
              { label: 'Total invoiced', value: total ? fmt(total) : null },
              { label: 'Approved / paid', value: approvedTotal ? fmt(approvedTotal) : null },
              { label: 'Invoice count', value: String(rows.length) },
              { label: 'Branches over budget', value: String(overBudgetCount), color: overBudgetCount > 0 ? '#991b1b' : undefined },
            ]
          }}
          filterOptions={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'PAID', label: 'Paid' },
                { value: 'REJECTED', label: 'Rejected' },
              ],
            },
          ]}
          columns={[
            { key: 'ticketNumber', label: 'Ticket #', width: 90 },
            { key: 'branchName', label: 'Branch' },
            { key: 'assetName', label: 'Asset' },
            { key: 'category', label: 'Category' },
            { key: 'contractor', label: 'Contractor' },
            { key: 'amount', label: 'Amount', width: 90,
              render: (r) => (
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 500 }}>
                  {fmt(r.amount)}
                </span>
              )
            },
            { key: 'status', label: 'Status', width: 90,
              render: (r) => {
                const color = r.status === 'APPROVED' || r.status === 'PAID' ? '#2d6a4f' : r.status === 'REJECTED' ? '#991b1b' : '#92400e'
                return (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99,
                    background: color + '18', color,
                    fontFamily: 'DM Mono, monospace', textTransform: 'uppercase',
                  }}>
                    {r.status}
                  </span>
                )
              }
            },
            { key: 'date', label: 'Date', width: 90 },
            { key: 'branchBudget', label: 'Branch Budget', width: 100,
              render: (r) => r.branchBudget ? fmt(r.branchBudget) : <span style={{ color: 'var(--text-muted)' }}>—</span>
            },
            { key: 'overBudget', label: 'Over Budget', width: 90,
              render: (r) => r.overBudget
                ? <span style={{ color: '#991b1b', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>YES</span>
                : <span style={{ color: '#2d6a4f', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>NO</span>
            },
          ]}
          emptyMessage="No invoices in this period"
        />
      )}
    </AuthGuard>
  )
}
