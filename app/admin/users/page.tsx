import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { UserManagement } from '@/components/admin/user-management'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }
  
  const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
  
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard')
  }

  return <UserManagement user={session.user} />
}
