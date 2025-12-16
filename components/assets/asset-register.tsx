'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MediaViewer } from '@/components/ui/media-viewer'
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { ScrollableDataGrid } from '@/components/ui/scrollable-data-grid'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
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
  X,
  Eye,
  ChevronRight,
  DollarSign,
  User,
  Clock
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
  // Repair history
  repairHistory?: {
    id: string
    ticketNumber: string
    title: string
    description?: string
    status: string
    type?: string
    priority?: string
    workDescription?: string
    workDescriptionApproved?: boolean
    contractorId?: string
    contractorName?: string
    contractorEmail?: string
    createdAt: string
    completedAt?: string
    invoiceId?: string
    invoiceNumber?: string
    invoiceAmount?: number
    invoiceStatus?: string
  }[]
  // Ticket history (legacy)
  tickets?: {
    id: string
    title: string
    status: string
    createdAt: string
    totalCost?: number
  }[]
  _count?: {
    tickets: number
  }
  totalRepairCost?: number
  totalMaintenanceCost?: number
  totalCost?: number
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

interface Branch {
  id: string
  name: string
  isHeadOffice: boolean
}

interface UserBranch {
  branch: Branch
}

interface AssetRegisterProps {
  tenantId: string
  userRole?: string
}

export function AssetRegister({ tenantId, userRole = 'END_USER' }: AssetRegisterProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [userBranches, setUserBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDecommissionDialog, setShowDecommissionDialog] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [expandedRepairId, setExpandedRepairId] = useState<string | null>(null)
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
    fetchBranches()
    fetchUserBranches()
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

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      const data = await response.json()
      setBranches(data.branches || [])
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  const fetchUserBranches = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const session = await response.json()
      if (session?.user?.id) {
        // Fetch user's assigned branches
        const userResponse = await fetch(`/api/admin/users/${session.user.id}`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          if (userData.user?.branches) {
            setUserBranches(userData.user.branches.map((ub: UserBranch) => ub.branch))
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch user branches:', error)
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

  const getStatusChipColor = (status: string): 'success' | 'warning' | 'error' | 'default' | 'info' => {
    switch (status) {
      case 'ACTIVE': return 'success'
      case 'MAINTENANCE': return 'warning'
      case 'REPAIR_NEEDED': return 'warning'
      case 'OUT_OF_SERVICE': return 'error'
      case 'RETIRED': return 'default'
      case 'DECOMMISSIONED': return 'default'
      case 'TRANSFERRED': return 'info'
      default: return 'default'
    }
  }

  // Check if user is admin
  const isAdmin = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN', 'SUPER_ADMIN'].includes(userRole)

  // State for image hover popup
  const [hoveredImageAsset, setHoveredImageAsset] = useState<Asset | null>(null)
  const [imagePopupPosition, setImagePopupPosition] = useState({ x: 0, y: 0 })

  // DataGrid column definitions
  const assetColumns: GridColDef[] = useMemo(() => [
    {
      field: 'image',
      headerName: 'Photo',
      width: 80,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Asset>) => {
        const images = params.row.images || []
        const firstImage = images.length > 0 ? images[0] : null
        
        if (!firstImage) {
          return (
            <Box 
              sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 1,
                bgcolor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Image className="h-5 w-5 text-gray-400" />
            </Box>
          )
        }
        
        return (
          <Box
            sx={{ 
              position: 'relative',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setImagePopupPosition({ 
                x: rect.right + 10, 
                y: rect.top 
              })
              setHoveredImageAsset(params.row)
            }}
            onMouseLeave={() => setHoveredImageAsset(null)}
          >
            <img
              src={firstImage}
              alt={params.row.name}
              style={{
                width: 48,
                height: 48,
                objectFit: 'cover',
                borderRadius: 4,
                border: '1px solid #e5e7eb'
              }}
            />
            {images.length > 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  fontSize: '0.6rem',
                  px: 0.5,
                  borderRadius: 0.5,
                  fontWeight: 600
                }}
              >
                +{images.length - 1}
              </Box>
            )}
          </Box>
        )
      },
    },
    {
      field: 'name',
      headerName: 'Asset',
      flex: 1.2,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Asset>) => (
        <Box sx={{ textAlign: 'center' }}>
          <p className="font-medium text-gray-900 text-sm truncate">{params.row.name}</p>
          {params.row.brand && (
            <p className="text-xs text-gray-500 truncate">{params.row.brand} {params.row.model}</p>
          )}
        </Box>
      ),
    },
    {
      field: 'category',
      headerName: 'Category',
      flex: 0.7,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Asset>) => (
        <Chip
          label={params.row.category?.name || 'Uncategorized'}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 500, fontSize: '0.7rem' }}
        />
      ),
    },
    {
      field: 'serialLocation',
      headerName: 'Serial / Location',
      flex: 0.9,
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Asset>) => (
        <Box sx={{ textAlign: 'center' }}>
          <p className="text-xs font-mono text-gray-700">{params.row.serialNumber || '-'}</p>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500 truncate">{params.row.location}</span>
          </Box>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.6,
      minWidth: 90,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Asset>) => (
        <Chip
          label={params.row.status.replace('_', ' ')}
          size="small"
          color={getStatusChipColor(params.row.status)}
          sx={{ fontWeight: 500, fontSize: '0.7rem' }}
        />
      ),
    },
    {
      field: 'assetHistory',
      headerName: 'History',
      flex: 0.6,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Asset>) => {
        const ticketCount = params.row._count?.tickets || params.row.tickets?.length || 0
        const tickets = params.row.tickets || []
        
        // Build tooltip content based on user role
        const tooltipContent = isAdmin ? (
          <Box sx={{ p: 1, maxWidth: 350 }}>
            <p className="font-medium mb-2">Ticket History ({ticketCount})</p>
            {tickets.length > 0 ? (
              <>
                {tickets.slice(0, 5).map((ticket, idx) => (
                  <Box key={idx} sx={{ mb: 1, borderBottom: idx < Math.min(tickets.length, 5) - 1 ? '1px solid #444' : 'none', pb: 0.5 }}>
                    <p className="text-sm">{ticket.title}</p>
                    <p className="text-xs text-gray-400">
                      {ticket.status} • {new Date(ticket.createdAt).toLocaleDateString()}
                      {ticket.totalCost ? ` • $${ticket.totalCost}` : ''}
                    </p>
                  </Box>
                ))}
                {tickets.length > 5 && (
                  <p className="text-xs text-gray-400">+{tickets.length - 5} more tickets...</p>
                )}
                {params.row.totalRepairCost && params.row.totalRepairCost > 0 && (
                  <p className="text-sm font-medium mt-2 pt-1 border-t border-gray-600">
                    Total Cost: ${params.row.totalRepairCost.toFixed(2)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">No tickets raised</p>
            )}
          </Box>
        ) : (
          <Box sx={{ p: 1, maxWidth: 300 }}>
            <p className="font-medium mb-2">Tickets ({ticketCount})</p>
            {tickets.length > 0 ? (
              tickets.slice(0, 5).map((ticket, idx) => (
                <p key={idx} className="text-sm mb-1">• {ticket.title}</p>
              ))
            ) : (
              <p className="text-sm text-gray-400">No tickets raised</p>
            )}
            {tickets.length > 5 && (
              <p className="text-xs text-gray-400">+{tickets.length - 5} more...</p>
            )}
          </Box>
        )
        
        return (
          <Tooltip 
            title={tooltipContent}
            arrow
            placement="top"
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: 'grey.900',
                  '& .MuiTooltip-arrow': { color: 'grey.900' },
                  maxWidth: 350,
                },
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'pointer' }}>
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">{ticketCount} tickets</span>
            </Box>
          </Tooltip>
        )
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 140,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Asset>) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View History">
            <IconButton
              size="small"
              sx={{ color: 'info.main' }}
              onClick={() => {
                setSelectedAsset(params.row)
                setExpandedRepairId(null)
                setShowHistoryDialog(true)
              }}
            >
              <FileText className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedAsset(params.row)
                setShowEditDialog(true)
              }}
            >
              <Edit className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Decommission">
            <IconButton
              size="small"
              sx={{ color: 'warning.main' }}
              onClick={() => {
                setSelectedAsset(params.row)
                setShowDecommissionDialog(true)
              }}
            >
              <Archive className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Transfer">
            <IconButton
              size="small"
              sx={{ color: 'primary.main' }}
              onClick={() => {
                setSelectedAsset(params.row)
                setShowTransferDialog(true)
              }}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [isAdmin])

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
    <div className="bg-gray-50 p-5">
      <div className="space-y-5">
        {/* User Branch Banner */}
        {userBranches.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-blue-600" />
            <div>
              <span className="text-sm text-blue-800">
                <span className="font-medium">Your Branch{userBranches.length > 1 ? 'es' : ''}:</span>{' '}
                {userBranches.map(b => b.name + (b.isHeadOffice ? ' (HQ)' : '')).join(', ')}
              </span>
            </div>
          </div>
        )}

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
                branches={branches}
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

              {isAdmin && (
                <Button variant="outline" onClick={() => setShowCategoryDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Categories
                </Button>
              )}
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
              <Box sx={{ width: '100%' }}>
                <ScrollableDataGrid
                  rows={filteredAssets}
                  columns={assetColumns}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 10 },
                    },
                  }}
                  pageSizeOptions={[10, 25, 50]}
                  disableRowSelectionOnClick
                  autoHeight
                  getRowHeight={() => 'auto'}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell': {
                      display: 'flex',
                      alignItems: 'center',
                      py: 1,
                    },
                  }}
                />
              </Box>
            )}

            {/* Image Hover Popup */}
            {hoveredImageAsset && hoveredImageAsset.images && hoveredImageAsset.images.length > 0 && (
              <div
                className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-2 pointer-events-none"
                style={{
                  left: Math.min(imagePopupPosition.x, window.innerWidth - 340),
                  top: Math.max(10, Math.min(imagePopupPosition.y - 100, window.innerHeight - 350)),
                }}
              >
                <div className="space-y-2">
                  <img
                    src={hoveredImageAsset.images[0]}
                    alt={hoveredImageAsset.name}
                    className="w-80 h-60 object-cover rounded-md"
                  />
                  <div className="px-1">
                    <p className="font-semibold text-sm text-gray-900">{hoveredImageAsset.name}</p>
                    <p className="text-xs text-gray-500">{hoveredImageAsset.assetNumber}</p>
                    {hoveredImageAsset.images.length > 1 && (
                      <p className="text-xs text-blue-600 mt-1">
                        {hoveredImageAsset.images.length} photos available
                      </p>
                    )}
                  </div>
                </div>
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
                branches={branches}
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

        {/* Repair History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Repair History: {selectedAsset?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedAsset && (
              <div className="space-y-4">
                {/* Asset Summary */}
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Asset Number</p>
                      <p className="font-medium">{selectedAsset.assetNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Category</p>
                      <p className="font-medium">{selectedAsset.category?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <Badge variant={selectedAsset.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {selectedAsset.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-medium">{selectedAsset.location}</p>
                    </div>
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cost Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-blue-700">Purchase Price</p>
                      <p className="font-bold text-blue-900">
                        ${selectedAsset.purchasePrice?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">Repair Costs</p>
                      <p className="font-bold text-blue-900">
                        ${selectedAsset.totalRepairCost?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">Maintenance Costs</p>
                      <p className="font-bold text-blue-900">
                        ${selectedAsset.totalMaintenanceCost?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="bg-blue-100 rounded p-2 -m-1">
                      <p className="text-xs text-blue-700">Total Cost</p>
                      <p className="font-bold text-lg text-blue-900">
                        ${selectedAsset.totalCost?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Repair History List */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Repair Tickets ({selectedAsset.repairHistory?.length || 0})
                  </h4>
                  
                  {!selectedAsset.repairHistory || selectedAsset.repairHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                      <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No repair history found for this asset</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedAsset.repairHistory.map((repair, idx) => (
                        <div 
                          key={repair.id || idx} 
                          className="bg-white rounded-lg border overflow-hidden"
                        >
                          {/* Clickable Header */}
                          <div 
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedRepairId(expandedRepairId === repair.id ? null : repair.id)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${expandedRepairId === repair.id ? 'rotate-90' : ''}`} />
                                <span className="font-mono text-xs text-blue-600 font-medium">#{repair.ticketNumber}</span>
                                <span className="font-medium text-gray-800">{repair.title}</span>
                              </div>
                              <div className="flex items-center gap-3 ml-6 mt-1 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(repair.createdAt).toLocaleDateString()}
                                  {repair.completedAt && ` → ${new Date(repair.completedAt).toLocaleDateString()}`}
                                </span>
                                {repair.contractorName && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {repair.contractorName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {repair.invoiceAmount && (
                                <span className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                                  ${repair.invoiceAmount.toLocaleString()}
                                </span>
                              )}
                              <Badge variant={
                                repair.status === 'COMPLETED' || repair.status === 'CLOSED' 
                                  ? 'default'
                                  : repair.status === 'IN_PROGRESS' 
                                  ? 'secondary'
                                  : 'outline'
                              }>
                                {repair.status?.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Expanded Details */}
                          {expandedRepairId === repair.id && (
                            <div className="px-4 pb-4 pt-2 bg-gray-50 border-t space-y-3">
                              {/* Basic Info Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Type</p>
                                  <p className="text-gray-900">{repair.type?.replace('_', ' ') || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Priority</p>
                                  <Badge variant={
                                    repair.priority === 'CRITICAL' ? 'destructive' :
                                    repair.priority === 'HIGH' ? 'destructive' :
                                    repair.priority === 'MEDIUM' ? 'secondary' :
                                    'outline'
                                  }>
                                    {repair.priority || 'N/A'}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Contractor</p>
                                  <p className="text-gray-900">{repair.contractorName || 'Unassigned'}</p>
                                  {repair.contractorEmail && (
                                    <p className="text-xs text-gray-500">{repair.contractorEmail}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Invoice</p>
                                  {repair.invoiceNumber ? (
                                    <div>
                                      <p className="text-gray-900 font-mono text-xs">{repair.invoiceNumber}</p>
                                      <p className="text-sm font-semibold text-green-700">
                                        ${repair.invoiceAmount?.toLocaleString() || '0'}
                                        <span className={`ml-1 text-xs font-normal ${
                                          repair.invoiceStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'
                                        }`}>
                                          ({repair.invoiceStatus})
                                        </span>
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-gray-400">No invoice</p>
                                  )}
                                </div>
                              </div>

                              {/* Original Issue Description */}
                              {repair.description && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Original Issue</p>
                                  <p className="text-sm text-gray-700 bg-white p-2 rounded border">{repair.description}</p>
                                </div>
                              )}
                              
                              {/* Approved Work Description */}
                              {repair.workDescription && repair.workDescriptionApproved && (
                                <div>
                                  <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Approved Work Description
                                  </p>
                                  <p className="text-sm text-gray-700 bg-green-50 p-2 rounded border border-green-200 whitespace-pre-wrap">{repair.workDescription}</p>
                                </div>
                              )}
                              
                              {/* Timeline */}
                              <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
                                <span>Created: {new Date(repair.createdAt).toLocaleString()}</span>
                                {repair.completedAt && (
                                  <span>Completed: {new Date(repair.completedAt).toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function AssetForm({ onAssetCreated, tenantId, onCancel, categories, branches, onOpenCategoryManager }: { onAssetCreated: () => void; tenantId: string; onCancel: () => void; categories: AssetCategory[]; branches: Branch[]; onOpenCategoryManager?: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'ACTIVE',
    location: branches.length > 0 ? branches[0].name : '',
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

      // Upload images first if any
      let imageUrls: string[] = []
      if (images.length > 0) {
        const imageFormData = new FormData()
        images.forEach(file => imageFormData.append('files', file))
        
        const uploadResponse = await fetch('/api/upload/asset', {
          method: 'POST',
          body: imageFormData
        })
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          imageUrls = uploadResult.urls || []
        } else {
          toast.error('Failed to upload images. Asset will be created without images.')
        }
      }

      const assetData = {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        specifications: specifications,
        images: imageUrls,
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
            <Label htmlFor="location">Branch / Site *</Label>
            <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch/site" />
              </SelectTrigger>
              <SelectContent>
                {branches.length === 0 ? (
                  <SelectItem value="__none__" disabled>No branches available</SelectItem>
                ) : (
                  branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.name}>
                      {branch.name} {branch.isHeadOffice ? '(Head Office)' : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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

        <div className="border rounded-lg p-4 space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Image className="h-4 w-4" />
            Asset Images
          </Label>
          <Input
            id="images"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setImages(Array.from(e.target.files || []))}
          />
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {images.map((file, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-20 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">
            {images.length > 0 ? `${images.length} image(s) selected` : 'Select images to upload with the asset'}
          </p>
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
  branches: Branch[]
  onAssetUpdated: () => void
  onCancel: () => void
}

function EditAssetForm({ asset, categories, branches, onAssetUpdated, onCancel }: EditAssetFormProps) {
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
  const [existingImages, setExistingImages] = useState<string[]>(asset.images || [])
  const [newImages, setNewImages] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const handleRemoveExistingImage = (indexToRemove: number) => {
    setExistingImages(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleAddImages = async () => {
    if (newImages.length === 0) return

    setUploadingImages(true)
    try {
      const imageFormData = new FormData()
      newImages.forEach(file => imageFormData.append('files', file))
      imageFormData.append('assetId', asset.id)
      
      const uploadResponse = await fetch('/api/upload/asset', {
        method: 'POST',
        body: imageFormData
      })
      
      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json()
        setExistingImages(prev => [...prev, ...(uploadResult.urls || [])])
        setNewImages([])
        toast.success('Images uploaded successfully!')
      } else {
        toast.error('Failed to upload images')
      }
    } catch (error) {
      console.error('Failed to upload images:', error)
      toast.error('Failed to upload images')
    } finally {
      setUploadingImages(false)
    }
  }

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
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        images: existingImages
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
            <Label htmlFor="edit-location">Branch / Site *</Label>
            <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch/site" />
              </SelectTrigger>
              <SelectContent>
                {branches.length === 0 ? (
                  <SelectItem value="__none__" disabled>No branches available</SelectItem>
                ) : (
                  branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.name}>
                      {branch.name} {branch.isHeadOffice ? '(Head Office)' : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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

        {/* Asset Images Section */}
        <div className="border rounded-lg p-4 space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Image className="h-4 w-4" />
            Asset Images
          </Label>
          
          {/* Existing Images */}
          {existingImages.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {existingImages.map((imageUrl, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Asset image ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No images uploaded</p>
          )}

          {/* Add New Images */}
          <div className="pt-2 border-t">
            <Label htmlFor="new-images" className="text-sm mb-2 block">Add New Images</Label>
            <div className="flex gap-2">
              <Input
                id="new-images"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setNewImages(Array.from(e.target.files || []))}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddImages}
                disabled={newImages.length === 0 || uploadingImages}
              >
                {uploadingImages ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            {newImages.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{newImages.length} file(s) selected</p>
            )}
          </div>
        </div>

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