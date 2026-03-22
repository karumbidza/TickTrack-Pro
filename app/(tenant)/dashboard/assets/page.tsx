'use client'

import { useSession } from 'next-auth/react'
import { UserDashboard } from '@/components/user/dashboard'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function AssetsPage() {
  const { data: session } = useSession()

  return (
    <AuthGuard>
      {session?.user && <UserDashboard user={session.user} initialTab="assets" />}
    </AuthGuard>
  )
}
