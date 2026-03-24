'use client'

import { useAuth } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Menu } from 'lucide-react'
import { Logo } from '@/components/Logo'

const PUBLIC_ROUTES = ['/', '/pricing', '/about', '/get-started', '/request-quote', '/register']
const PUBLIC_ROUTE_PREFIXES = ['/contractor-registration/', '/auth/', '/sign-in', '/sign-up', '/onboarding', '/select-org', '/super-admin']

function shouldHideSidebar(pathname: string, isAuthenticated: boolean): boolean {
  if (PUBLIC_ROUTE_PREFIXES.some((p) => pathname.startsWith(p))) return true
  if (!isAuthenticated) {
    if (PUBLIC_ROUTES.includes(pathname)) return true
    if (pathname.startsWith('/pricing') || pathname.startsWith('/about') || pathname.startsWith('/get-started')) return true
  }
  return false
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAuthenticated = isLoaded && !!isSignedIn
  const hide = shouldHideSidebar(pathname, isAuthenticated)

  if (hide || !isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 39,
          }}
        />
      )}

      <Sidebar mobileOpen={mobileOpen} />

      <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Mobile topbar */}
        <div
          className="sidebar-topbar"
          style={{
            height: 52,
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            alignItems: 'center',
            padding: '0 16px',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              padding: 6,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Menu size={18} strokeWidth={1.5} />
          </button>
          <Logo size="sm" href="/dashboard" />
        </div>

        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  )
}
