'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { ContractorManagement } from '@/components/admin/contractor-management'

const ALLOWED_ROLES = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']

export default function AdminContractorsPage() {
  const { user, isLoaded } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const role = (meta.role as string) ?? 'END_USER'
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return

    if (!user) {
      router.push('/sign-in')
      return
    }

    if (!ALLOWED_ROLES.includes(role)) {
      router.push('/dashboard')
      return
    }
  }, [isLoaded, user, role, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !ALLOWED_ROLES.includes(role)) {
    return null
  }

  const userObj = {
    id: meta.dbUserId ?? user.id,
    email: user.primaryEmailAddress?.emailAddress ?? '',
    name: user.fullName,
    role,
    tenantId: meta.tenantId ?? null,
  }

  return (
    <AuthGuard>
      <ContractorManagement user={userObj} />
    </AuthGuard>
  )
}