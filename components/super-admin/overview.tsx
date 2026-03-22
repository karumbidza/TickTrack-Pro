'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  CreditCard, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Ticket,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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
  status: string
  subscription: {
    plan: string
    daysUntilExpiry?: number
  } | null
  userCount: number
  ticketCount: number
  onboardingComplete?: boolean
  createdAt: string
}

export function SuperAdminOverview() {
  const [stats, setStats] = useState<Stats>({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
    expiringSoon: 0,
    revenue: 0
  })
  const [recentTenants, setRecentTenants] = useState<Tenant[]>([])
  const [expiringTenants, setExpiringTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, tenantsRes] = await Promise.all([
        fetch('/api/super-admin/stats'),
        fetch('/api/super-admin/tenants')
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }

      if (tenantsRes.ok) {
        const data = await tenantsRes.json()
        const tenants = data.tenants || []
        
        // Get 5 most recent tenants
        setRecentTenants(tenants.slice(0, 5))
        
        // Get tenants expiring within 7 days
        setExpiringTenants(tenants.filter((t: Tenant) => {
          const daysUntil = t.subscription?.daysUntilExpiry
          return daysUntil !== undefined && daysUntil >= 0 && daysUntil <= 7
        }))
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'ACTIVE': return { backgroundColor: 'var(--green-bg)', color: 'var(--green)' }
      case 'TRIAL': return { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }
      case 'SUSPENDED': return { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }
      case 'EXPIRED': return { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }
      default: return { backgroundColor: 'var(--surface2)', color: 'var(--text-muted)' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-medium" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>Super Admin Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Platform overview and quick actions</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchDashboardData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href="/super-admin/tenants">
              <Button>
                <Building2 className="h-4 w-4 mr-2" />
                Manage Tenants
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-border" style={{ backgroundColor: 'var(--surface)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Tenants</CardTitle>
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--blue-bg)' }}>
                <Building2 className="h-5 w-5" style={{ color: 'var(--blue)' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ fontWeight: 300, fontSize: '2rem', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>{stats.totalTenants}</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {stats.activeTenants} active
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border" style={{ backgroundColor: 'var(--surface)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Users</CardTitle>
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--green-bg)' }}>
                <Users className="h-5 w-5" style={{ color: 'var(--green)' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ fontWeight: 300, fontSize: '2rem', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>{stats.totalUsers}</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Across all tenants
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border" style={{ backgroundColor: 'var(--surface)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Monthly Revenue</CardTitle>
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface2)' }}>
                <CreditCard className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ fontWeight: 300, fontSize: '2rem', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>${stats.revenue.toLocaleString()}</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Estimated
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border" style={{ backgroundColor: 'var(--surface)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Expiring Soon</CardTitle>
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: expiringTenants.length > 0 ? 'var(--amber-bg)' : 'var(--surface2)' }}>
                <AlertTriangle className="h-5 w-5" style={{ color: expiringTenants.length > 0 ? 'var(--amber)' : 'var(--text-muted)' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ fontWeight: 300, fontSize: '2rem', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>{expiringTenants.length}</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Within 7 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/super-admin/tenants">
            <Card className="transition-shadow cursor-pointer border border-border" style={{ backgroundColor: 'var(--surface)' }}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--blue-bg)' }}>
                    <Building2 className="h-6 w-6" style={{ color: 'var(--blue)' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Tenant Management</h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create, edit, and manage tenants</p>
                  </div>
                  <ArrowRight className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="cursor-pointer border border-border opacity-60" style={{ backgroundColor: 'var(--surface)' }}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--green-bg)' }}>
                  <CreditCard className="h-6 w-6" style={{ color: 'var(--green)' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Billing & Payments</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>View payment history</p>
                </div>
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer border border-border opacity-60" style={{ backgroundColor: 'var(--surface)' }}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--surface2)' }}>
                  <Settings className="h-6 w-6" style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Platform Settings</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Configure system settings</p>
                </div>
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Subscriptions */}
          <Card className="border border-border" style={{ backgroundColor: 'var(--surface)' }}>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: 'var(--amber)' }}>
                <AlertTriangle className="h-5 w-5 mr-2" />
                Subscriptions Expiring Soon
              </CardTitle>
              <CardDescription style={{ color: 'var(--text-muted)' }}>
                Tenants that need renewal attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiringTenants.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--green)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>No subscriptions expiring soon</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All tenants are up to date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expiringTenants.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg border border-border" style={{ backgroundColor: 'var(--amber-bg)' }}>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{tenant.name}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tenant.subscription?.plan || 'Trial'}</p>
                      </div>
                      <div className="text-right">
                        <Badge style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>
                          {tenant.subscription?.daysUntilExpiry === 0
                            ? 'Expires today'
                            : `${tenant.subscription?.daysUntilExpiry} days left`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <Link href="/super-admin/tenants">
                    <Button variant="outline" className="w-full mt-2">
                      View All Tenants
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tenants */}
          <Card className="border border-border" style={{ backgroundColor: 'var(--surface)' }}>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: 'var(--text-primary)' }}>
                <Clock className="h-5 w-5 mr-2" style={{ color: 'var(--accent)' }} />
                Recent Tenants
              </CardTitle>
              <CardDescription style={{ color: 'var(--text-muted)' }}>
                Latest tenant registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTenants.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>No tenants yet</p>
                  <Link href="/super-admin/tenants">
                    <Button className="mt-3">Create First Tenant</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTenants.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }}>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--blue-bg)' }}>
                          <span className="text-sm font-medium" style={{ color: 'var(--blue)' }}>
                            {tenant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{tenant.name}</p>
                          <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <Users className="h-3 w-3" />
                            <span>{tenant.userCount}</span>
                            <Ticket className="h-3 w-3 ml-2" />
                            <span>{tenant.ticketCount}</span>
                          </div>
                        </div>
                      </div>
                      <Badge style={getStatusStyle(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </div>
                  ))}
                  <Link href="/super-admin/tenants">
                    <Button variant="outline" className="w-full mt-2">
                      View All Tenants
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Platform Health */}
        <Card className="border border-border" style={{ backgroundColor: 'var(--surface)' }}>
          <CardHeader>
            <CardTitle className="flex items-center" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp className="h-5 w-5 mr-2" style={{ color: 'var(--green)' }} />
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--green-bg)' }}>
                <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--green)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>API Status</p>
                <p className="text-xs" style={{ color: 'var(--green)' }}>Operational</p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--green-bg)' }}>
                <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--green)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Database</p>
                <p className="text-xs" style={{ color: 'var(--green)' }}>Connected</p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--green-bg)' }}>
                <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--green)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Authentication</p>
                <p className="text-xs" style={{ color: 'var(--green)' }}>Secure</p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--amber-bg)' }}>
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--amber)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Payments</p>
                <p className="text-xs" style={{ color: 'var(--amber)' }}>Configure Paynow</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
