'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminTicketManagement } from '@/components/admin/ticket-management'
import { AuthGuard } from '@/components/auth/auth-guard'

const ADMIN_ROLES = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']

export default function AdminTicketsPage() {
  const { user, isLoaded } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const role = (meta.role as string) ?? 'END_USER'
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && user && !ADMIN_ROLES.includes(role)) {
      router.push('/dashboard')
    }
  }, [isLoaded, user, role, router])

  const isAdmin = isLoaded && user && ADMIN_ROLES.includes(role)
  const userObj = isAdmin ? {
    id: meta.dbUserId ?? user.id,
    email: user.primaryEmailAddress?.emailAddress ?? '',
    name: user.fullName,
    role,
    tenantId: meta.tenantId ?? null,
  } : null

  return (
    <AuthGuard>
      {isAdmin && userObj && <AdminTicketManagement user={userObj} />}
    </AuthGuard>
  )
}