'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Ticket,
  FileText,
  Settings,
  Building2,
  BarChart3,
  Users,
  Briefcase,
  Package,
  FileSearch,
  Inbox,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'U'
}

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  exact?: boolean
}

function getNavItems(role: string): NavItem[] {
  if (role === 'SUPER_ADMIN') {
    return [
      { href: '/super-admin', label: 'Dashboard', icon: <LayoutDashboard size={14} strokeWidth={1.5} />, exact: true },
      { href: '/super-admin/tenants', label: 'Tenants', icon: <Building2 size={14} strokeWidth={1.5} /> },
      { href: '/super-admin/analytics', label: 'Analytics', icon: <BarChart3 size={14} strokeWidth={1.5} /> },
    ]
  }

  if (['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(role)) {
    const items: NavItem[] = [
      { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={14} strokeWidth={1.5} />, exact: true },
      { href: '/admin/tickets', label: 'Tickets', icon: <Ticket size={14} strokeWidth={1.5} /> },
      { href: '/admin/invoices', label: 'Invoices', icon: <FileText size={14} strokeWidth={1.5} /> },
    ]
    if (role === 'TENANT_ADMIN') {
      items.push(
        { href: '/admin/users', label: 'Users', icon: <Users size={14} strokeWidth={1.5} /> },
        { href: '/admin/contractors', label: 'Contractors', icon: <Briefcase size={14} strokeWidth={1.5} /> },
        { href: '/admin/assets', label: 'Assets', icon: <Package size={14} strokeWidth={1.5} /> },
        { href: '/admin/settings', label: 'Settings', icon: <Settings size={14} strokeWidth={1.5} /> },
      )
    }
    return items
  }

  if (role === 'CONTRACTOR') {
    return [
      { href: '/contractor', label: 'Dashboard', icon: <LayoutDashboard size={14} strokeWidth={1.5} />, exact: true },
      { href: '/contractor/invoice-tracker', label: 'Invoice Tracker', icon: <FileSearch size={14} strokeWidth={1.5} /> },
    ]
  }

  return [
    { href: '/dashboard', label: 'My Tickets', icon: <Inbox size={14} strokeWidth={1.5} />, exact: true },
    { href: '/dashboard/assets', label: 'Asset Register', icon: <Package size={14} strokeWidth={1.5} /> },
  ]
}

export function Sidebar({ mobileOpen }: { mobileOpen?: boolean }) {
  const { data: session } = useSession()
  const pathname = usePathname()

  if (!session) return null

  const navItems = getNavItems(session.user.role)

  return (
    <aside className={`sidebar-fixed${mobileOpen ? ' open' : ''}`}>
      {/* Logo */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            backgroundColor: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Ticket size={13} strokeWidth={1.5} style={{ color: 'var(--bg)' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            TickTrack Pro
          </span>
        </Link>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--surface2)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background-color 0.12s ease, color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--surface2)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>
                {isActive && (
                  <ChevronRight size={11} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom user strip */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '8px', flexShrink: 0 }}>
        {/* Notifications row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.05em' }}>
            {session.user.tenantName || (session.user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'TickTrack')}
          </span>
          <NotificationBell pollInterval={30000} />
        </div>

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px' }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: 'var(--accent)',
            color: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 500,
            flexShrink: 0,
            fontFamily: 'DM Mono, monospace',
          }}>
            {getInitials(session.user.name, session.user.email)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {session.user.name || session.user.email}
            </div>
            {session.user.branchName && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.user.branchName}
              </div>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            title="Sign out"
            style={{
              flexShrink: 0,
              padding: 6,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface2)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <LogOut size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  )
}
