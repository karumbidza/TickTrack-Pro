'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SuperAdminOverview } from '@/components/super-admin/overview'

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

  if (!isLoaded || role !== 'SUPER_ADMIN') return null

  return <SuperAdminOverview />
}
