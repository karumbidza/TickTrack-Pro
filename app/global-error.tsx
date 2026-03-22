'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * GLOBAL ERROR BOUNDARY
 * =====================
 * Catches unhandled errors in the application and displays a friendly error page.
 * Prevents the entire app from crashing due to a single component error.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service (could be Sentry, etc.)
    console.error('Global error caught:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
          <div className="max-w-md w-full text-center">
            <div className="rounded-lg p-8" style={{ backgroundColor: 'var(--surface)' }}>
              {/* Error Icon */}
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--red-bg)' }}>
                <AlertTriangle className="w-8 h-8" style={{ color: 'var(--red)' }} />
              </div>

              {/* Error Message */}
              <h1 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                Something went wrong
              </h1>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                We apologize for the inconvenience. Our team has been notified and is working on a fix.
              </p>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-6 p-4 rounded-lg text-left" style={{ backgroundColor: 'var(--surface2)' }}>
                  <p className="text-sm font-mono break-all" style={{ color: 'var(--text-secondary)' }}>
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={reset}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>
            </div>

            {/* Support Link */}
            <p className="mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              If this problem persists, please{' '}
              <a href="mailto:support@tick-trackpro.com" style={{ color: 'var(--accent)' }} className="hover:underline">
                contact support
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
