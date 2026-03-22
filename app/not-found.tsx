import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '2.5rem',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <FileQuestion className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          </div>

          <p className="section-label mb-3">404</p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 8 }}>
            Page not found
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/">
              <Button className="gap-2 w-full sm:w-auto">
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full sm:w-auto">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: 12, color: 'var(--text-muted)' }}>
          Need help?{' '}
          <a href="mailto:support@tick-trackpro.com" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
