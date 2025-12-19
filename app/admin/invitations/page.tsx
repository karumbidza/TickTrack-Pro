import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { InvitationManagement } from '@/components/admin/invitation-management'

export default async function InvitationsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }
  
  const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN']
  
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard')
  }

  return <InvitationManagement user={session.user} />
}
