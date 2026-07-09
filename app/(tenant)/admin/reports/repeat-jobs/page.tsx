'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { ReportPage } from '@/components/admin/reports/report-page'

interface RepeatJobRow {
  assetId: string
  assetName: string
  branchName: string
  category: string
  jobCount: number
  totalCost: number
  [key: string]: unknown
}

export default function RepeatJobsPage() {
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
        <ReportPage<RepeatJobRow>
          title="Repeat Jobs & Problem Assets"
          exportType="repeat-jobs"
          exportFilename="repeat-jobs-[date].csv"
          fetchData={async (qs) => {
            const res = await fetch(`/api/reports/repeat-jobs?${qs}&limit=100`)
            return res.ok ? res.json() : []
          }}
          statCards={(rows) => {
            const total = rows.length
            const critical = rows.filter((r) => r.jobCount >= 4).length
            const totalCost = rows.reduce((s, r) => s + r.totalCost, 0)
            return [
              { label: 'Problem assets', value: String(total) },
              { label: 'Critical (4+ jobs)', value: String(critical), color: critical > 0 ? '#991b1b' : undefined },
              { label: 'Total cost', value: totalCost ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalCost) : null },
              { label: 'Avg jobs per asset', value: total > 0 ? (rows.reduce((s, r) => s + r.jobCount, 0) / total).toFixed(1) : null },
            ]
          }}
          columns={[
            { key: 'assetName', label: 'Asset' },
            { key: 'branchName', label: 'Branch' },
            { key: 'category', label: 'Category' },
            { key: 'jobCount', label: 'Job Count', width: 90,
              render: (r) => (
                <span style={{
                  padding: '2px 8px', borderRadius: 99, fontSize: 11,
                  background: r.jobCount >= 4 ? '#fef2f2' : r.jobCount === 3 ? '#fef3c7' : '#f0efe9',
                  color: r.jobCount >= 4 ? '#991b1b' : r.jobCount === 3 ? '#92400e' : '#6b6860',
                  fontFamily: 'DM Mono, monospace',
                }}>
                  {r.jobCount} jobs
                </span>
              )
            },
            { key: 'totalCost', label: 'Total Cost', width: 90,
              render: (r) => r.totalCost
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(r.totalCost)
                : '—'
            },
            { key: 'jobCount', label: 'Recommendation', sortable: false,
              render: (r) => {
                const rec = r.jobCount >= 4 ? 'Consider replacement' : r.jobCount === 3 ? 'Review with contractor' : 'Monitor'
                const color = r.jobCount >= 4 ? '#991b1b' : r.jobCount === 3 ? '#92400e' : '#6b6860'
                return <span style={{ fontSize: 11, color }}>{rec}</span>
              }
            },
          ]}
          emptyMessage="No repeat jobs in this period"
        />
      )}
    </AuthGuard>
  )
}
