'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Ticket,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return 'U'
}

export function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const loadingBar = (
    <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)', height: 64 }} className="sticky top-0 z-50 flex items-center px-5">
      <div className="flex items-center gap-2">
        <Ticket className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
        <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 16 }}>TickTrack Pro</span>
      </div>
      <div className="ml-auto animate-pulse">
        <div className="h-8 w-20 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }} />
      </div>
    </nav>
  )

  if (status === 'loading') return loadingBar

  if (!session) {
    return (
      <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)', height: 64 }} className="sticky top-0 z-50 flex items-center px-5">
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
          <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 16 }}>TickTrack Pro</span>
        </Link>
        <div className="ml-auto flex gap-2">
          <Link href="/auth/signin">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>
    )
  }

  const getNavigationLinks = () => {
    const role = session.user.role

    if (role === 'SUPER_ADMIN') {
      return [
        { href: '/super-admin', label: 'Dashboard' },
        { href: '/super-admin/tenants', label: 'Tenants' },
        { href: '/super-admin/analytics', label: 'Analytics' }
      ]
    }

    if (['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(role)) {
      const links = [
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/tickets', label: 'Tickets' },
        { href: '/admin/invoices', label: 'Invoices' }
      ]
      if (role === 'TENANT_ADMIN') {
        links.push({ href: '/admin/settings', label: 'Settings' })
      }
      return links
    }

    if (role === 'CONTRACTOR') {
      return [
        { href: '/contractor', label: 'Dashboard' },
        { href: '/contractor/invoice-tracker', label: 'Invoice Tracker' }
      ]
    }

    return [{ href: '/dashboard', label: 'My Tickets' }]
  }

  return (
    <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }} className="sticky top-0 z-50">
      <div className="px-4 sm:px-6" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Ticket className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
          <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 16 }} className="hidden xs:inline">TickTrack Pro</span>
          <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 16 }} className="xs:hidden">TTP</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {getNavigationLinks().map((link) => {
            const isActive = pathname === link.href ||
              (link.href !== '/admin' && link.href !== '/dashboard' && link.href !== '/contractor' && link.href !== '/super-admin' && pathname?.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--surface2)' : 'transparent',
                  transition: 'all 0.15s ease',
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <NotificationBell pollInterval={30000} />

          {/* Tenant / branch badges (desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <Badge variant="neutral">
              {session.user.tenantName || (session.user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'TickTrack Pro')}
            </Badge>
            {session.user.branchName && session.user.role !== 'SUPER_ADMIN' && (
              <Badge variant="info">
                {session.user.branchName}
              </Badge>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop user dropdown */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full text-sm font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
                >
                  {getInitials(session.user.name, session.user.email)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}>
                    {getInitials(session.user.name, session.user.email)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    {session.user.name && (
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{session.user.name}</p>
                    )}
                    {session.user.email && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{session.user.email}</p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={session.user.role === 'TENANT_ADMIN' ? '/admin/settings' : '/dashboard'} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  style={{ color: 'var(--ds-red)' }}
                  onSelect={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Mobile user info */}
          <div className="flex items-center gap-3 py-3 px-2 mt-3 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }}>
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}>
              {getInitials(session.user.name, session.user.email)}
            </div>
            <div className="flex-1 min-w-0">
              {session.user.name && (
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{session.user.name}</p>
              )}
              {session.user.email && (
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{session.user.email}</p>
              )}
              <div className="flex gap-1 mt-1 flex-wrap">
                <Badge variant="neutral">
                  {session.user.tenantName || (session.user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'TickTrack Pro')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Mobile nav links */}
          <div className="mt-3 space-y-1">
            {getNavigationLinks().map((link) => {
              const isActive = pathname === link.href ||
                (link.href !== '/admin' && link.href !== '/dashboard' && link.href !== '/contractor' && link.href !== '/super-admin' && pathname?.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--surface2)' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Mobile actions */}
          <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
            <Link
              href={session.user.role === 'TENANT_ADMIN' ? '/admin/settings' : '/dashboard'}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Settings className="mr-3 h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm"
              style={{ color: 'var(--ds-red)' }}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
