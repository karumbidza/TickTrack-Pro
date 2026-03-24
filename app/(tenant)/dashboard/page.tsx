'use client'

import { useUser } from '@clerk/nextjs'
import { UserDashboard } from '@/components/user/dashboard'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function UserDashboardPage() {
  const { user, isLoaded } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const role = (meta.role as string) ?? 'END_USER'

  const userObj = user ? {
    id: meta.dbUserId ?? user.id,
    email: user.primaryEmailAddress?.emailAddress ?? '',
    name: user.fullName,
    role,
    tenantId: meta.tenantId ?? null,
    branchName: meta.branchName ?? null,
  } : null

  return (
    <AuthGuard>
      {isLoaded && userObj && <UserDashboard user={userObj} />}
    </AuthGuard>
  )
}