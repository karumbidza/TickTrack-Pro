'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
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
  Ticket,
  Tag,
  GitBranch,
  TicketIcon,
  Bell,
  BarChart2,
  Building,
  CreditCard,
} from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Logo } from '@/components/Logo'

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'U'
}

const SETTINGS_SUB_ITEMS = [
  { href: '/admin/settings/categories',   label: 'Categories',    icon: <Tag size={12} strokeWidth={1.5} /> },
  { href: '/admin/settings/branches',     label: 'Branches',      icon: <GitBranch size={12} strokeWidth={1.5} /> },
  { href: '/admin/settings/ticket-types', label: 'Ticket Types',  icon: <TicketIcon size={12} strokeWidth={1.5} /> },
  { href: '/admin/settings/notifications',label: 'Notifications', icon: <Bell size={12} strokeWidth={1.5} /> },
  { href: '/admin/settings/reports',      label: 'Reports',       icon: <BarChart2 size={12} strokeWidth={1.5} /> },
  { href: '/admin/settings/organisation', label: 'Organisation',  icon: <Building size={12} strokeWidth={1.5} /> },
  { href: '/admin/settings/billing',      label: 'Billing',       icon: <CreditCard size={12} strokeWidth={1.5} /> },
]

function NavLink({ href, label, icon, isActive, trailing }: {
  href: string
  label: string
  icon: React.ReactNode
  exact?: boolean
  isActive: boolean
  trailing?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`nav-item${isActive ? ' active' : ''}`}
      style={{ textDecoration: 'none' }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      {trailing}
    </Link>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: 'DM Mono, monospace',
      fontSize: 'var(--text-xs)',
      fontWeight: 400,
      letterSpacing: 'var(--tracking-wider)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      padding: '8px 10px 4px',
    }}>
      {label}
    </div>
  )
}

export function Sidebar({ mobileOpen }: { mobileOpen?: boolean }) {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const pathname = usePathname()

  if (!isLoaded || !user) return null

  const meta = user.publicMetadata as Record<string, string | null>
  const role = (meta.role as string) ?? 'END_USER'
  const tenantName = meta.tenantName ?? null
  const branchName = meta.branchName ?? null
  const isAdmin = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(role)
  const isTenantAdmin = role === 'TENANT_ADMIN'
  const isSettingsActive = pathname?.startsWith('/admin/settings')

  return (
    <aside className={`sidebar-fixed${mobileOpen ? ' open' : ''}`}>
      {/* Logo */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <Logo size="sm" href="/dashboard" />
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>

        {/* SUPER ADMIN */}
        {role === 'SUPER_ADMIN' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <NavLink href="/super-admin" label="Dashboard" icon={<LayoutDashboard size={14} strokeWidth={1.5} />} exact isActive={pathname === '/super-admin'} />
            <NavLink href="/super-admin/tenants" label="Tenants" icon={<Building2 size={14} strokeWidth={1.5} />} isActive={pathname?.startsWith('/super-admin/tenants')} />
            <NavLink href="/super-admin/analytics" label="Analytics" icon={<BarChart3 size={14} strokeWidth={1.5} />} isActive={pathname?.startsWith('/super-admin/analytics')} />
          </div>
        )}

        {/* CONTRACTOR */}
        {role === 'CONTRACTOR' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <NavLink href="/contractor" label="Dashboard" icon={<LayoutDashboard size={14} strokeWidth={1.5} />} exact isActive={pathname === '/contractor'} />
            <NavLink href="/contractor/invoice-tracker" label="Invoice Tracker" icon={<FileSearch size={14} strokeWidth={1.5} />} isActive={pathname?.startsWith('/contractor/invoice-tracker')} />
          </div>
        )}

        {/* END USER */}
        {!isAdmin && role !== 'SUPER_ADMIN' && role !== 'CONTRACTOR' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <NavLink href="/dashboard" label="My Tickets" icon={<Inbox size={14} strokeWidth={1.5} />} exact isActive={pathname === '/dashboard'} />
            <NavLink href="/dashboard/assets" label="Asset Register" icon={<Package size={14} strokeWidth={1.5} />} isActive={pathname?.startsWith('/dashboard/assets')} />
          </div>
        )}

        {/* ADMIN */}
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SectionLabel label="Main" />
            <NavLink href="/admin" label="Dashboard" icon={<LayoutDashboard size={15} strokeWidth={1.6} />} exact isActive={pathname === '/admin'} />
            <NavLink href="/admin/tickets" label="Tickets" icon={<Ticket size={15} strokeWidth={1.6} />} isActive={pathname?.startsWith('/admin/tickets')} />
            <NavLink
              href="/admin/invoices"
              label="Invoices"
              icon={<FileText size={15} strokeWidth={1.6} />}
              isActive={pathname?.startsWith('/admin/invoices')}
              trailing={<span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--accent-color)', flexShrink: 0 }} />}
            />

            {isTenantAdmin && (
              <>
                <SectionLabel label="Manage" />
                <NavLink href="/admin/users" label="Users" icon={<Users size={15} strokeWidth={1.6} />} isActive={pathname?.startsWith('/admin/users')} />
                <NavLink href="/admin/contractors" label="Contractors" icon={<Briefcase size={15} strokeWidth={1.6} />} isActive={pathname?.startsWith('/admin/contractors')} />
                <NavLink href="/admin/assets" label="Assets" icon={<Package size={15} strokeWidth={1.6} />} isActive={pathname?.startsWith('/admin/assets')} />
              </>
            )}

            {isTenantAdmin && (
              <>
                <SectionLabel label="Config" />
                {/* Settings parent */}
                <Link
                  href="/admin/settings/categories"
                  className={`nav-item${isSettingsActive ? ' active' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  <span style={{ flexShrink: 0, display: 'flex' }}>
                    <Settings size={15} strokeWidth={1.6} />
                  </span>
                  <span style={{ flex: 1 }}>Settings</span>
                  <ChevronRight
                    size={11}
                    strokeWidth={2}
                    style={{
                      opacity: 0.55,
                      flexShrink: 0,
                      transform: isSettingsActive ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                </Link>

                {/* Settings sub-items — shown when any settings route is active */}
                {isSettingsActive && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
                    {SETTINGS_SUB_ITEMS.map((sub) => {
                      const subActive = pathname === sub.href || pathname?.startsWith(sub.href + '/')
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`nav-subitem${subActive ? ' active' : ''}`}
                          style={{ textDecoration: 'none' }}
                        >
                          {sub.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </nav>

      {/* Bottom user strip */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '8px', flexShrink: 0 }}>
        {/* Notifications row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: 'var(--tracking-wide)' }}>
            {tenantName || (role === 'SUPER_ADMIN' ? 'Super Admin' : 'TickTrack')}
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
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            flexShrink: 0,
            fontFamily: 'DM Mono, monospace',
          }}>
            {getInitials(user.fullName, user.primaryEmailAddress?.emailAddress)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.fullName || user.primaryEmailAddress?.emailAddress}
            </div>
            {branchName && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {branchName}
              </div>
            )}
          </div>
          <button
            onClick={() => signOut({ redirectUrl: '/sign-in' })}
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
