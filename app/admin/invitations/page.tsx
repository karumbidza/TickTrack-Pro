import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { InvitationManagement } from '@/components/admin/invitation-management'

export default async function InvitationsPage() {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
  const role = (meta.role as string) ?? 'END_USER'

  const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN']

  if (!allowedRoles.includes(role)) {
    redirect('/dashboard')
  }

  const user = {
    id: meta.dbUserId ?? userId,
    role,
    tenantId: meta.tenantId ?? null,
    tenantName: meta.tenantName ?? null,
    branchId: meta.branchId ?? null,
    branchName: meta.branchName ?? null,
    name: meta.userName ?? null,
    email: meta.userEmail ?? null,
  }

  return <InvitationManagement user={user} />
}
