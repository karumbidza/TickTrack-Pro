'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Layers,
  MapPin,
  Building2,
  Tag,
  Users,
  Bell,
  Plus,
  Edit,
  Trash2,
  Save,
  Package,
  Wrench
} from 'lucide-react'
import { toast } from 'sonner'
import { UserManagement } from './user-management'
import { ContractorManagement } from './contractor-management'
import { AdminAssetManagement } from './asset-management'

interface User {
  id: string
  email: string
  name?: string | null
  role: string
  tenantId: string | null
}

interface AssetCategory {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  isActive: boolean
  isDefault: boolean
  sortOrder: number
  _count?: { assets: number }
}

interface Branch {
  id: string
  name: string
  address?: string
  type: string
  isHeadOffice: boolean
  isActive: boolean
  sortOrder: number
}

interface TicketType {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  isActive: boolean
  requiresAsset: boolean
  sortOrder: number
}

interface PriorityLevel {
  id: string
  name: string
  color: string
  slaHours: number
  sortOrder: number
}

interface AdminSettingsProps {
  user: User
}

export function AdminSettings({ user }: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState('assets')
  const [loading, setLoading] = useState(false)

  // Asset Categories State
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  })

  // Branches State
  const [branches, setBranches] = useState<Branch[]>([])
  const [showBranchDialog, setShowBranchDialog] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    type: 'BRANCH',
    isHeadOffice: false
  })

  // Ticket Types State
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { id: '1', name: 'IT Support', description: 'Technical issues and IT requests', icon: '', color: '#3B82F6', isActive: true, requiresAsset: false, sortOrder: 1 },
    { id: '2', name: 'Maintenance', description: 'Equipment and facility maintenance', icon: '', color: '#10B981', isActive: true, requiresAsset: true, sortOrder: 2 },
    { id: '3', name: 'Facility', description: 'Building and facility issues', icon: '', color: '#8B5CF6', isActive: true, requiresAsset: false, sortOrder: 3 },
    { id: '4', name: 'Security', description: 'Security-related concerns', icon: '', color: '#EF4444', isActive: true, requiresAsset: false, sortOrder: 4 },
    { id: '5', name: 'Other', description: 'Other requests', icon: '', color: '#6B7280', isActive: true, requiresAsset: false, sortOrder: 5 }
  ])
  const [showTicketTypeDialog, setShowTicketTypeDialog] = useState(false)
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(null)
  const [ticketTypeForm, setTicketTypeForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    requiresAsset: false
  })

  // Load data on mount
  useEffect(() => {
    fetchCategories()
    fetchBranches()
  }, [])

  // ==================== ASSET CATEGORIES ====================
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/asset-categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required')
      return
    }

    setLoading(true)
    try {
      const url = editingCategory 
        ? `/api/asset-categories/${editingCategory.id}`
        : '/api/asset-categories'
      
      const res = await fetch(url, {
        method: editingCategory ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      })

      if (res.ok) {
        toast.success(editingCategory ? 'Category updated' : 'Category created')
        fetchCategories()
        setShowCategoryDialog(false)
        resetCategoryForm()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save category')
      }
    } catch (error) {
      toast.error('Failed to save category')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (category: AssetCategory) => {
    if (category._count?.assets && category._count.assets > 0) {
      toast.error(`Cannot delete category with ${category._count.assets} assets`)
      return
    }

    if (!confirm(`Delete category "${category.name}"?`)) return

    try {
      const res = await fetch(`/api/asset-categories/${category.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Category deleted')
        fetchCategories()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete category')
      }
    } catch (error) {
      toast.error('Failed to delete category')
    }
  }

  const resetCategoryForm = () => {
    setEditingCategory(null)
    setCategoryForm({ name: '', description: '', color: '#3B82F6' })
  }

  const openEditCategory = (category: AssetCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6'
    })
    setShowCategoryDialog(true)
  }

  // ==================== BRANCHES ====================
  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches')
      if (res.ok) {
        const data = await res.json()
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  const handleSaveBranch = async () => {
    if (!branchForm.name.trim()) {
      toast.error('Branch name is required')
      return
    }

    setLoading(true)
    try {
      const url = editingBranch 
        ? `/api/branches/${editingBranch.id}`
        : '/api/branches'
      
      const res = await fetch(url, {
        method: editingBranch ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchForm)
      })

      if (res.ok) {
        toast.success(editingBranch ? 'Branch updated' : 'Branch created')
        fetchBranches()
        setShowBranchDialog(false)
        resetBranchForm()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save branch')
      }
    } catch (error) {
      toast.error('Failed to save branch')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBranch = async (branch: Branch) => {
    if (!confirm(`Delete branch "${branch.name}"?`)) return

    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Branch deleted')
        fetchBranches()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete branch')
      }
    } catch (error) {
      toast.error('Failed to delete branch')
    }
  }

  const resetBranchForm = () => {
    setEditingBranch(null)
    setBranchForm({ name: '', address: '', type: 'BRANCH', isHeadOffice: false })
  }

  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch)
    setBranchForm({
      name: branch.name,
      address: branch.address || '',
      type: branch.type,
      isHeadOffice: branch.isHeadOffice
    })
    setShowBranchDialog(true)
  }

  const branchTypes = [
    { value: 'HEAD_OFFICE', label: 'Head Office' },
    { value: 'BRANCH', label: 'Branch' },
    { value: 'SITE', label: 'Site' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'DEPOT', label: 'Depot' },
    { value: 'OTHER', label: 'Other' }
  ]

  // ==================== TICKET TYPES ====================
  const handleSaveTicketType = () => {
    if (!ticketTypeForm.name.trim()) {
      toast.error('Ticket type name is required')
      return
    }

    if (editingTicketType) {
      // Update existing
      setTicketTypes(prev => prev.map(t => 
        t.id === editingTicketType.id 
          ? { ...t, name: ticketTypeForm.name, description: ticketTypeForm.description, color: ticketTypeForm.color, requiresAsset: ticketTypeForm.requiresAsset }
          : t
      ))
      toast.success('Ticket type updated')
    } else {
      // Create new
      const newType: TicketType = {
        id: Date.now().toString(),
        name: ticketTypeForm.name,
        description: ticketTypeForm.description,
        icon: '',
        color: ticketTypeForm.color,
        isActive: true,
        requiresAsset: ticketTypeForm.requiresAsset,
        sortOrder: ticketTypes.length + 1
      }
      setTicketTypes(prev => [...prev, newType])
      toast.success('Ticket type created')
    }
    
    setShowTicketTypeDialog(false)
    resetTicketTypeForm()
  }

  const handleDeleteTicketType = (ticketType: TicketType) => {
    if (!confirm(`Delete ticket type "${ticketType.name}"?`)) return
    setTicketTypes(prev => prev.filter(t => t.id !== ticketType.id))
    toast.success('Ticket type deleted')
  }

  const resetTicketTypeForm = () => {
    setEditingTicketType(null)
    setTicketTypeForm({ name: '', description: '', color: '#3B82F6', requiresAsset: false })
  }

  const openEditTicketType = (ticketType: TicketType) => {
    setEditingTicketType(ticketType)
    setTicketTypeForm({
      name: ticketType.name,
      description: ticketType.description || '',
      color: ticketType.color || '#3B82F6',
      requiresAsset: ticketType.requiresAsset
    })
    setShowTicketTypeDialog(true)
  }

  const ticketTypeColors = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EF4444', label: 'Red' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#6B7280', label: 'Gray' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your organization's settings and resources</p>
        </div>

        {/* Settings Layout - Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-48 flex-shrink-0">
            <Card className="sticky top-24">
              <CardHeader className="pb-2 px-3">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Menu
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <nav className="space-y-0.5">
                  <button
                    onClick={() => setActiveTab('assets')}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
                      activeTab === 'assets' 
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Package className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Assets</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('contractors')}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
                      activeTab === 'contractors' 
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Wrench className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Contractors</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
                      activeTab === 'users' 
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Users</span>
                  </button>
                  
                  <div className="pt-2 pb-1">
                    <p className="px-2.5 text-xs font-medium text-gray-400 uppercase">Config</p>
                  </div>
                  
                  <button
                    onClick={() => setActiveTab('categories')}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
                      activeTab === 'categories' 
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Layers className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Categories</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('branches')}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
                      activeTab === 'branches' 
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Branches</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('tickets')}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
                      activeTab === 'tickets' 
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Tag className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Ticket Types</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
                      activeTab === 'notifications' 
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Bell className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Notifications</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('organization')}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
                      activeTab === 'organization' 
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Organization</span>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Assets Tab */}
            {activeTab === 'assets' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <AdminAssetManagement />
              </div>
            )}

            {/* Contractors Tab */}
            {activeTab === 'contractors' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <ContractorManagement user={user} />
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <UserManagement user={user} />
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
            <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Asset Categories</CardTitle>
                    <CardDescription>
                      Define categories to organize your assets.
                    </CardDescription>
                  </div>
                  <Button onClick={() => { resetCategoryForm(); setShowCategoryDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Categories List */}
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Layers className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No categories yet. Click "Add Category" to create one.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: category.color || '#3B82F6' }}
                          >
                            {category.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{category.name}</div>
                            {category.description && (
                              <div className="text-sm text-gray-500">{category.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary">
                            {category._count?.assets || 0} assets
                          </Badge>
                          {category.isDefault && (
                            <Badge variant="outline">Default</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(category)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Dialog */}
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Category' : 'Add Category'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cat-name">Name *</Label>
                    <Input
                      id="cat-name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="e.g., Vehicles, Equipment"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cat-desc">Description</Label>
                    <Textarea
                      id="cat-desc"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cat-color">Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="cat-color"
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        className="w-14 h-10 p-1"
                      />
                      <Input
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveCategory} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          )}

          {/* ==================== BRANCHES TAB ==================== */}
          {activeTab === 'branches' && (
            <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Branches</CardTitle>
                    <CardDescription>
                      Manage your organization's branches, sites, and locations where users operate.
                    </CardDescription>
                  </div>
                  <Button onClick={() => { resetBranchForm(); setShowBranchDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Branch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {branches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No branches defined yet. Add your first branch.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            branch.isHeadOffice ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            <MapPin className={`h-5 w-5 ${
                              branch.isHeadOffice ? 'text-blue-600' : 'text-green-600'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-gray-900">{branch.name}</div>
                              {branch.isHeadOffice && (
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">HQ</Badge>
                              )}
                            </div>
                            {branch.address && (
                              <div className="text-sm text-gray-500">{branch.address}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="text-xs">{branch.type.replace('_', ' ')}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditBranch(branch)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBranch(branch)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Branch Dialog */}
            <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBranch ? 'Edit Branch' : 'Add Branch'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="branch-name">Name *</Label>
                    <Input
                      id="branch-name"
                      value={branchForm.name}
                      onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                      placeholder="e.g., Head Office, Branch A, Site 1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch-address">Address</Label>
                    <Textarea
                      id="branch-address"
                      value={branchForm.address}
                      onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                      placeholder="Optional physical address"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Switch
                      checked={branchForm.isHeadOffice}
                      onCheckedChange={(checked) => setBranchForm({ ...branchForm, isHeadOffice: checked, type: checked ? 'HEAD_OFFICE' : 'BRANCH' })}
                    />
                    <div className="flex-1">
                      <Label className="font-medium text-gray-900">Head Office</Label>
                      <p className="text-xs text-gray-600">Users assigned to HQ have access to all branches</p>
                    </div>
                  </div>
                  {!branchForm.isHeadOffice && (
                    <div>
                      <Label htmlFor="branch-type">Type</Label>
                      <Select
                        value={branchForm.type}
                        onValueChange={(value) => setBranchForm({ ...branchForm, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {branchTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBranchDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveBranch} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          )}

          {/* ==================== TICKET TYPES TAB ==================== */}
          {activeTab === 'tickets' && (
            <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Ticket Types</CardTitle>
                    <CardDescription className="text-sm">
                      Configure the types of tickets users can create.
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      resetTicketTypeForm()
                      setShowTicketTypeDialog(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ticketTypes.map((type) => (
                    <div 
                      key={type.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: type.color }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{type.name}</div>
                          {type.description && (
                            <div className="text-xs text-gray-500">{type.description}</div>
                          )}
                        </div>
                        {type.requiresAsset && (
                          <Badge variant="secondary" className="text-xs">Requires Asset</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditTicketType(type)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTicketType(type)}
                          className="h-8 w-8 p-0 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {ticketTypes.length === 0 && (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No ticket types configured. Click "Add Type" to create one.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Priority Levels Card */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Priority Levels</CardTitle>
                <CardDescription className="text-sm">
                  System-defined priority levels for tickets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { name: 'Low', color: 'bg-green-100 text-green-700 border-green-200' },
                    { name: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                    { name: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                    { name: 'Critical', color: 'bg-red-100 text-red-700 border-red-200' }
                  ].map((priority) => (
                    <div key={priority.name} className={`px-3 py-2 rounded-md border text-sm font-medium ${priority.color}`}>
                      {priority.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ticket Type Dialog */}
            <Dialog open={showTicketTypeDialog} onOpenChange={setShowTicketTypeDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTicketType ? 'Edit Ticket Type' : 'Add Ticket Type'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="tt-name">Name</Label>
                    <Input
                      id="tt-name"
                      value={ticketTypeForm.name}
                      onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, name: e.target.value })}
                      placeholder="e.g., IT Support"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tt-desc">Description</Label>
                    <Textarea
                      id="tt-desc"
                      value={ticketTypeForm.description}
                      onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, description: e.target.value })}
                      placeholder="Brief description of this ticket type"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2 mt-2">
                      {ticketTypeColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setTicketTypeForm({ ...ticketTypeForm, color: color.value })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            ticketTypeForm.color === color.value 
                              ? 'border-gray-900 scale-110' 
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={ticketTypeForm.requiresAsset}
                      onCheckedChange={(checked) => setTicketTypeForm({ ...ticketTypeForm, requiresAsset: checked })}
                    />
                    <Label className="font-normal">Require asset selection when creating ticket</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowTicketTypeDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTicketType}>
                    {editingTicketType ? 'Save Changes' : 'Add Type'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
            )}

          {/* ==================== NOTIFICATIONS TAB ==================== */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure how and when notifications are sent to users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-sm text-gray-500">Send email alerts for ticket updates</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">New Ticket Alerts</div>
                      <div className="text-sm text-gray-500">Notify admins when new tickets are created</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">Assignment Notifications</div>
                      <div className="text-sm text-gray-500">Notify contractors when assigned to tickets</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">Completion Alerts</div>
                      <div className="text-sm text-gray-500">Notify users when their tickets are completed</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">SLA Breach Warnings</div>
                      <div className="text-sm text-gray-500">Alert when tickets are approaching SLA deadlines</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button disabled>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    Note: Full notification configuration coming soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ==================== ORGANIZATION TAB ==================== */}
          {activeTab === 'organization' && (
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  General settings for your organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input id="org-name" placeholder="Your Company Name" disabled />
                  </div>
                  <div>
                    <Label htmlFor="org-domain">Domain</Label>
                    <Input id="org-domain" placeholder="yourcompany.com" disabled />
                  </div>
                  <div>
                    <Label htmlFor="org-timezone">Timezone</Label>
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="africa/harare">Africa/Harare (CAT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="org-currency">Currency</Label>
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="zwl">ZWL ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button disabled>
                    <Save className="h-4 w-4 mr-2" />
                    Save Organization Settings
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    Note: Organization settings are managed by Super Admin.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
