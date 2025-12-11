'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminSettings } from '@/components/admin/admin-settings'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function AdminSettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user) {
      const isAdmin = ['TENANT_ADMIN'].includes(session.user.role)
      if (!isAdmin) {
        router.push('/dashboard')
      }
    }
  }, [session, router])

  const isAdmin = session?.user && ['TENANT_ADMIN'].includes(session.user.role)

  return (
    <AuthGuard>
      {isAdmin && session?.user && <AdminSettings user={session.user} />}
    </AuthGuard>
  )
}
