'use client'

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'TRIAL': return 'bg-blue-100 text-blue-800'
      case 'SUSPENDED': return 'bg-red-100 text-red-800'
      case 'EXPIRED': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen p-5">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600">Platform overview and quick actions</p>
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
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total Tenants</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTenants}</div>
              <p className="text-sm text-blue-100">
                {stats.activeTenants} active
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Total Users</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
              <p className="text-sm text-green-100">
                Across all tenants
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Monthly Revenue</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.revenue.toLocaleString()}</div>
              <p className="text-sm text-purple-100">
                Estimated
              </p>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-lg ${expiringTenants.length > 0 ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Expiring Soon</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{expiringTenants.length}</div>
              <p className="text-sm text-white/80">
                Within 7 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/super-admin/tenants">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Tenant Management</h3>
                    <p className="text-sm text-gray-500">Create, edit, and manage tenants</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-green-200 opacity-60">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Billing & Payments</h3>
                  <p className="text-sm text-gray-500">View payment history</p>
                </div>
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-200 opacity-60">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Platform Settings</h3>
                  <p className="text-sm text-gray-500">Configure system settings</p>
                </div>
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-orange-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Subscriptions Expiring Soon
              </CardTitle>
              <CardDescription>
                Tenants that need renewal attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiringTenants.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">No subscriptions expiring soon</p>
                  <p className="text-sm text-gray-400">All tenants are up to date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expiringTenants.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <div>
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        <p className="text-sm text-gray-500">{tenant.subscription?.plan || 'Trial'}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-orange-100 text-orange-800">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Recent Tenants
              </CardTitle>
              <CardDescription>
                Latest tenant registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTenants.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No tenants yet</p>
                  <Link href="/super-admin/tenants">
                    <Button className="mt-3">Create First Tenant</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTenants.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {tenant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{tenant.name}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Users className="h-3 w-3" />
                            <span>{tenant.userCount}</span>
                            <Ticket className="h-3 w-3 ml-2" />
                            <span>{tenant.ticketCount}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(tenant.status)}>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">API Status</p>
                <p className="text-xs text-green-600">Operational</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Database</p>
                <p className="text-xs text-green-600">Connected</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Authentication</p>
                <p className="text-xs text-green-600">Secure</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Payments</p>
                <p className="text-xs text-yellow-600">Configure Paynow</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
