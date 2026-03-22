'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('Route error caught:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '2.5rem',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: 'var(--amber)' }} />
          </div>

          <p className="section-label mb-3">Error</p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
            We encountered an error loading this page. Please try again.
          </p>

          {process.env.NODE_ENV === 'development' && error.message && (
            <div style={{ marginBottom: 24, padding: 12, backgroundColor: 'var(--surface2)', borderRadius: 8, textAlign: 'left' }}>
              <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <Button variant="ghost" onClick={() => router.push('/')} className="gap-2">
              <Home className="w-4 h-4" />
              Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
