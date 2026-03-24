'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminSettings } from '@/components/admin/admin-settings'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function SettingsPage() {
  const { user, isLoaded } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const role = (meta.role as string) ?? 'END_USER'
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && user && role !== 'TENANT_ADMIN') {
      router.push('/dashboard')
    }
  }, [isLoaded, user, role, router])

  const userObj = user ? {
    id: meta.dbUserId ?? user.id,
    email: user.primaryEmailAddress?.emailAddress ?? '',
    name: user.fullName,
    role,
    tenantId: meta.tenantId ?? null,
  } : null

  return (
    <AuthGuard>
      {user && role === 'TENANT_ADMIN' && userObj && (
        <AdminSettings user={userObj} section="branches" />
      )}
    </AuthGuard>
  )
}
