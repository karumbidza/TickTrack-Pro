'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { UserDashboard } from '@/components/user/dashboard'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function UserDashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const role = (meta.role as string) ?? 'END_USER'

  useEffect(() => {
    if (!isLoaded || !user) return
    if (role === 'SUPER_ADMIN') {
      router.replace('/super-admin')
    } else if (!meta.tenantId && role !== 'END_USER') {
      // TENANT_ADMIN who hasn't completed onboarding — send them back
      router.replace('/onboarding')
    }
  }, [isLoaded, user, role, meta.tenantId, router])

  const userObj = user ? {
    id: meta.dbUserId ?? user.id,
    email: user.primaryEmailAddress?.emailAddress ?? '',
    name: user.fullName,
    role,
    tenantId: meta.tenantId ?? null,
    branchName: meta.branchName ?? null,
  } : null

  if (role === 'SUPER_ADMIN' || (!meta.tenantId && role !== 'END_USER')) return null

  return (
    <AuthGuard>
      {isLoaded && userObj && <UserDashboard user={userObj} />}
    </AuthGuard>
  )
}