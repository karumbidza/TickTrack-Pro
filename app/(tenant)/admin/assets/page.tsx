'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminAssetManagement } from '@/components/admin/asset-management'
import { AuthGuard } from '@/components/auth/auth-guard'

const ADMIN_ROLES = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']

export default function AdminAssetsPage() {
  const { user, isLoaded } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const role = (meta.role as string) ?? 'END_USER'
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && user && !ADMIN_ROLES.includes(role)) {
      router.push('/dashboard')
    }
  }, [isLoaded, user, role, router])

  const isAdmin = isLoaded && user && ADMIN_ROLES.includes(role)

  return (
    <AuthGuard>
      {isAdmin && <AdminAssetManagement />}
    </AuthGuard>
  )
}
