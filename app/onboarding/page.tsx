import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/sign-in')

  const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | undefined>
  const role = meta.role ?? 'END_USER'

  if (role === 'SUPER_ADMIN') redirect('/super-admin')
  if (role === 'TENANT_ADMIN' || role === 'IT_ADMIN') redirect('/admin')
  redirect('/dashboard')
}
