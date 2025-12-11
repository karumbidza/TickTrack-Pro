'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminDashboard } from '@/components/admin/dashboard'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function AdminDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user) {
      const isAdmin = [
        'TENANT_ADMIN',
        'IT_ADMIN',
        'SALES_ADMIN',
        'RETAIL_ADMIN',
        'MAINTENANCE_ADMIN',
        'PROJECTS_ADMIN'
      ].includes(session.user.role)

      if (!isAdmin) {
        router.push('/dashboard')
      }
    }
  }, [session, router])

  const isAdmin = session?.user && [
    'TENANT_ADMIN',
    'IT_ADMIN',
    'SALES_ADMIN',
    'RETAIL_ADMIN',
    'MAINTENANCE_ADMIN',
    'PROJECTS_ADMIN'
  ].includes(session.user.role)

  return (
    <AuthGuard>
      {isAdmin && <AdminDashboard user={session.user} />}
    </AuthGuard>
  )
}