'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminDashboard } from '@/components/admin/dashboard'
import { AuthGuard } from '@/components/auth/auth-guard'

const ADMIN_ROLES = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']

export default function AdminDashboardPage() {
  const { user, isLoaded } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const role = (meta.role as string) ?? 'END_USER'
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded || !user) return
    if (!ADMIN_ROLES.includes(role)) {
      router.replace('/dashboard')
    } else if (!meta.tenantId) {
      // Admin who hasn't completed onboarding
      router.replace('/onboarding')
    }
  }, [isLoaded, user, role, meta.tenantId, router])

  const isAdmin = isLoaded && user && ADMIN_ROLES.includes(role)
  const userObj = isAdmin ? {
    id: meta.dbUserId ?? user.id,
    email: user.primaryEmailAddress?.emailAddress ?? '',
    name: user.fullName,
    role,
    tenantId: meta.tenantId ?? null,
  } : null

  return (
    <AuthGuard>
      {isAdmin && userObj && <AdminDashboard user={userObj} />}
    </AuthGuard>
  )
}