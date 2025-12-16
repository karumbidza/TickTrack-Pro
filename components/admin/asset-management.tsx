'use client'

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
  invoice?: {
    amount: number
    status: string
  }
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
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
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
  }, [statusFilter, categoryFilter])

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
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      'ACTIVE': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      'MAINTENANCE': { color: 'bg-blue-100 text-blue-800', icon: <Wrench className="h-3 w-3" /> },
      'OUT_OF_SERVICE': { color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
      'RETIRED': { color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
      'REPAIR_NEEDED': { color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
      'DECOMMISSIONED': { color: 'bg-gray-100 text-gray-600', icon: <XCircle className="h-3 w-3" /> },
      'TRANSFERRED': { color: 'bg-purple-100 text-purple-800', icon: <TrendingUp className="h-3 w-3" /> },
      'PENDING_DECOMMISSION': { color: 'bg-amber-100 text-amber-800', icon: <AlertCircle className="h-3 w-3" /> }
    }
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: null }
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
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
                  <p className="text-sm text-gray-500">Total Assets</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Package className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className={stats.pendingDecommission > 0 ? 'border-amber-300 bg-amber-50' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Approval</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pendingDecommission}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Maintenance</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.maintenance}</p>
                </div>
                <Wrench className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Repair Needed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.repairNeeded}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Decommissioned</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.decommissioned}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-400" />
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
            <Button variant="outline" onClick={fetchAssets}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Decommission Requests - Highlighted */}
      {assets.filter(a => a.status === 'PENDING_DECOMMISSION').length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              Pending Decommission Requests ({assets.filter(a => a.status === 'PENDING_DECOMMISSION').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assets.filter(a => a.status === 'PENDING_DECOMMISSION').map(asset => (
                <div key={asset.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{asset.assetNumber}</span>
                      <span className="text-gray-600">{asset.name}</span>
                      {asset.category && (
                        <Badge variant="outline" style={{ borderColor: asset.category.color }}>
                          {asset.category.name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
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
                      className="bg-green-600 hover:bg-green-700"
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
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No assets found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-center text-sm text-gray-500">
                    <th className="pb-3 font-medium text-center">Asset</th>
                    <th className="pb-3 font-medium text-center">Asset ID</th>
                    <th className="pb-3 font-medium text-center">Category</th>
                    <th className="pb-3 font-medium text-center">Location</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                    <th className="pb-3 font-medium text-center">Purchase Price</th>
                    <th className="pb-3 font-medium text-center">Total Cost</th>
                    <th className="pb-3 font-medium text-center">Tickets</th>
                    <th className="pb-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr key={asset.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 text-center">
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          {asset.brand && asset.model && (
                            <p className="text-xs text-gray-400">{asset.brand} {asset.model}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-sm font-mono text-gray-600">{asset.assetNumber}</span>
                      </td>
                      <td className="py-3 text-center">
                        {asset.category ? (
                          <Badge variant="outline" style={{ borderColor: asset.category.color }}>
                            {asset.category.name}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {asset.location}
                        </div>
                      </td>
                      <td className="py-3 text-center">{getStatusBadge(asset.status)}</td>
                      <td className="py-3 text-center text-sm">{formatCurrency(asset.purchasePrice)}</td>
                      <td className="py-3 text-center">
                        <div className="text-sm">
                          <p className="font-medium">{formatCurrency(asset.totalCost)}</p>
                          {asset.totalRepairCost > 0 && (
                            <p className="text-xs text-gray-500">
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
                  <span className="text-gray-500 font-normal">({selectedAsset.assetNumber})</span>
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
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-amber-800">Decommission Request Pending</p>
                          <p className="text-sm text-amber-700 mt-1">
                            Requested by {selectedAsset.decommissionRequestedBy?.name || 'Unknown'} on {formatDate(selectedAsset.decommissionRequestedAt)}
                          </p>
                          <p className="text-sm text-amber-700 mt-1">
                            <strong>Reason:</strong> {selectedAsset.decommissionReason}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
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
                        <Label className="text-gray-500">Category</Label>
                        <p>{selectedAsset.category?.name || 'Uncategorized'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Brand / Model</Label>
                        <p>{selectedAsset.brand || '-'} {selectedAsset.model || ''}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Serial Number</Label>
                        <p>{selectedAsset.serialNumber || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Location</Label>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {selectedAsset.location}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-gray-500">Purchase Date</Label>
                        <p>{formatDate(selectedAsset.purchaseDate)}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Warranty Expires</Label>
                        <p>{formatDate(selectedAsset.warrantyExpires)}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">End of Life Date</Label>
                        <p>{formatDate(selectedAsset.endOfLifeDate)}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Tenant</Label>
                        <p>{selectedAsset.tenant?.name || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financial Summary
                    </h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label className="text-gray-500 text-xs">Purchase Price</Label>
                        <p className="text-lg font-semibold">{formatCurrency(selectedAsset.purchasePrice)}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500 text-xs">Repair Costs</Label>
                        <p className="text-lg font-semibold text-red-600">{formatCurrency(selectedAsset.totalRepairCost)}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500 text-xs">Maintenance Costs</Label>
                        <p className="text-lg font-semibold text-blue-600">{formatCurrency(selectedAsset.totalMaintenanceCost)}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500 text-xs">Total Cost of Ownership</Label>
                        <p className="text-lg font-bold">{formatCurrency(selectedAsset.totalCost)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedAsset.description && (
                    <div>
                      <Label className="text-gray-500">Description</Label>
                      <p className="mt-1 text-gray-700">{selectedAsset.description}</p>
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
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <History className="h-4 w-4 text-blue-600" />
                              </div>
                              {index < selectedAsset.assetHistory!.length - 1 && (
                                <div className="w-px h-full bg-gray-200 my-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{entry.action.replace(/_/g, ' ')}</Badge>
                                {entry.cost && (
                                  <span className="text-sm text-green-600">
                                    {formatCurrency(entry.cost)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 mt-1">{entry.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {entry.performedBy?.name || 'System'} • {formatDate(entry.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
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
                                    <p className="text-xs text-gray-500 mt-1">
                                      Performed by: {mh.contractor.user.name}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {mh.cost && (
                                    <p className="font-medium text-green-600">{formatCurrency(mh.cost)}</p>
                                  )}
                                  <p className="text-xs text-gray-500">{formatDate(mh.performedDate)}</p>
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
                                <span className="font-mono text-sm text-gray-500">{ticket.ticketNumber}</span>
                                <Badge variant="outline">{ticket.status}</Badge>
                              </div>
                              <p className="font-medium mt-1">{ticket.title}</p>
                              {ticket.assignedTo && (
                                <p className="text-sm text-gray-500 mt-1">
                                  <User className="h-3 w-3 inline mr-1" />
                                  {ticket.assignedTo.name}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {ticket.invoice && (
                                <p className="font-medium text-green-600">
                                  {formatCurrency(ticket.invoice.amount)}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                {formatDate(ticket.completedAt || ticket.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
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
                      <div className="text-center py-8 text-gray-500">
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
            <p className="text-sm text-gray-600">
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
