'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MediaViewer } from '@/components/ui/media-viewer'
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Archive,
  ArrowRightLeft,
  Calendar,
  MapPin,
  Wrench,
  Image,
  FileText,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface Asset {
  id: string
  assetNumber: string
  name: string
  description?: string
  categoryId: string
  category?: {
    id: string
    name: string
    color?: string
    icon?: string
  }
  brand?: string
  model?: string
  serialNumber?: string
  status: string
  location: string
  purchaseDate?: string
  warrantyExpires?: string
  purchasePrice?: number
  images: string[]
  manuals: string[]
  lastMaintenanceDate?: string
  nextMaintenanceDate?: string
  specifications: Record<string, any>
  // Decommission/Transfer fields
  decommissionedAt?: string
  transferredAt?: string
  decommissionReason?: string
  transferReason?: string
  transferLocation?: string
  transferredTo?: string
}

interface AssetCategory {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  _count?: {
    assets: number
  }
}

interface AssetRegisterProps {
  tenantId: string
}

export function AssetRegister({ tenantId }: AssetRegisterProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDecommissionDialog, setShowDecommissionDialog] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const assetStatuses = [
    'ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED', 'REPAIR_NEEDED', 'DECOMMISSIONED', 'TRANSFERRED'
  ]

  useEffect(() => {
    fetchAssets()
    fetchCategories()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [assets, searchTerm, statusFilter, categoryFilter])

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets')
      const data = await response.json()
      setAssets(data.assets || [])
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/asset-categories')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const applyFilters = () => {
    let filtered = assets

    if (searchTerm) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(asset => asset.status === statusFilter)
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(asset => asset.categoryId === categoryFilter)
    }

    setFilteredAssets(filtered)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      MAINTENANCE: 'bg-yellow-100 text-yellow-800',
      OUT_OF_SERVICE: 'bg-red-100 text-red-800',
      RETIRED: 'bg-gray-100 text-gray-800',
      REPAIR_NEEDED: 'bg-orange-100 text-orange-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4" />
      case 'MAINTENANCE':
      case 'REPAIR_NEEDED':
        return <Wrench className="h-4 w-4" />
      case 'OUT_OF_SERVICE':
      case 'RETIRED':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  const stats = {
    total: filteredAssets.length,
    active: filteredAssets.filter(a => a.status === 'ACTIVE').length,
    maintenance: filteredAssets.filter(a => ['MAINTENANCE', 'REPAIR_NEEDED'].includes(a.status)).length,
    outOfService: filteredAssets.filter(a => ['OUT_OF_SERVICE', 'RETIRED'].includes(a.status)).length
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading assets...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Register</h1>
            <p className="text-gray-600">Manage your company assets and equipment</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
              <AssetForm 
                onAssetCreated={() => {
                  fetchAssets()
                  setShowCreateDialog(false)
                }} 
                tenantId={tenantId} 
                onCancel={() => setShowCreateDialog(false)}
                categories={categories}
                onOpenCategoryManager={() => {
                  setShowCreateDialog(false)
                  setShowCategoryDialog(true)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.maintenance}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Service</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.outOfService}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search assets by name, number, location, or serial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {assetStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => setShowCategoryDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Manage Categories
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {assets.length === 0 ? 'No assets registered' : 'No assets match your filters'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {assets.length === 0 ? 'Start by adding your first asset' : 'Try adjusting your search criteria'}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Asset
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Asset</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Location</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Serial Number</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Maintenance</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr key={asset.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {getStatusIcon(asset.status)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{asset.name}</div>
                              <div className="text-sm text-gray-500">{asset.assetNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-900">{asset.category?.name || 'Uncategorized'}</div>
                          {asset.brand && (
                            <div className="text-xs text-gray-500">{asset.brand} {asset.model}</div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center text-sm text-gray-900">
                            <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                            {asset.location}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {asset.serialNumber || '-'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge className={getStatusColor(asset.status)}>
                            {asset.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          {asset.nextMaintenanceDate ? (
                            <div className="flex items-center text-sm">
                              <Calendar className="h-3 w-3 mr-1 text-yellow-500" />
                              <span className={new Date(asset.nextMaintenanceDate) < new Date() ? 'text-red-600' : 'text-gray-600'}>
                                {new Date(asset.nextMaintenanceDate).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center space-x-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              title="Edit"
                              onClick={() => {
                                setSelectedAsset(asset)
                                setShowEditDialog(true)
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-orange-600 hover:text-orange-700"
                              title="Decommission"
                              onClick={() => {
                                setSelectedAsset(asset)
                                setShowDecommissionDialog(true)
                              }}
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-blue-600 hover:text-blue-700"
                              title="Transfer"
                              onClick={() => {
                                setSelectedAsset(asset)
                                setShowTransferDialog(true)
                              }}
                            >
                              <ArrowRightLeft className="h-3 w-3" />
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

        {/* Decommission Dialog */}
        <Dialog open={showDecommissionDialog} onOpenChange={setShowDecommissionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Decommission Asset</DialogTitle>
            </DialogHeader>
            <DecommissionForm 
              asset={selectedAsset}
              onDecommissioned={() => {
                fetchAssets()
                setShowDecommissionDialog(false)
                setSelectedAsset(null)
              }}
              onCancel={() => {
                setShowDecommissionDialog(false)
                setSelectedAsset(null)
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Asset Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
            {selectedAsset && (
              <EditAssetForm 
                asset={selectedAsset}
                categories={categories}
                onAssetUpdated={() => {
                  fetchAssets()
                  setShowEditDialog(false)
                  setSelectedAsset(null)
                }}
                onCancel={() => {
                  setShowEditDialog(false)
                  setSelectedAsset(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Transfer Dialog */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Transfer Asset</DialogTitle>
            </DialogHeader>
            <TransferForm 
              asset={selectedAsset}
              onTransferred={() => {
                fetchAssets()
                setShowTransferDialog(false)
                setSelectedAsset(null)
              }}
              onCancel={() => {
                setShowTransferDialog(false)
                setSelectedAsset(null)
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Category Management Dialog */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Asset Categories</DialogTitle>
            </DialogHeader>
            <CategoryManager 
              categories={categories}
              onCategoriesChanged={fetchCategories}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function AssetForm({ onAssetCreated, tenantId, onCancel, categories, onOpenCategoryManager }: { onAssetCreated: () => void; tenantId: string; onCancel: () => void; categories: AssetCategory[]; onOpenCategoryManager?: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'ACTIVE',
    location: '',
    purchaseDate: '',
    warrantyExpires: '',
    purchasePrice: '',
    specifications: ''
  })
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading || submitted) {
      return // Prevent duplicate submissions
    }
    
    // Validate required fields
    if (!formData.name.trim() || !formData.category || !formData.location.trim()) {
      toast.error('Please fill in all required fields (Name, Category, Location)')
      return
    }
    
    setLoading(true)
    setSubmitted(true)

    try {
      // Handle specifications parsing safely
      let specifications = {}
      if (formData.specifications.trim()) {
        try {
          specifications = JSON.parse(formData.specifications)
        } catch (e) {
          toast.error('Invalid specifications format. Please use valid JSON or leave empty.')
          setLoading(false)
          setSubmitted(false)
          return
        }
      }

      const assetData = {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        specifications: specifications,
        images: [], // Would be populated after file upload
        manuals: []
      }

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Asset "${formData.name}" created successfully!`)
        onAssetCreated() // This will close dialog and refresh list
      } else {
        const errorData = await response.json()
        toast.error(`Failed to create asset: ${errorData.error || 'Unknown error'}`)
        setSubmitted(false) // Allow retry
      }
    } catch (error) {
      console.error('Failed to create asset:', error)
      toast.error('Failed to create asset. Please try again.')
      setSubmitted(false) // Allow retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Add New Asset</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Asset Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <SelectItem value="__none__" disabled>No categories - Create one first</SelectItem>
                ) : (
                  categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {categories.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                <Button variant="link" className="h-auto p-0 text-xs" onClick={() => onOpenCategoryManager?.()}>
                  Click here to create categories first
                </Button>
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData({...formData, brand: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input
              id="serialNumber"
              value={formData.serialNumber}
              onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="images">Asset Images</Label>
          <Input
            id="images"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setImages(Array.from(e.target.files || []))}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || submitted}>
            {loading ? 'Creating...' : 'Create Asset'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Decommission Form Component
interface DecommissionFormProps {
  asset: Asset | null
  onDecommissioned: () => void
  onCancel: () => void
}

function DecommissionForm({ asset, onDecommissioned, onCancel }: DecommissionFormProps) {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState(false)

  const predefinedReasons = [
    'End of life cycle',
    'Obsolete technology',
    'Beyond economical repair',
    'Safety concerns',
    'Upgraded to newer model',
    'No longer needed',
    'Damaged beyond repair',
    'Other'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalReason = reason === 'Other' ? customReason : reason
    
    if (!asset || !finalReason.trim()) {
      toast.error('Please provide a reason for decommissioning.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PENDING_DECOMMISSION',
          decommissionRequestedAt: new Date().toISOString(),
          decommissionReason: finalReason
        })
      })

      if (response.ok) {
        toast.success(`Decommission request submitted for "${asset.name}". Awaiting admin approval.`)
        onDecommissioned()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to submit request: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to request decommission:', error)
      toast.error('Failed to submit decommission request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!asset) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Admin Approval Required</p>
            <p className="text-sm text-amber-700 mt-1">
              Decommission requests require admin approval. Your request will be reviewed and you&apos;ll be notified of the decision.
            </p>
          </div>
        </div>
      </div>
      
      <div>
        <p className="text-sm text-gray-600 mb-4">
          You are requesting to decommission <strong>{asset.name}</strong> ({asset.assetNumber}). 
          This will mark the asset as pending decommission until approved by an admin.
        </p>
      </div>

      <div>
        <Label htmlFor="decommissionReason">Reason for Decommissioning *</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {predefinedReasons.map((reasonOption) => (
              <SelectItem key={reasonOption} value={reasonOption}>
                {reasonOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reason === 'Other' && (
        <div>
          <Label htmlFor="customReason">Custom Reason *</Label>
          <Textarea
            id="customReason"
            placeholder="Please specify the reason..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            required
          />
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading || !reason.trim() || (reason === 'Other' && !customReason.trim())} 
          className="bg-amber-600 hover:bg-amber-700"
        >
          {loading ? 'Submitting...' : 'Request Decommission'}
        </Button>
      </div>
    </form>
  )
}

// Edit Asset Form Component
interface EditAssetFormProps {
  asset: Asset
  categories: AssetCategory[]
  onAssetUpdated: () => void
  onCancel: () => void
}

function EditAssetForm({ asset, categories, onAssetUpdated, onCancel }: EditAssetFormProps) {
  const [formData, setFormData] = useState({
    name: asset.name,
    description: asset.description || '',
    category: asset.categoryId || '',
    brand: asset.brand || '',
    model: asset.model || '',
    serialNumber: asset.serialNumber || '',
    status: asset.status,
    location: asset.location,
    purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
    warrantyExpires: asset.warrantyExpires ? asset.warrantyExpires.split('T')[0] : '',
    purchasePrice: asset.purchasePrice?.toString() || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.location.trim()) {
      toast.error('Please fill in all required fields (Name, Location)')
      return
    }
    
    setLoading(true)

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        categoryId: formData.category || null,
        brand: formData.brand,
        model: formData.model,
        serialNumber: formData.serialNumber,
        status: formData.status,
        location: formData.location,
        purchaseDate: formData.purchaseDate || null,
        warrantyExpires: formData.warrantyExpires || null,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null
      }

      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        toast.success('Asset updated successfully!')
        onAssetUpdated()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to update asset: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to update asset:', error)
      toast.error('Failed to update asset. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const assetStatuses = [
    'ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED', 'REPAIR_NEEDED'
  ]

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Edit Asset: {asset.assetNumber}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-name">Asset Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <SelectItem value="__none__" disabled>No categories available</SelectItem>
                ) : (
                  categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-brand">Brand</Label>
            <Input
              id="edit-brand"
              value={formData.brand}
              onChange={(e) => setFormData({...formData, brand: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="edit-model">Model</Label>
            <Input
              id="edit-model"
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-serial">Serial Number</Label>
            <Input
              id="edit-serial"
              value={formData.serialNumber}
              onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="edit-location">Location *</Label>
            <Input
              id="edit-location"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {assetStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-purchaseDate">Purchase Date</Label>
            <Input
              id="edit-purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-warranty">Warranty Expires</Label>
            <Input
              id="edit-warranty"
              type="date"
              value={formData.warrantyExpires}
              onChange={(e) => setFormData({...formData, warrantyExpires: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="edit-price">Purchase Price</Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
            />
          </div>
        </div>

        {/* Asset Images */}
        {asset.images && asset.images.length > 0 && (
          <div>
            <Label className="mb-2 block">Asset Images</Label>
            <MediaViewer 
              files={asset.images} 
              gridCols={3}
              thumbnailSize="sm"
              emptyMessage="No images"
            />
          </div>
        )}

        {/* Manuals & Documents */}
        {asset.manuals && asset.manuals.length > 0 && (
          <div>
            <Label className="mb-2 block">Manuals & Documents</Label>
            <MediaViewer 
              files={asset.manuals} 
              gridCols={3}
              thumbnailSize="sm"
              emptyMessage="No manuals"
            />
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Transfer Form Component
interface TransferFormProps {
  asset: Asset | null
  onTransferred: () => void
  onCancel: () => void
}

function TransferForm({ asset, onTransferred, onCancel }: TransferFormProps) {
  const [reason, setReason] = useState('')
  const [transferLocation, setTransferLocation] = useState('')
  const [transferredTo, setTransferredTo] = useState('')
  const [loading, setLoading] = useState(false)

  const predefinedReasons = [
    'Department reorganization',
    'Location change',
    'Employee transfer',
    'Better utilization',
    'Project requirement',
    'Space optimization',
    'Other'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!asset || !reason.trim() || !transferLocation.trim() || !transferredTo.trim()) {
      toast.error('Please fill in all required fields.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'TRANSFERRED',
          transferredAt: new Date().toISOString(),
          transferReason: reason,
          transferLocation: transferLocation,
          transferredTo: transferredTo,
          location: transferLocation // Update the main location field too
        })
      })

      if (response.ok) {
        toast.success(`Asset "${asset.name}" has been transferred to ${transferredTo}.`)
        onTransferred()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to transfer asset: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to transfer asset:', error)
      toast.error('Failed to transfer asset. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!asset) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm text-gray-600 mb-4">
          You are about to transfer <strong>{asset.name}</strong> ({asset.assetNumber}) 
          from <strong>{asset.location}</strong> to a new location.
        </p>
      </div>

      <div>
        <Label htmlFor="transferReason">Reason for Transfer</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {predefinedReasons.map((reasonOption) => (
              <SelectItem key={reasonOption} value={reasonOption}>
                {reasonOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reason === 'Other' && (
        <div>
          <Label htmlFor="customReason">Custom Reason</Label>
          <Textarea
            id="customReason"
            placeholder="Please specify the reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>
      )}

      <div>
        <Label htmlFor="transferLocation">New Location *</Label>
        <Input
          id="transferLocation"
          placeholder="Building/Floor/Room (e.g., Building A - Floor 2 - Room 205)"
          value={transferLocation}
          onChange={(e) => setTransferLocation(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="transferredTo">Transferred To *</Label>
        <Input
          id="transferredTo"
          placeholder="Person/Department receiving the asset"
          value={transferredTo}
          onChange={(e) => setTransferredTo(e.target.value)}
          required
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !reason.trim() || !transferLocation.trim() || !transferredTo.trim()} className="bg-blue-600 hover:bg-blue-700">
          {loading ? 'Transferring...' : 'Transfer Asset'}
        </Button>
      </div>
    </form>
  )
}

// Category Management Component
function CategoryManager({ categories, onCategoriesChanged }: { categories: AssetCategory[]; onCategoriesChanged: () => void }) {
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6')
  const [loading, setLoading] = useState(false)
  const [seedingIndustry, setSeedingIndustry] = useState('')
  const [showSeedOptions, setShowSeedOptions] = useState(false)

  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#6B7280', '#22C55E', '#F97316'
  ]

  const industryOptions = [
    { value: 'default', label: 'General / Default' },
    { value: 'transport', label: 'Transport & Logistics' },
    { value: 'fuel', label: 'Fuel & Service Stations' },
    { value: 'farming', label: 'Agriculture & Farming' },
    { value: 'garage', label: 'Garage & Auto Services' },
    { value: 'government', label: 'Government & Public Sector' },
  ]

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/asset-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null,
          color: newCategoryColor
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create category')
      }

      toast.success('Category created successfully')
      setNewCategoryName('')
      setNewCategoryDescription('')
      onCategoriesChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create category')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) return

    try {
      const response = await fetch(`/api/asset-categories/${categoryId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete category')
      }

      toast.success('Category deleted')
      onCategoriesChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category')
    }
  }

  const handleSeedCategories = async () => {
    if (!seedingIndustry) {
      toast.error('Please select an industry')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/asset-categories/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: seedingIndustry === 'default' ? null : seedingIndustry
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to seed categories')
      }

      const data = await response.json()
      toast.success(data.message)
      setShowSeedOptions(false)
      onCategoriesChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to seed categories')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing Categories */}
      <div>
        <h3 className="font-medium mb-3">Current Categories ({categories.length})</h3>
        {categories.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">No categories yet</p>
            <Button variant="outline" onClick={() => setShowSeedOptions(true)}>
              Quick Setup with Industry Templates
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => (
              <div 
                key={cat.id} 
                className="flex items-center justify-between p-3 border rounded-lg"
                style={{ borderLeftColor: cat.color || '#6B7280', borderLeftWidth: '4px' }}
              >
                <div>
                  <p className="font-medium">{cat.name}</p>
                  {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
                  {cat._count && <p className="text-xs text-gray-400">{cat._count.assets} assets</p>}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  disabled={cat._count && cat._count.assets > 0}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seed from Industry Template */}
      {showSeedOptions && categories.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <h4 className="font-medium mb-2">Quick Setup</h4>
            <p className="text-sm text-gray-600 mb-3">
              Select your industry to pre-populate categories tailored to your business.
            </p>
            <div className="flex gap-2">
              <Select value={seedingIndustry} onValueChange={setSeedingIndustry}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {industryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSeedCategories} disabled={loading || !seedingIndustry}>
                {loading ? 'Creating...' : 'Create Categories'}
              </Button>
              <Button variant="outline" onClick={() => setShowSeedOptions(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add New Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCategory} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="catName">Category Name *</Label>
                <Input
                  id="catName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Generators"
                  required
                />
              </div>
              <div>
                <Label htmlFor="catDesc">Description</Label>
                <Input
                  id="catDesc"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${newCategoryColor === color ? 'border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading || !newCategoryName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}