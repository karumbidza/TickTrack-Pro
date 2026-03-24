import { SignUp } from '@clerk/nextjs'
import { Logo } from '@/components/Logo'

export default function SignUpPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <Logo size="sm" href="/" />
        </div>
        <SignUp
          fallbackRedirectUrl="/onboarding"
          appearance={{
            variables: {
              colorPrimary: '#1a1916',
              colorBackground: '#ffffff',
              colorInputBackground: '#f0efe9',
              colorInputText: '#1a1916',
              fontFamily: 'DM Sans, sans-serif',
              borderRadius: '8px',
            },
            elements: {
              card: {
                border: '1px solid #e0ddd6',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              },
            },
          }}
        />
      </div>
    </div>
  )
}
