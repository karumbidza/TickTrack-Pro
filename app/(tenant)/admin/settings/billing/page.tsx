'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminSettings } from '@/components/admin/admin-settings'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user && !['TENANT_ADMIN'].includes(session.user.role)) {
      router.push('/dashboard')
    }
  }, [session, router])

  return (
    <AuthGuard>
      {session?.user && ['TENANT_ADMIN'].includes(session.user.role) && (
        <AdminSettings user={session.user} section="billing" />
      )}
    </AuthGuard>
  )
}
