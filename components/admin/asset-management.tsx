'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MediaViewer } from '@/components/ui/media-viewer'
import { 
  Package,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Wrench,
  DollarSign,
  Calendar,
  MapPin,
  User,
  History,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  FileText,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

interface AssetCategory {
  id: string
  name: string
  color?: string
}

interface MaintenanceHistoryItem {
  id: string
  type: string
  description: string
  cost: number | null
  performedBy: string | null
  performedDate: string
  contractor?: {
    user: {
      name: string
      email: string
    }
  }
}

interface AssetHistoryItem {
  id: string
  action: string
  description: string
  cost: number | null
  createdAt: string
  performedBy?: {
    name: string
    email: string
  }
}

interface Ticket {
  id: string
  ticketNumber: string
  title: string
  status: string
  createdAt: string
  completedAt: string | null
  invoices?: Array<{
    amount: number
    status: string
  }>
  assignedTo?: {
    name: string
  }
}

interface Asset {
  id: string
  assetNumber: string
  name: string
  description?: string
  categoryId?: string
  category?: AssetCategory
  brand?: string
  model?: string
  serialNumber?: string
  status: string
  location: string
  branch?: {
    id: string
    name: string
  }
  purchaseDate?: string
  warrantyExpires?: string
  endOfLifeDate?: string
  purchasePrice?: number
  currentValue?: number
  images: string[]
  manuals: string[]
  specifications: Record<string, any>
  tenant?: {
    id: string
    name: string
  }
  decommissionRequestedAt?: string
  decommissionRequestedBy?: {
    id: string
    name: string
    email: string
  }
  decommissionReason?: string
  decommissionApprovedAt?: string
  decommissionApprovedBy?: {
    name: string
  }
  tickets: Ticket[]
  maintenanceHistory: MaintenanceHistoryItem[]
  assetHistory?: AssetHistoryItem[]
  totalRepairCost: number
  totalMaintenanceCost: number
  totalCost: number
  _count: {
    tickets: number
    maintenanceHistory: number
    assetHistory: number
  }
}

interface AssetStats {
  total: number
  active: number
  maintenance: number
  pendingDecommission: number
  decommissioned: number
  repairNeeded: number
}

export function AdminAssetManagement() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [stats, setStats] = useState<AssetStats | null>(null)
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [branches, setBranches] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showAssetDetail, setShowAssetDetail] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAssets = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (branchFilter !== 'all') params.set('branch', branchFilter)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/admin/assets?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching assets:', error)
      toast.error('Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/asset-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
    }
  }

  const fetchAssetDetail = async (assetId: string) => {
    try {
      const response = await fetch(`/api/admin/assets/${assetId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedAsset(data.asset)
        setShowAssetDetail(true)
      }
    } catch (error) {
      console.error('Error fetching asset detail:', error)
      toast.error('Failed to load asset details')
    }
  }

  useEffect(() => {
    fetchAssets()
    fetchCategories()
    fetchBranches()
  }, [statusFilter, categoryFilter, branchFilter])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery !== '') {
        fetchAssets()
      }
    }, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const handleApproveDecommission = async (assetId: string) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_decommission' })
      })

      if (response.ok) {
        toast.success('Decommission approved successfully')
        fetchAssets()
        setShowAssetDetail(false)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to approve decommission')
      }
    } catch (error) {
      console.error('Error approving decommission:', error)
      toast.error('Failed to approve decommission')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectDecommission = async () => {
    if (!selectedAsset || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_decommission', reason: rejectReason })
      })

      if (response.ok) {
        toast.success('Decommission rejected')
        fetchAssets()
        setShowRejectDialog(false)
        setShowAssetDetail(false)
        setRejectReason('')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to reject decommission')
      }
    } catch (error) {
      console.error('Error rejecting decommission:', error)
      toast.error('Failed to reject decommission')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { style: React.CSSProperties; icon: React.ReactNode }> = {
      'ACTIVE': { style: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' }, icon: <CheckCircle className="h-3 w-3" /> },
      'MAINTENANCE': { style: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }, icon: <Wrench className="h-3 w-3" /> },
      'OUT_OF_SERVICE': { style: { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }, icon: <XCircle className="h-3 w-3" /> },
      'RETIRED': { style: { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }, icon: <Clock className="h-3 w-3" /> },
      'REPAIR_NEEDED': { style: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }, icon: <AlertTriangle className="h-3 w-3" /> },
      'DECOMMISSIONED': { style: { backgroundColor: 'var(--surface2)', color: 'var(--text-muted)' }, icon: <XCircle className="h-3 w-3" /> },
      'TRANSFERRED': { style: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }, icon: <TrendingUp className="h-3 w-3" /> },
      'PENDING_DECOMMISSION': { style: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }, icon: <AlertCircle className="h-3 w-3" /> }
    }
    const config = statusConfig[status] || { style: { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }, icon: null }
    return (
      <Badge className="flex items-center gap-1" style={config.style}>
        {config.icon}
        {status.replace(/_/g, ' ')}
      </Badge>
    )
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Assets</p>
                  <p className="text-2xl font-medium">{stats.total}</p>
                </div>
                <Package className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active</p>
                  <p className="text-2xl font-medium" style={{ color: 'var(--green)' }}>{stats.active}</p>
                </div>
                <CheckCircle className="h-8 w-8" style={{ color: 'var(--green)' }} />
              </div>
            </CardContent>
          </Card>
          <Card style={stats.pendingDecommission > 0 ? { borderColor: 'var(--amber)', backgroundColor: 'var(--amber-bg)' } : {}}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pending Approval</p>
                  <p className="text-2xl font-medium" style={{ color: 'var(--amber)' }}>{stats.pendingDecommission}</p>
                </div>
                <AlertCircle className="h-8 w-8" style={{ color: 'var(--amber)' }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>In Maintenance</p>
                  <p className="text-2xl font-medium" style={{ color: 'var(--blue)' }}>{stats.maintenance}</p>
                </div>
                <Wrench className="h-8 w-8" style={{ color: 'var(--blue)' }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Repair Needed</p>
                  <p className="text-2xl font-medium" style={{ color: 'var(--red)' }}>{stats.repairNeeded}</p>
                </div>
                <AlertTriangle className="h-8 w-8" style={{ color: 'var(--red)' }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Decommissioned</p>
                  <p className="text-2xl font-medium" style={{ color: 'var(--text-secondary)' }}>{stats.decommissioned}</p>
                </div>
                <XCircle className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING_DECOMMISSION">Pending Decommission</SelectItem>
                <SelectItem value="MAINTENANCE">In Maintenance</SelectItem>
                <SelectItem value="REPAIR_NEEDED">Repair Needed</SelectItem>
                <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                <SelectItem value="TRANSFERRED">Transferred</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchAssets}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Decommission Requests - Highlighted */}
      {assets.filter(a => a.status === 'PENDING_DECOMMISSION').length > 0 && (
        <Card style={{ borderColor: 'var(--amber)', backgroundColor: 'var(--amber-bg)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--amber)' }}>
              <AlertCircle className="h-5 w-5" />
              Pending Decommission Requests ({assets.filter(a => a.status === 'PENDING_DECOMMISSION').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assets.filter(a => a.status === 'PENDING_DECOMMISSION').map(asset => (
                <div key={asset.id} className="flex items-center justify-between p-4 rounded-lg border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--amber)' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{asset.assetNumber}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{asset.name}</span>
                      {asset.category && (
                        <Badge variant="outline" style={{ borderColor: asset.category.color }}>
                          {asset.category.name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      <span>Requested by: {asset.decommissionRequestedBy?.name || 'Unknown'}</span>
                      <span className="mx-2">•</span>
                      <span>Reason: {asset.decommissionReason}</span>
                      <span className="mx-2">•</span>
                      <span>{formatDate(asset.decommissionRequestedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fetchAssetDetail(asset.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm"
                      style={{ backgroundColor: 'var(--green)' }}
                      onClick={() => handleApproveDecommission(asset.id)}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedAsset(asset)
                        setShowRejectDialog(true)
                      }}
                      disabled={actionLoading}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            All Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No assets found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    <th className="pb-3 font-medium text-center">Asset</th>
                    <th className="pb-3 font-medium text-center">Asset ID</th>
                    <th className="pb-3 font-medium text-center">Category</th>
                    <th className="pb-3 font-medium text-center">Site/Branch</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                    <th className="pb-3 font-medium text-center">Purchase Price</th>
                    <th className="pb-3 font-medium text-center">Service Cost</th>
                    <th className="pb-3 font-medium text-center">Tickets</th>
                    <th className="pb-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr key={asset.id} className="border-b" style={{ ['--tw-hover-bg' as string]: 'var(--surface2)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface2)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}>
                      <td className="py-3 text-center">
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          {asset.brand && asset.model && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{asset.brand} {asset.model}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{asset.assetNumber}</span>
                      </td>
                      <td className="py-3 text-center">
                        {asset.category ? (
                          <Badge variant="outline" style={{ borderColor: asset.category.color }}>
                            {asset.category.name}
                          </Badge>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                          {asset.branch?.name || asset.location || '-'}
                        </div>
                      </td>
                      <td className="py-3 text-center">{getStatusBadge(asset.status)}</td>
                      <td className="py-3 text-center text-sm">{formatCurrency(asset.purchasePrice)}</td>
                      <td className="py-3 text-center">
                        <div className="text-sm">
                          <p className="font-medium">{formatCurrency(asset.totalCost)}</p>
                          {asset.totalRepairCost > 0 && (
                            <p className="text-xs text-text-muted">
                              Repairs: {formatCurrency(asset.totalRepairCost)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant="outline">{asset._count.tickets}</Badge>
                      </td>
                      <td className="py-3 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => fetchAssetDetail(asset.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset Detail Modal */}
      <Dialog open={showAssetDetail} onOpenChange={setShowAssetDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Package className="h-6 w-6" />
                  {selectedAsset.name}
                  <span className="text-text-muted font-normal">({selectedAsset.assetNumber})</span>
                  {getStatusBadge(selectedAsset.status)}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="tickets">Tickets ({selectedAsset.tickets.length})</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Pending Decommission Alert */}
                  {selectedAsset.status === 'PENDING_DECOMMISSION' && (
                    <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: 'var(--amber)' }} />
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: 'var(--amber)' }}>Decommission Request Pending</p>
                          <p className="text-sm mt-1" style={{ color: 'var(--amber)' }}>
                            Requested by {selectedAsset.decommissionRequestedBy?.name || 'Unknown'} on {formatDate(selectedAsset.decommissionRequestedAt)}
                          </p>
                          <p className="text-sm mt-1" style={{ color: 'var(--amber)' }}>
                            <strong>Reason:</strong> {selectedAsset.decommissionReason}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              style={{ backgroundColor: 'var(--green)', color: '#fff' }}
                              onClick={() => handleApproveDecommission(selectedAsset.id)}
                              disabled={actionLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve Decommission
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => setShowRejectDialog(true)}
                              disabled={actionLoading}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Asset Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <Label style={{ color: 'var(--text-muted)' }}>Category</Label>
                        <p>{selectedAsset.category?.name || 'Uncategorized'}</p>
                      </div>
                      <div>
                        <Label style={{ color: 'var(--text-muted)' }}>Brand / Model</Label>
                        <p>{selectedAsset.brand || '-'} {selectedAsset.model || ''}</p>
                      </div>
                      <div>
                        <Label style={{ color: 'var(--text-muted)' }}>Serial Number</Label>
                        <p>{selectedAsset.serialNumber || '-'}</p>
                      </div>
                      <div>
                        <Label style={{ color: 'var(--text-muted)' }}>Site / Branch</Label>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                          {selectedAsset.branch?.name || selectedAsset.location || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label style={{ color: 'var(--text-muted)' }}>Purchase Date</Label>
                        <p>{formatDate(selectedAsset.purchaseDate)}</p>
                      </div>
                      <div>
                        <Label style={{ color: 'var(--text-muted)' }}>Warranty Expires</Label>
                        <p>{formatDate(selectedAsset.warrantyExpires)}</p>
                      </div>
                      <div>
                        <Label style={{ color: 'var(--text-muted)' }}>End of Life Date</Label>
                        <p>{formatDate(selectedAsset.endOfLifeDate)}</p>
                      </div>
                      <div>
                        <Label style={{ color: 'var(--text-muted)' }}>Tenant</Label>
                        <p>{selectedAsset.tenant?.name || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--surface2)' }}>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financial Summary
                    </h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Purchase Price</Label>
                        <p className="text-lg font-medium">{formatCurrency(selectedAsset.purchasePrice)}</p>
                      </div>
                      <div>
                        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Repair Costs</Label>
                        <p className="text-lg font-medium" style={{ color: 'var(--red)' }}>{formatCurrency(selectedAsset.totalRepairCost)}</p>
                      </div>
                      <div>
                        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Maintenance Costs</Label>
                        <p className="text-lg font-medium" style={{ color: 'var(--blue)' }}>{formatCurrency(selectedAsset.totalMaintenanceCost)}</p>
                      </div>
                      <div>
                        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Service Cost</Label>
                        <p className="text-lg font-medium" style={{ color: 'var(--amber)' }}>{formatCurrency(selectedAsset.totalCost)}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Repairs + Maintenance</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedAsset.description && (
                    <div>
                      <Label style={{ color: 'var(--text-muted)' }}>Description</Label>
                      <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{selectedAsset.description}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <div className="space-y-4">
                    {/* Asset History Timeline */}
                    {selectedAsset.assetHistory && selectedAsset.assetHistory.length > 0 ? (
                      <div className="space-y-3">
                        {selectedAsset.assetHistory.map((entry, index) => (
                          <div key={entry.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--blue-bg)' }}>
                                <History className="h-4 w-4" style={{ color: 'var(--blue)' }} />
                              </div>
                              {index < selectedAsset.assetHistory!.length - 1 && (
                                <div className="w-px h-full my-1" style={{ backgroundColor: 'var(--border)' }} />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{entry.action.replace(/_/g, ' ')}</Badge>
                                {entry.cost && (
                                  <span className="text-sm" style={{ color: 'var(--green)' }}>
                                    {formatCurrency(entry.cost)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{entry.description}</p>
                              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                {entry.performedBy?.name || 'System'} • {formatDate(entry.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                        No history records found
                      </div>
                    )}

                    {/* Maintenance History */}
                    {selectedAsset.maintenanceHistory.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Maintenance Records
                        </h4>
                        <div className="space-y-2">
                          {selectedAsset.maintenanceHistory.map(mh => (
                            <div key={mh.id} className="border rounded-lg p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <Badge variant="outline">{mh.type}</Badge>
                                  <p className="text-sm mt-1">{mh.description}</p>
                                  {mh.contractor && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                      Performed by: {mh.contractor.user.name}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {mh.cost && (
                                    <p className="font-medium" style={{ color: 'var(--green)' }}>{formatCurrency(mh.cost)}</p>
                                  )}
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(mh.performedDate)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tickets" className="mt-4">
                  {selectedAsset.tickets.length > 0 ? (
                    <div className="space-y-3">
                      {selectedAsset.tickets.map(ticket => (
                        <div key={ticket.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>{ticket.ticketNumber}</span>
                                <Badge variant="outline">{ticket.status}</Badge>
                              </div>
                              <p className="font-medium mt-1">{ticket.title}</p>
                              {ticket.assignedTo && (
                                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                  <User className="h-3 w-3 inline mr-1" />
                                  {ticket.assignedTo.name}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {ticket.invoices?.[0] && (
                                <p className="font-medium" style={{ color: 'var(--green)' }}>
                                  {formatCurrency(ticket.invoices[0].amount)}
                                </p>
                              )}
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {formatDate(ticket.completedAt || ticket.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No tickets found for this asset
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="media" className="mt-4">
                  <div className="space-y-6">
                    {selectedAsset.images && selectedAsset.images.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Asset Images</h4>
                        <MediaViewer 
                          files={selectedAsset.images}
                          gridCols={3}
                          thumbnailSize="md"
                        />
                      </div>
                    )}
                    {selectedAsset.manuals && selectedAsset.manuals.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Manuals & Documents</h4>
                        <MediaViewer 
                          files={selectedAsset.manuals}
                          gridCols={3}
                          thumbnailSize="md"
                        />
                      </div>
                    )}
                    {(!selectedAsset.images || selectedAsset.images.length === 0) && 
                     (!selectedAsset.manuals || selectedAsset.manuals.length === 0) && (
                      <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                        No media files attached
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Decommission Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Please provide a reason for rejecting the decommission request for{' '}
              <strong>{selectedAsset?.name}</strong>.
            </p>
            <div>
              <Label htmlFor="rejectReason">Rejection Reason *</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectDecommission}
              disabled={actionLoading || !rejectReason.trim()}
            >
              {actionLoading ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminAssetManagement
