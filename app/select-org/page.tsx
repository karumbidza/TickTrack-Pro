import { OrganizationList } from '@clerk/nextjs'
import { Logo } from '@/components/Logo'

export default function SelectOrgPage() {
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
      <Logo size="sm" href="/" />
      <OrganizationList
        afterSelectOrganizationUrl="/admin"
        afterCreateOrganizationUrl="/admin"
        appearance={{
          variables: {
            colorPrimary: '#1a1916',
            colorBackground: '#ffffff',
            fontFamily: 'DM Sans, sans-serif',
            borderRadius: '8px',
          },
        }}
      />
    </div>
  )
}
