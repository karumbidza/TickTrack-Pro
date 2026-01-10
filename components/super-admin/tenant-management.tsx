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
  Eye,
  ToggleLeft,
  ToggleRight,
  Plus,
  Search,
  RefreshCw,
  Ticket,
  Mail,
  Phone,
  Power,
  PowerOff,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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

export function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
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
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/super-admin/tenants')
      if (response.ok) {
        const data = await response.json()
        setTenants(data.tenants || [])
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTenant = async () => {
    if (!createForm.name || !createForm.slug || !createForm.adminEmail || !createForm.adminPassword) {
      toast.error('Please fill in all required fields')
      return
    }

    if (createForm.adminPassword !== createForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setProcessing(true)
      const response = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          slug: createForm.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          email: createForm.email,
          phone: createForm.phone,
          address: createForm.address,
          adminName: createForm.adminName,
          adminEmail: createForm.adminEmail,
          adminPassword: createForm.adminPassword
        })
      })

      if (response.ok) {
        toast.success('Tenant created successfully')
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
        fetchTenants()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create tenant')
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

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Loading tenants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen p-5">
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/super-admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
              <p className="text-gray-600">Manage all registered companies and subscriptions</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchTenants}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Tenant
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, slug, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={statusFilter === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All ({tenants.length})
                </Button>
                <Button 
                  variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setStatusFilter('ACTIVE')}
                >
                  Active ({tenants.filter(t => t.status === 'ACTIVE').length})
                </Button>
                <Button 
                  variant={statusFilter === 'TRIAL' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setStatusFilter('TRIAL')}
                >
                  Trial ({tenants.filter(t => t.status === 'TRIAL').length})
                </Button>
                <Button 
                  variant={statusFilter === 'SUSPENDED' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setStatusFilter('SUSPENDED')}
                >
                  Suspended ({tenants.filter(t => t.status === 'SUSPENDED').length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tenants Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Tenants ({filteredTenants.length})</CardTitle>
            <CardDescription>
              Click on a tenant to view details and manage features
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTenants.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No tenants found</p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first tenant to get started'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
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
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Expires/Renews</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Users</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Tickets</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((tenant) => {
                      const expiryDate = tenant.subscription?.currentPeriodEnd || tenant.subscription?.trialEndsAt || tenant.trialEndsAt
                      const daysUntilExpiry = tenant.subscription?.daysUntilExpiry
                      const isExpiringSoon = daysUntilExpiry !== undefined && daysUntilExpiry >= 0 && daysUntilExpiry <= 7
                      
                      return (
                        <tr key={tenant.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => viewTenantDetails(tenant.id)}>
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-gray-900 flex items-center">
                                {tenant.name}
                                {!tenant.onboardingComplete && (
                                  <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700">
                                    New
                                  </Badge>
                                )}
                              </div>
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
                              <div className="font-medium text-gray-900">{tenant.subscription?.plan || 'Free'}</div>
                              <div className="text-sm text-gray-500">
                                {tenant.subscription?.status || 'No subscription'}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {expiryDate ? (
                              <div>
                                <div className={`text-sm font-medium ${isExpiringSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                                  {new Date(expiryDate).toLocaleDateString()}
                                </div>
                                {daysUntilExpiry !== undefined && daysUntilExpiry >= 0 && (
                                  <div className={`text-xs ${isExpiringSoon ? 'text-orange-500' : 'text-gray-500'}`}>
                                    {daysUntilExpiry === 0 ? 'Expires today' : 
                                     daysUntilExpiry === 1 ? 'Expires tomorrow' :
                                     `${daysUntilExpiry} days left`}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
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
                          <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
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
                    placeholder="Acme Corporation"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ 
                      ...createForm, 
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    placeholder="acme-corp"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Company Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@acme.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+263 77 123 4567"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street, Harare"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Admin Account</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="adminName">Admin Name</Label>
                    <Input
                      id="adminName"
                      placeholder="John Doe"
                      value={createForm.adminName}
                      onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminEmail">Admin Email *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@acme.com"
                      value={createForm.adminEmail}
                      onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminPassword">Password *</Label>
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

                {/* Onboarding Progress */}
                {selectedTenant.onboardingSteps && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Onboarding Progress</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`flex items-center p-2 rounded-lg ${selectedTenant.onboardingSteps.adminCreated ? 'bg-green-50' : 'bg-yellow-50'}`}>
                        {selectedTenant.onboardingSteps.adminCreated ? (
                          <span className="text-green-600 mr-2">✓</span>
                        ) : (
                          <span className="text-yellow-600 mr-2">○</span>
                        )}
                        <span className={selectedTenant.onboardingSteps.adminCreated ? 'text-green-800' : 'text-yellow-800'}>
                          Admin Created
                        </span>
                      </div>
                      <div className={`flex items-center p-2 rounded-lg ${selectedTenant.onboardingSteps.branchCreated ? 'bg-green-50' : 'bg-yellow-50'}`}>
                        {selectedTenant.onboardingSteps.branchCreated ? (
                          <span className="text-green-600 mr-2">✓</span>
                        ) : (
                          <span className="text-yellow-600 mr-2">○</span>
                        )}
                        <span className={selectedTenant.onboardingSteps.branchCreated ? 'text-green-800' : 'text-yellow-800'}>
                          Branch Created
                        </span>
                      </div>
                      <div className={`flex items-center p-2 rounded-lg ${selectedTenant.onboardingSteps.categoryCreated ? 'bg-green-50' : 'bg-yellow-50'}`}>
                        {selectedTenant.onboardingSteps.categoryCreated ? (
                          <span className="text-green-600 mr-2">✓</span>
                        ) : (
                          <span className="text-yellow-600 mr-2">○</span>
                        )}
                        <span className={selectedTenant.onboardingSteps.categoryCreated ? 'text-green-800' : 'text-yellow-800'}>
                          Category Created
                        </span>
                      </div>
                      <div className={`flex items-center p-2 rounded-lg ${selectedTenant.onboardingSteps.firstTicketCreated ? 'bg-green-50' : 'bg-yellow-50'}`}>
                        {selectedTenant.onboardingSteps.firstTicketCreated ? (
                          <span className="text-green-600 mr-2">✓</span>
                        ) : (
                          <span className="text-yellow-600 mr-2">○</span>
                        )}
                        <span className={selectedTenant.onboardingSteps.firstTicketCreated ? 'text-green-800' : 'text-yellow-800'}>
                          First Ticket
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment History */}
                {selectedTenant.payments && selectedTenant.payments.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Payments</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedTenant.payments.map((payment: any) => (
                        <div 
                          key={payment.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">${payment.amount} {payment.currency}</p>
                            <p className="text-xs text-gray-500">
                              {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={
                              payment.status === 'success' ? 'bg-green-100 text-green-800' :
                              payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {payment.status}
                            </Badge>
                            {payment.paymentMethod && (
                              <span className="text-xs text-gray-500">{payment.paymentMethod}</span>
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
