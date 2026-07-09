'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { ReportPage } from '@/components/admin/reports/report-page'

interface EquipmentRow {
  assetId: string
  assetName: string
  assetNumber: string
  branchName: string
  category: string
  jobCount: number
  totalCost: number
  firstJobDate: string
  lastJobDate: string
  avgDaysBetween: number | null
  [key: string]: unknown
}

export default function EquipmentFailuresPage() {
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
        <ReportPage<EquipmentRow>
          title="Equipment Failure Patterns"
          exportType="repeat-jobs"
          exportFilename="equipment-failures-[date].csv"
          fetchData={async (qs) => {
            const res = await fetch(`/api/reports/equipment-failures?${qs}`)
            return res.ok ? res.json() : []
          }}
          statCards={(rows) => {
            const totalAssets = rows.length
            const avgFailures = totalAssets > 0
              ? (rows.reduce((s, r) => s + r.jobCount, 0) / totalAssets).toFixed(1)
              : null
            const worstAsset = rows[0]?.assetName ?? null
            const avgMTBF = rows.filter((r) => r.avgDaysBetween !== null).length > 0
              ? Math.round(
                  rows
                    .filter((r) => r.avgDaysBetween !== null)
                    .reduce((s, r) => s + r.avgDaysBetween!, 0) /
                    rows.filter((r) => r.avgDaysBetween !== null).length
                )
              : null
            return [
              { label: 'Assets with repeat failures', value: String(totalAssets) },
              { label: 'Avg jobs per asset', value: avgFailures, subtext: 'in period' },
              { label: 'Avg days between failures', value: avgMTBF !== null ? `${avgMTBF}d` : null },
              { label: 'Highest failure asset', value: worstAsset, subtext: worstAsset ? `${rows[0].jobCount} jobs` : undefined },
            ]
          }}
          columns={[
            { key: 'assetName', label: 'Asset' },
            { key: 'assetNumber', label: 'Asset #', width: 90 },
            { key: 'branchName', label: 'Branch' },
            { key: 'category', label: 'Category' },
            { key: 'jobCount', label: 'Job Count', width: 80,
              render: (r) => (
                <span style={{
                  padding: '2px 7px', borderRadius: 99, fontSize: 11,
                  background: r.jobCount >= 3 ? '#fef2f2' : '#fef3c7',
                  color: r.jobCount >= 3 ? '#991b1b' : '#92400e',
                  fontFamily: 'DM Mono, monospace',
                }}>
                  {r.jobCount}
                </span>
              )
            },
            { key: 'avgDaysBetween', label: 'Avg Days Between', width: 120,
              render: (r) => r.avgDaysBetween !== null ? `${r.avgDaysBetween}d` : '—'
            },
            { key: 'firstJobDate', label: 'First Failure', width: 100 },
            { key: 'lastJobDate', label: 'Last Failure', width: 100 },
            { key: 'totalCost', label: 'Total Cost', width: 90,
              render: (r) => r.totalCost
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(r.totalCost)
                : '—'
            },
          ]}
          emptyMessage="No assets with repeat failures in this period"
        />
      )}
    </AuthGuard>
  )
}
