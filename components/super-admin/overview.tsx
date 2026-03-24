'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Stats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  expiringSoon: number
  revenue: number
}

interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  status: string
  subscription: {
    plan: string
    daysUntilExpiry?: number
  } | null
  userCount: number
  ticketCount: number
  createdAt: string
}

function statusBadge(status: string) {
  switch (status) {
    case 'ACTIVE':
      return <span className="px-3 py-1 bg-sa-secondary-container text-sa-on-secondary-fixed-variant text-[10px] font-bold rounded-full uppercase tracking-tighter">Active</span>
    case 'TRIAL':
      return <span className="px-3 py-1 bg-sa-primary-container text-sa-on-primary-fixed-variant text-[10px] font-bold rounded-full uppercase tracking-tighter">Trial</span>
    case 'SUSPENDED':
      return <span className="px-3 py-1 bg-sa-error-container text-sa-on-error-container text-[10px] font-bold rounded-full uppercase tracking-tighter">Suspended</span>
    case 'EXPIRED':
      return <span className="px-3 py-1 bg-sa-surface-container-highest text-sa-on-surface-variant text-[10px] font-bold rounded-full uppercase tracking-tighter">Expired</span>
    default:
      return <span className="px-3 py-1 bg-sa-surface-container text-sa-on-surface-variant text-[10px] font-bold rounded-full uppercase tracking-tighter">{status}</span>
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function SuperAdminOverview() {
  const [stats, setStats] = useState<Stats>({ totalTenants: 0, activeTenants: 0, totalUsers: 0, expiringSoon: 0, revenue: 0 })
  const [recentTenants, setRecentTenants] = useState<Tenant[]>([])
  const [expiringTenants, setExpiringTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [statsRes, tenantsRes] = await Promise.all([
        fetch('/api/super-admin/stats'),
        fetch('/api/super-admin/tenants'),
      ])
      if (statsRes.ok) {
        const d = await statsRes.json()
        setStats(d.stats)
      }
      if (tenantsRes.ok) {
        const d = await tenantsRes.json()
        const tenants: Tenant[] = d.tenants || []
        setRecentTenants(tenants.slice(0, 5))
        setExpiringTenants(
          tenants.filter((t) => {
            const days = t.subscription?.daysUntilExpiry
            return days !== undefined && days >= 0 && days <= 7
          })
        )
      }
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-sa-primary text-4xl animate-spin">progress_activity</span>
          <p className="text-sa-on-surface-variant text-sm">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Welcome */}
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-sa-on-surface mb-2">System Overview</h2>
        <p className="text-sa-on-surface-variant max-w-2xl">
          TickTrack Pro infrastructure is online.
          {expiringTenants.length > 0 && (
            <> You have <span className="font-bold text-sa-primary">{expiringTenants.length} subscription{expiringTenants.length !== 1 ? 's' : ''} expiring soon</span> requiring attention.</>
          )}
          {expiringTenants.length === 0 && <> All subscriptions are up to date.</>}
        </p>
      </section>

      {/* Stats bento */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Total Tenants */}
        <div className="bg-sa-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-sa-primary-container rounded-lg text-sa-primary">
              <span className="material-symbols-outlined">corporate_fare</span>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{stats.activeTenants} active</span>
          </div>
          <p className="text-sm font-medium text-sa-on-surface-variant mb-1">Total Tenants</p>
          <h3 className="text-3xl font-extrabold font-headline text-sa-on-surface">{stats.totalTenants}</h3>
          <p className="text-[10px] text-sa-on-surface-variant mt-2">Registered instances</p>
        </div>

        {/* Total Users */}
        <div className="bg-sa-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-sa-secondary-container rounded-lg text-sa-secondary">
              <span className="material-symbols-outlined">group</span>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">All tenants</span>
          </div>
          <p className="text-sm font-medium text-sa-on-surface-variant mb-1">Total Users</p>
          <h3 className="text-3xl font-extrabold font-headline text-sa-on-surface">{stats.totalUsers.toLocaleString()}</h3>
          <p className="text-[10px] text-sa-on-surface-variant mt-2">Across all accounts</p>
        </div>

        {/* Revenue */}
        <div className="bg-sa-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-sa-tertiary-container rounded-lg text-sa-tertiary">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-sa-on-surface-variant opacity-60">Estimated</span>
          </div>
          <p className="text-sm font-medium text-sa-on-surface-variant mb-1">Monthly Revenue</p>
          <h3 className="text-3xl font-extrabold font-headline text-sa-on-surface">${stats.revenue.toLocaleString()}</h3>
          <div className="mt-2 w-full bg-sa-surface-container h-1 rounded-full overflow-hidden">
            <div className="bg-sa-primary h-full" style={{ width: stats.totalTenants > 0 ? `${Math.min((stats.activeTenants / stats.totalTenants) * 100, 100)}%` : '0%' }}></div>
          </div>
        </div>

        {/* Expiring */}
        <div className="bg-sa-error-dim/10 p-6 rounded-xl shadow-sm border border-sa-error/10">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-sa-error rounded-lg text-sa-on-error">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
          </div>
          <p className="text-sm font-medium text-sa-error mb-1">Expiring Soon</p>
          <h3 className="text-3xl font-extrabold font-headline text-sa-on-error-container">{stats.expiringSoon}</h3>
          <p className="text-[10px] text-sa-error font-medium mt-2">
            {stats.expiringSoon > 0 ? 'Requires attention' : 'No action needed'}
          </p>
        </div>
      </section>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: recent tenants + health */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent tenant registrations */}
          <div className="bg-sa-surface-container-lowest rounded-xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="text-lg font-bold font-headline text-sa-on-surface">Recent Tenant Registrations</h4>
                <p className="text-sm text-sa-on-surface-variant">Latest accounts created</p>
              </div>
              <Link href="/super-admin/tenants" className="text-sm font-semibold text-sa-primary hover:underline">
                View All
              </Link>
            </div>

            {recentTenants.length === 0 ? (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-4xl text-sa-on-surface-variant mb-3 block">corporate_fare</span>
                <p className="text-sa-on-surface-variant text-sm">No tenants yet</p>
                <Link href="/super-admin/tenants" className="inline-block mt-4 px-4 py-2 bg-sa-primary text-sa-on-primary rounded-lg text-sm font-semibold">
                  Create First Tenant
                </Link>
              </div>
            ) : (
              <div className="space-y-0">
                {recentTenants.map((tenant) => (
                  <div key={tenant.id} className="group flex items-center justify-between py-5 border-b border-sa-surface-container transition-all hover:bg-sa-surface-bright rounded-lg px-2">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-sa-surface-container flex items-center justify-center font-bold text-sa-on-surface-variant">
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-sa-on-surface">{tenant.name}</p>
                        <p className="text-xs text-sa-on-surface-variant">
                          Registered {timeAgo(tenant.createdAt)}{tenant.email ? ` • ${tenant.email}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {statusBadge(tenant.status)}
                      <button className="text-sa-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform Health */}
          <div className="bg-sa-surface-container-low rounded-xl p-8">
            <h4 className="text-lg font-bold font-headline text-sa-on-surface mb-6">Platform Health</h4>
            <div className="flex gap-4 overflow-x-auto pb-4">
              <div className="min-w-[140px] flex-1 bg-white p-4 rounded-xl border border-sa-outline-variant/10">
                <p className="text-[10px] uppercase font-bold text-sa-on-surface-variant mb-3">API Status</p>
                <div className="flex items-center gap-2 h-12 mb-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-medium text-emerald-600">Operational</span>
                </div>
                <p className="text-lg font-bold text-sa-on-surface">Live</p>
              </div>
              <div className="min-w-[140px] flex-1 bg-white p-4 rounded-xl border border-sa-outline-variant/10">
                <p className="text-[10px] uppercase font-bold text-sa-on-surface-variant mb-3">Database</p>
                <div className="flex items-center gap-2 h-12 mb-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-medium text-emerald-600">Connected</span>
                </div>
                <p className="text-lg font-bold text-sa-on-surface">99.9% Up</p>
              </div>
              <div className="min-w-[140px] flex-1 bg-white p-4 rounded-xl border border-sa-outline-variant/10">
                <p className="text-[10px] uppercase font-bold text-sa-on-surface-variant mb-3">Auth</p>
                <div className="flex items-center gap-2 h-12 mb-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-medium text-emerald-600">Secure</span>
                </div>
                <p className="text-lg font-bold text-sa-on-surface">Clerk</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick actions + alerts */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="bg-sa-surface-container-lowest rounded-xl p-8 shadow-sm">
            <h4 className="text-lg font-bold font-headline text-sa-on-surface mb-6">Quick Actions</h4>
            <div className="space-y-4">
              <Link href="/super-admin/tenants" className="w-full flex items-center justify-between p-4 rounded-xl bg-sa-surface-container-low hover:bg-sa-primary-container group transition-all">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-sa-primary group-hover:scale-110 transition-transform">corporate_fare</span>
                  <span className="text-sm font-semibold">Tenant Management</span>
                </div>
                <span className="material-symbols-outlined text-sa-outline text-sm">chevron_right</span>
              </Link>
              <div className="relative">
                <button disabled className="w-full flex items-center justify-between p-4 rounded-xl bg-sa-surface-container-low opacity-60 cursor-not-allowed">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-sa-secondary">credit_card</span>
                    <span className="text-sm font-semibold">Billing &amp; Payments</span>
                  </div>
                  <span className="text-[10px] font-bold bg-sa-surface-container-highest px-2 py-1 rounded-md">Coming Soon</span>
                </button>
              </div>
              <button disabled className="w-full flex items-center justify-between p-4 rounded-xl bg-sa-surface-container-low opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-sa-primary">settings_input_component</span>
                  <span className="text-sm font-semibold">Platform Settings</span>
                </div>
                <span className="text-[10px] font-bold bg-sa-surface-container-highest px-2 py-1 rounded-md">Coming Soon</span>
              </button>
            </div>
          </div>

          {/* Subscription Alerts */}
          <div className="bg-sa-surface-container-lowest rounded-xl p-8 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <span className="material-symbols-outlined text-sa-error/20 text-6xl rotate-12">history</span>
            </div>
            <h4 className="text-lg font-bold font-headline text-sa-on-surface mb-6">Subscription Alerts</h4>

            {expiringTenants.length === 0 ? (
              <div className="text-center py-4 relative z-10">
                <span className="material-symbols-outlined text-3xl text-emerald-500 block mb-2">check_circle</span>
                <p className="text-sm text-sa-on-surface-variant">All subscriptions current</p>
              </div>
            ) : (
              <ul className="space-y-6 relative z-10">
                {expiringTenants.slice(0, 4).map((tenant) => (
                  <li key={tenant.id} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-sa-error mt-2" style={{ boxShadow: '0 0 8px rgba(158,63,78,0.5)' }}></div>
                    <div>
                      <p className="text-sm font-bold text-sa-on-surface">{tenant.name}</p>
                      <p className="text-xs text-sa-on-surface-variant">
                        {tenant.subscription?.daysUntilExpiry === 0
                          ? 'Expires today'
                          : `Expires in ${tenant.subscription?.daysUntilExpiry} day${tenant.subscription?.daysUntilExpiry !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Link href="/super-admin/tenants">
              <button className="w-full mt-8 py-3 text-sm font-bold text-sa-error border border-sa-error/20 rounded-xl hover:bg-sa-error/5 transition-colors">
                {expiringTenants.length > 0 ? 'Process Renewals' : 'View All Tenants'}
              </button>
            </Link>
          </div>

          {/* Support widget */}
          <div className="bg-indigo-900 rounded-xl p-6 text-white overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-8xl">contact_support</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-2">Priority Support</p>
            <h5 className="text-lg font-headline font-bold mb-4 leading-tight">Need infrastructure assistance?</h5>
            <button className="px-4 py-2 bg-white text-indigo-900 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors">
              Open Ticket
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
