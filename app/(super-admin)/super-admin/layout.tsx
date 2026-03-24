'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useState } from 'react'

const navItems = [
  { icon: 'dashboard', label: 'Overview', href: '/super-admin' },
  { icon: 'corporate_fare', label: 'Tenants', href: '/super-admin/tenants' },
  { icon: 'monitoring', label: 'Analytics', href: '#' },
  { icon: 'dns', label: 'Infrastructure', href: '#' },
  { icon: 'payments', label: 'Subscriptions', href: '#' },
  { icon: 'verified_user', label: 'Security', href: '#' },
  { icon: 'settings', label: 'Settings', href: '#' },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()
  const [search, setSearch] = useState('')

  const displayName = user?.fullName || user?.firstName || 'Super Admin'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="bg-sa-surface text-sa-on-surface antialiased" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside className="flex flex-col h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-sa-surface-container-low z-50 py-8 px-4">
        <div className="mb-10 px-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-headline">AdminConsole</h1>
          <p className="text-xs font-semibold text-sa-on-surface-variant uppercase tracking-widest mt-1">Enterprise Tier</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href !== '#' && (
              item.href === '/super-admin'
                ? pathname === '/super-admin'
                : pathname.startsWith(item.href)
            )
            return (
              <Link
                key={item.label}
                href={item.href}
                className={
                  isActive
                    ? 'flex items-center gap-3 px-4 py-3 text-sm font-semibold text-indigo-600 border-r-4 border-indigo-600 bg-white/50 transition-colors duration-200'
                    : 'flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-500 hover:text-indigo-500 hover:bg-white/80 transition-colors duration-200'
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto pt-8 border-t border-sa-outline-variant/10">
          <button className="w-full flex items-center justify-center gap-2 bg-sa-primary text-sa-on-primary py-2.5 rounded-xl font-semibold text-sm hover:bg-sa-primary-dim transition-all mb-6">
            <span className="material-symbols-outlined text-sm">person_add</span>
            Invite Admin
          </button>
          <div className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-500 transition-colors">
              <span className="material-symbols-outlined text-lg">menu_book</span>
              Documentation
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-500 transition-colors">
              <span className="material-symbols-outlined text-lg">contact_support</span>
              Support
            </a>
          </div>
        </div>
      </aside>

      {/* Topbar */}
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] z-40 flex justify-between items-center h-16 px-8 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sa-outline">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-sa-surface-container-highest border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-sa-primary/20 outline-none"
              placeholder="Search systems, tenants, or records..."
              type="text"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <button className="text-slate-500 hover:text-indigo-500 relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-sa-error rounded-full border-2 border-white"></span>
            </button>
            <button className="text-slate-500 hover:text-indigo-500">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
          </div>
          <div className="h-8 w-px bg-sa-outline-variant/30"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold font-headline text-sa-on-surface">{displayName}</p>
              <p className="text-[10px] text-sa-on-surface-variant font-medium">Super Admin</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-sa-primary-container border-2 border-sa-primary-container flex items-center justify-center font-bold text-sa-on-primary-fixed-variant text-sm">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="ml-64 pt-24 px-8 pb-12 min-h-screen bg-sa-surface">
        {children}
      </main>
    </div>
  )
}
