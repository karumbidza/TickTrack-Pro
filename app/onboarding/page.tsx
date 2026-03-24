import { CreateOrganization } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/Logo'

export default async function OnboardingPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')
  if (orgId) redirect('/admin')

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '24px 16px',
      gap: 24,
    }}>
      <div style={{ textAlign: 'center' }}>
        <Logo size="sm" href="/" />
        <h1 style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 300,
          color: 'var(--text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          marginTop: 24,
          marginBottom: 6,
        }}>
          Set up your organisation
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Create your company workspace to get started
        </p>
      </div>
      <CreateOrganization
        afterCreateOrganizationUrl="/admin"
        appearance={{
          variables: {
            colorPrimary: '#1a1916',
            colorBackground: '#ffffff',
            colorInputBackground: '#f0efe9',
            fontFamily: 'DM Sans, sans-serif',
            borderRadius: '8px',
          },
          elements: {
            card: { border: '1px solid #e0ddd6', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
          },
        }}
      />
    </div>
  )
}
