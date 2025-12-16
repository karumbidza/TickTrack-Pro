'use client'

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
  } | null
  features: Record<string, boolean>
  createdAt: string
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
}

export function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'TRIAL': return 'bg-blue-100 text-blue-800'
      case 'SUSPENDED': return 'bg-red-100 text-red-800'
      case 'CANCELLED': return 'bg-gray-100 text-gray-800'
      case 'EXPIRED': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
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
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-5">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600">Manage all tenants and system settings</p>
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
                This month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-100">Trial Tenants</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {tenants.filter(t => t.status === 'TRIAL').length}
              </div>
              <p className="text-sm text-yellow-100">
                Pending conversion
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                <Building2 className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
                <p className="text-gray-600 mb-4">
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
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Company</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Subscription</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Users</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Tickets</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Features</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{tenant.name}</div>
                            <div className="text-sm text-gray-500">{tenant.slug}</div>
                            {tenant.email && (
                              <div className="text-xs text-gray-400 flex items-center mt-1">
                                <Mail className="h-3 w-3 mr-1" />
                                {tenant.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={getStatusColor(tenant.status)}>
                            {tenant.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium">{tenant.subscription?.plan || 'Free'}</div>
                            <div className="text-sm text-gray-500">
                              {tenant.subscription?.status || 'No subscription'}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <Users className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="font-medium">{tenant.userCount}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <Ticket className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="font-medium">{tenant.ticketCount}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {Object.entries(tenant.features || {}).slice(0, 3).map(([feature, enabled]) => (
                              <div key={feature} className="flex items-center space-x-2">
                                <button
                                  onClick={() => toggleFeature(tenant.id, feature, enabled)}
                                  className="flex items-center space-x-1 text-sm hover:bg-gray-100 p-1 rounded"
                                >
                                  {enabled ? (
                                    <ToggleRight className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                                  )}
                                  <span className={enabled ? 'text-gray-900' : 'text-gray-400'}>
                                    {feature.replace(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                </button>
                              </div>
                            ))}
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
                    ))}
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
                <Building2 className="h-5 w-5 mr-2 text-blue-600" />
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
                <h4 className="font-medium text-gray-900 mb-3">Admin Account</h4>
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
                      <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
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
                  <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                  {selectedTenant?.name}
                </span>
                {selectedTenant && (
                  <Badge className={getStatusColor(selectedTenant.status)}>
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
                    <p className="text-sm text-gray-600">Slug</p>
                    <p className="font-medium">{selectedTenant.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium">
                      {new Date(selectedTenant.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedTenant.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{selectedTenant.email}</span>
                    </div>
                  )}
                  {selectedTenant.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedTenant.phone}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedTenant._count?.users || 0}</p>
                    <p className="text-sm text-gray-600">Users</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedTenant._count?.tickets || 0}</p>
                    <p className="text-sm text-gray-600">Tickets</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">{selectedTenant._count?.assets || 0}</p>
                    <p className="text-sm text-gray-600">Assets</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-600">{selectedTenant._count?.contractors || 0}</p>
                    <p className="text-sm text-gray-600">Contractors</p>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedTenant.features || {}).map(([feature, enabled]) => (
                      <div 
                        key={feature} 
                        className={`flex items-center justify-between p-2 rounded-lg ${enabled ? 'bg-green-50' : 'bg-gray-50'}`}
                      >
                        <span className={enabled ? 'text-green-800' : 'text-gray-500'}>
                          {feature.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <button
                          onClick={() => toggleFeature(selectedTenant.id, feature, enabled)}
                        >
                          {enabled ? (
                            <ToggleRight className="h-5 w-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users */}
                {selectedTenant.users && selectedTenant.users.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Users</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedTenant.users.map((user) => (
                        <div 
                          key={user.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{user.role}</Badge>
                            <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
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
