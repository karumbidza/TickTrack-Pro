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
  User,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'

// Helper function to get initials from name
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

  if (status === 'loading') {
    return (
      <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="px-3 sm:px-5">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <div className="flex items-center">
              <Ticket className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <span className="ml-2 text-lg sm:text-xl font-bold">TickTrack Pro</span>
            </div>
            <div className="animate-pulse">
              <div className="h-8 w-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  if (!session) {
    return (
      <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="px-3 sm:px-5">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <div className="flex items-center">
              <Ticket className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <span className="ml-2 text-lg sm:text-xl font-bold">TickTrack Pro</span>
            </div>
            <div className="flex gap-2">
              <Link href="/auth/signin">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="text-xs sm:text-sm">Get Started</Button>
              </Link>
            </div>
          </div>
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
      
      // Only tenant admin can access settings
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
    
    // END_USER
    return [
      { href: '/dashboard', label: 'My Tickets' }
    ]
  }

  const formatRole = (role: string) => {
    return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="px-3 sm:px-5">
        <div className="flex justify-between h-14 sm:h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <Ticket className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <span className="ml-2 text-lg sm:text-xl font-bold hidden xs:inline">TickTrack Pro</span>
              <span className="ml-2 text-lg font-bold xs:hidden">TTP</span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            {session && getNavigationLinks().map((link) => {
              const isActive = pathname === link.href || 
                (link.href !== '/admin' && link.href !== '/dashboard' && link.href !== '/contractor' && link.href !== '/super-admin' && pathname?.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 ease-in-out
                    hover:scale-105 hover:shadow-md
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* User Menu & Mobile Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {session && (
              <>
                <NotificationBell pollInterval={30000} />
                
                {/* Desktop Badges */}
                <div className="hidden lg:flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {session.user.tenantName || (session.user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'TickTrack Pro')}
                  </Badge>
                  {session.user.branchName && session.user.role !== 'SUPER_ADMIN' && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
                      📍 {session.user.branchName}
                    </Badge>
                  )}
                </div>
              </>
            )}
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            
            {/* Desktop User Menu */}
            {session && (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                    >
                      {getInitials(session.user.name, session.user.email)}
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {getInitials(session.user.name, session.user.email)}
                    </div>
                    <div className="flex flex-col space-y-1 leading-none">
                      {session.user.name && (
                        <p className="font-medium">{session.user.name}</p>
                      )}
                      {session.user.email && (
                        <p className="w-[180px] truncate text-sm text-muted-foreground">
                          {session.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link 
                      href={session.user.role === 'TENANT_ADMIN' ? '/admin/settings' : '/dashboard'} 
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                    onSelect={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && session && (
          <div className="md:hidden py-4 border-t">
            {/* Mobile User Info */}
            <div className="flex items-center gap-3 px-2 py-3 mb-3 bg-gray-50 rounded-lg">
              <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {getInitials(session.user.name, session.user.email)}
              </div>
              <div className="flex-1 min-w-0">
                {session.user.name && (
                  <p className="font-medium text-sm truncate">{session.user.name}</p>
                )}
                {session.user.email && (
                  <p className="text-xs text-gray-600 truncate">{session.user.email}</p>
                )}
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {session.user.tenantName || (session.user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'TickTrack Pro')}
                  </Badge>
                  {session.user.branchName && session.user.role !== 'SUPER_ADMIN' && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
                      📍 {session.user.branchName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Navigation Links */}
            <div className="space-y-1 mb-4">
              {getNavigationLinks().map((link) => {
                const isActive = pathname === link.href || 
                  (link.href !== '/admin' && link.href !== '/dashboard' && link.href !== '/contractor' && link.href !== '/super-admin' && pathname?.startsWith(link.href))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      block px-4 py-3 rounded-lg text-sm font-medium
                      transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* Mobile Menu Actions */}
            <div className="space-y-1 border-t pt-4">
              <Link
                href={session.user.role === 'TENANT_ADMIN' ? '/admin/settings' : '/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="mr-3 h-4 w-4" />
                <span>Settings</span>
              </Link>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}