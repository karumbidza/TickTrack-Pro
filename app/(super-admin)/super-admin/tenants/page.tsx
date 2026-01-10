'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { TenantManagement } from '@/components/super-admin/tenant-management'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function TenantsPage() {
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
      {isSuperAdmin && <TenantManagement />}
    </AuthGuard>
  )
}
