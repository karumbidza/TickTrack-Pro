'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SuperAdminOverview } from '@/components/super-admin/overview'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function SuperAdminPage() {
  const { user, isLoaded } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const role = meta.role ?? 'END_USER'
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && user && role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [isLoaded, user, role, router])

  const isSuperAdmin = role === 'SUPER_ADMIN'

  return (
    <AuthGuard>
      {isSuperAdmin && <SuperAdminOverview />}
    </AuthGuard>
  )
}