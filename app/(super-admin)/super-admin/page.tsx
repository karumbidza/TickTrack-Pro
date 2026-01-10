'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SuperAdminOverview } from '@/components/super-admin/overview'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function SuperAdminPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user && session.user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [session, router])

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

  return (
    <AuthGuard>
      {isSuperAdmin && <SuperAdminOverview />}
    </AuthGuard>
  )
}