'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { TenantManagement } from '@/components/super-admin/tenant-management'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function TenantsPage() {
  const { user, isLoaded } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const role = meta.role ?? 'END_USER'
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && user && role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [isLoaded, user, role, router])

  const isSuperAdmin = role === 'SUPER_ADMIN'

  return (
    <AuthGuard>
      {isSuperAdmin && <TenantManagement />}
    </AuthGuard>
  )
}
