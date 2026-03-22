'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  Building2, 
  Users, 
  CreditCard, 
  AlertTriangle,
  Eye,
  Settings,
  ToggleLeft,
  ToggleRight,
  Plus,
  Search,
  RefreshCw,
  Ticket,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Power,
  PowerOff,
  Trash2,
  Edit,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface Tenant {
  id: string
  name: string
  slug: string
  email?: string
  phone?: string
  address?: string
  status: string
  isActive: boolean
  userCount: number
  ticketCount: number
  subscription: {
    plan: string
    status: string
    currentPeriodEnd?: string
    trialEndsAt?: string
    daysUntilExpiry?: number
  } | null
  features: Record<string, boolean>
  createdAt: string
  trialEndsAt?: string
  onboardingComplete?: boolean
}

interface TenantDetails extends Tenant {
  users: Array<{
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
  }>
  _count: {
    users: number
    tickets: number
    assets: number
    contractors: number
  }
  payments?: Array<{
    id: string
    amount: number
    currency: string
    status: string
    paymentMethod?: string
    paidAt?: string
    createdAt: string
  }>
  onboardingSteps?: {
    adminCreated: boolean
    branchCreated: boolean
    categoryCreated: boolean
    firstTicketCreated: boolean
  }
}

export function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
    expiringSoon: 0,
    revenue: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<TenantDetails | null>(null)
  const [processing, setProcessing] = useState(false)
  
  // Create tenant form
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [tenantsRes, statsRes] = await Promise.all([
        fetch('/api/super-admin/tenants'),
        fetch('/api/super-admin/stats')
      ])
      
      if (tenantsRes.ok && statsRes.ok) {
        const tenantsData = await tenantsRes.json()
        const statsData = await statsRes.json()
        
        setTenants(tenantsData.tenants || [])
        setStats(statsData.stats || {
          totalTenants: 0,
          activeTenants: 0,
          totalUsers: 0,
          revenue: 0
        })
      } else {
        console.error('API requests failed')
        setTenants([])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setTenants([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTenant = async () => {
    if (!createForm.name || !createForm.slug || !createForm.adminEmail || !createForm.adminPassword) {
      toast.error('Please fill all required fields')
      return
    }

    if (createForm.adminPassword !== createForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (createForm.adminPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      })

      if (response.ok) {
        toast.success('Tenant created successfully. A verification email has been sent to the admin.')
        setShowCreateDialog(false)
        setCreateForm({
          name: '',
          slug: '',
          email: '',
          phone: '',
          address: '',
          adminName: '',
          adminEmail: '',
          adminPassword: '',
          confirmPassword: ''
        })
        fetchDashboardData()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create tenant')
      }
    } catch (error) {
      console.error('Failed to create tenant:', error)
      toast.error('Failed to create tenant')
    } finally {
      setProcessing(false)
    }
  }

  const toggleTenantStatus = async (tenantId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })
      
      if (response.ok) {
        toast.success(isActive ? 'Tenant disabled' : 'Tenant enabled')
        setTenants(tenants.map(tenant => 
          tenant.id === tenantId 
            ? { ...tenant, isActive: !isActive, status: !isActive ? 'ACTIVE' : 'SUSPENDED' }
            : tenant
        ))
      } else {
        toast.error('Failed to update tenant status')
      }
    } catch (error) {
      console.error('Failed to toggle tenant status:', error)
      toast.error('Failed to update tenant status')
    }
  }

  const toggleFeature = async (tenantId: string, feature: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, enabled: !enabled })
      })
      
      if (response.ok) {
        toast.success(`Feature ${enabled ? 'disabled' : 'enabled'}`)
        setTenants(tenants.map(tenant => 
          tenant.id === tenantId 
            ? { 
                ...tenant, 
                features: { ...tenant.features, [feature]: !enabled }
              }
            : tenant
        ))
      } else {
        toast.error('Failed to toggle feature')
      }
    } catch (error) {
      console.error('Failed to toggle feature:', error)
      toast.error('Failed to toggle feature')
    }
  }

  const viewTenantDetails = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedTenant(data.tenant)
        setShowViewDialog(true)
      } else {
        toast.error('Failed to load tenant details')
      }
    } catch (error) {
      console.error('Failed to fetch tenant details:', error)
      toast.error('Failed to load tenant details')
    }
  }

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'ACTIVE': return { backgroundColor: 'var(--green-bg)', color: 'var(--green)' }
      case 'TRIAL': return { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }
      case 'SUSPENDED': return { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }
      case 'CANCELLED': return { backgroundColor: 'var(--surface2)', color: 'var(--text-muted)' }
      case 'EXPIRED': return { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }
      default: return { backgroundColor: 'var(--surface2)', color: 'var(--text-muted)' }
    }
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
    <div className="p-5" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-medium" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>Super Admin Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Manage all tenants and system settings</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchDashboardData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Tenant
            </Button>
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
                This month
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border" style={{ backgroundColor: 'var(--surface)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Expiring Soon</CardTitle>
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--amber-bg)' }}>
                <AlertTriangle className="h-5 w-5" style={{ color: 'var(--amber)' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ fontWeight: 300, fontSize: '2rem', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
                {tenants.filter(t => {
                  const daysUntil = t.subscription?.daysUntilExpiry
                  return daysUntil !== undefined && daysUntil >= 0 && daysUntil <= 7
                }).length}
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Within 7 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              <Input
                placeholder="Search tenants by name, slug, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tenants Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tenant Management</CardTitle>
            <CardDescription>
              View and manage all registered companies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No tenants found</h3>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {tenants.length === 0 
                    ? 'Create your first tenant to get started'
                    : 'Try adjusting your search criteria'
                  }
                </p>
                {tenants.length === 0 && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tenant
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>Company</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>Status</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>Subscription</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>Expires/Renews</th>
                      <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>Users</th>
                      <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>Tickets</th>
                      <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((tenant) => {
                      const expiryDate = tenant.subscription?.currentPeriodEnd || tenant.subscription?.trialEndsAt || tenant.trialEndsAt
                      const daysUntilExpiry = tenant.subscription?.daysUntilExpiry
                      const isExpiringSoon = daysUntilExpiry !== undefined && daysUntilExpiry >= 0 && daysUntilExpiry <= 7
                      
                      return (
                        <tr key={tenant.id} className="border-b border-border hover:opacity-80">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium flex items-center" style={{ color: 'var(--text-primary)' }}>
                                {tenant.name}
                                {!tenant.onboardingComplete && (
                                  <Badge variant="outline" className="ml-2 text-xs" style={{ backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }}>
                                    New
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{tenant.slug}</div>
                              {tenant.email && (
                                <div className="text-xs flex items-center mt-1" style={{ color: 'var(--text-muted)' }}>
                                  <Mail className="h-3 w-3 mr-1" />
                                  {tenant.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge style={getStatusStyle(tenant.status)}>
                              {tenant.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{tenant.subscription?.plan || 'Free'}</div>
                              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                {tenant.subscription?.status || 'No subscription'}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {expiryDate ? (
                              <div>
                                <div className="text-sm font-medium" style={{ color: isExpiringSoon ? 'var(--amber)' : 'var(--text-primary)' }}>
                                  {new Date(expiryDate).toLocaleDateString()}
                                </div>
                                {daysUntilExpiry !== undefined && daysUntilExpiry >= 0 && (
                                  <div className="text-xs" style={{ color: isExpiringSoon ? 'var(--amber)' : 'var(--text-muted)' }}>
                                    {daysUntilExpiry === 0 ? 'Expires today' :
                                     daysUntilExpiry === 1 ? 'Expires tomorrow' :
                                     `${daysUntilExpiry} days left`}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <Users className="h-4 w-4 mr-1" style={{ color: 'var(--text-muted)' }} />
                              <span className="font-medium">{tenant.userCount}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <Ticket className="h-4 w-4 mr-1" style={{ color: 'var(--text-muted)' }} />
                              <span className="font-medium">{tenant.ticketCount}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => viewTenantDetails(tenant.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant={tenant.isActive ? "destructive" : "default"}
                                onClick={() => toggleTenantStatus(tenant.id, tenant.isActive)}
                              >
                                {tenant.isActive ? (
                                  <PowerOff className="h-4 w-4" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Tenant Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" style={{ color: 'var(--accent)' }} />
                Create New Tenant
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    placeholder="Acme Corp"
                    value={createForm.name}
                    onChange={(e) => {
                      setCreateForm({ 
                        ...createForm, 
                        name: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
                      })
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    placeholder="acme-corp"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Company Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="info@acmecorp.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1 234 567 8900"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Admin Account</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="adminName">Admin Name</Label>
                    <Input
                      id="adminName"
                      placeholder="John Smith"
                      value={createForm.adminName}
                      onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminEmail">Admin Email *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@acmecorp.com"
                      value={createForm.adminEmail}
                      onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminPassword">Admin Password *</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      placeholder="••••••••"
                      value={createForm.adminPassword}
                      onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={createForm.confirmPassword}
                      onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                    />
                    {createForm.adminPassword && createForm.confirmPassword && createForm.adminPassword !== createForm.confirmPassword && (
                      <p className="text-sm mt-1" style={{ color: 'var(--red)' }}>Passwords do not match</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTenant} disabled={processing}>
                {processing ? 'Creating...' : 'Create Tenant'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Tenant Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" style={{ color: 'var(--accent)' }} />
                  {selectedTenant?.name}
                </span>
                {selectedTenant && (
                  <Badge style={getStatusStyle(selectedTenant.status)}>
                    {selectedTenant.status}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {selectedTenant && (
              <div className="space-y-6">
                {/* Company Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Slug</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedTenant.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Created</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {new Date(selectedTenant.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedTenant.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--text-primary)' }}>{selectedTenant.email}</span>
                    </div>
                  )}
                  {selectedTenant.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--text-primary)' }}>{selectedTenant.phone}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg text-center border border-border" style={{ backgroundColor: 'var(--blue-bg)' }}>
                    <p style={{ fontWeight: 300, fontSize: '1.5rem', letterSpacing: '-0.025em', color: 'var(--blue)' }}>{selectedTenant._count?.users || 0}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Users</p>
                  </div>
                  <div className="p-3 rounded-lg text-center border border-border" style={{ backgroundColor: 'var(--green-bg)' }}>
                    <p style={{ fontWeight: 300, fontSize: '1.5rem', letterSpacing: '-0.025em', color: 'var(--green)' }}>{selectedTenant._count?.tickets || 0}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tickets</p>
                  </div>
                  <div className="p-3 rounded-lg text-center border border-border" style={{ backgroundColor: 'var(--surface2)' }}>
                    <p style={{ fontWeight: 300, fontSize: '1.5rem', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>{selectedTenant._count?.assets || 0}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Assets</p>
                  </div>
                  <div className="p-3 rounded-lg text-center border border-border" style={{ backgroundColor: 'var(--amber-bg)' }}>
                    <p style={{ fontWeight: 300, fontSize: '1.5rem', letterSpacing: '-0.025em', color: 'var(--amber)' }}>{selectedTenant._count?.contractors || 0}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Contractors</p>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedTenant.features || {}).map(([feature, enabled]) => (
                      <div
                        key={feature}
                        className="flex items-center justify-between p-2 rounded-lg border border-border"
                        style={{ backgroundColor: enabled ? 'var(--green-bg)' : 'var(--surface2)' }}
                      >
                        <span style={{ color: enabled ? 'var(--green)' : 'var(--text-muted)' }}>
                          {feature.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <button
                          onClick={() => toggleFeature(selectedTenant.id, feature, enabled)}
                        >
                          {enabled ? (
                            <ToggleRight className="h-5 w-5" style={{ color: 'var(--green)' }} />
                          ) : (
                            <ToggleLeft className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Onboarding Progress */}
                {selectedTenant.onboardingSteps && (
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Onboarding Progress</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center p-2 rounded-lg border border-border" style={{ backgroundColor: selectedTenant.onboardingSteps.adminCreated ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
                        <span className="mr-2" style={{ color: selectedTenant.onboardingSteps.adminCreated ? 'var(--green)' : 'var(--amber)' }}>{selectedTenant.onboardingSteps.adminCreated ? '✓' : '○'}</span>
                        <span style={{ color: selectedTenant.onboardingSteps.adminCreated ? 'var(--green)' : 'var(--amber)' }}>Admin Created</span>
                      </div>
                      <div className="flex items-center p-2 rounded-lg border border-border" style={{ backgroundColor: selectedTenant.onboardingSteps.branchCreated ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
                        <span className="mr-2" style={{ color: selectedTenant.onboardingSteps.branchCreated ? 'var(--green)' : 'var(--amber)' }}>{selectedTenant.onboardingSteps.branchCreated ? '✓' : '○'}</span>
                        <span style={{ color: selectedTenant.onboardingSteps.branchCreated ? 'var(--green)' : 'var(--amber)' }}>Branch Created</span>
                      </div>
                      <div className="flex items-center p-2 rounded-lg border border-border" style={{ backgroundColor: selectedTenant.onboardingSteps.categoryCreated ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
                        <span className="mr-2" style={{ color: selectedTenant.onboardingSteps.categoryCreated ? 'var(--green)' : 'var(--amber)' }}>{selectedTenant.onboardingSteps.categoryCreated ? '✓' : '○'}</span>
                        <span style={{ color: selectedTenant.onboardingSteps.categoryCreated ? 'var(--green)' : 'var(--amber)' }}>Category Created</span>
                      </div>
                      <div className="flex items-center p-2 rounded-lg border border-border" style={{ backgroundColor: selectedTenant.onboardingSteps.firstTicketCreated ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
                        <span className="mr-2" style={{ color: selectedTenant.onboardingSteps.firstTicketCreated ? 'var(--green)' : 'var(--amber)' }}>{selectedTenant.onboardingSteps.firstTicketCreated ? '✓' : '○'}</span>
                        <span style={{ color: selectedTenant.onboardingSteps.firstTicketCreated ? 'var(--green)' : 'var(--amber)' }}>First Ticket</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment History */}
                {selectedTenant.payments && selectedTenant.payments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Recent Payments</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedTenant.payments.map((payment: any) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-2 rounded-lg border border-border"
                          style={{ backgroundColor: 'var(--surface2)' }}
                        >
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>${payment.amount} {payment.currency}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge style={
                              payment.status === 'success' ? { backgroundColor: 'var(--green-bg)', color: 'var(--green)' } :
                              payment.status === 'pending' ? { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' } :
                              { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }
                            }>
                              {payment.status}
                            </Badge>
                            {payment.paymentMethod && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{payment.paymentMethod}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users */}
                {selectedTenant.users && selectedTenant.users.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Users</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedTenant.users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded-lg border border-border"
                          style={{ backgroundColor: 'var(--surface2)' }}
                        >
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{user.role}</Badge>
                            <Badge style={user.isActive ? { backgroundColor: 'var(--green-bg)', color: 'var(--green)' } : { backgroundColor: 'var(--surface2)', color: 'var(--text-muted)' }}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    variant={selectedTenant.isActive ? "destructive" : "default"}
                    onClick={() => {
                      toggleTenantStatus(selectedTenant.id, selectedTenant.isActive)
                      setShowViewDialog(false)
                    }}
                  >
                    {selectedTenant.isActive ? (
                      <>
                        <PowerOff className="h-4 w-4 mr-2" />
                        Disable Tenant
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4 mr-2" />
                        Enable Tenant
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
