'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
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
  Wrench,
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CreditCard
} from 'lucide-react'
import { toast } from 'sonner'
import { Card as DsCard, MonoLabel, Badge as DsBadge, Toggle as DsToggle } from '@/components/admin/kit'
import { UserManagement } from './user-management'
import { ContractorManagement } from './contractor-management'
import { AdminAssetManagement } from './asset-management'
import { BillingManagement } from './billing-management'
import { ReportsHub } from './reports-hub'

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
  section?: string
}

const SECTION_META: Record<string, { title: string; subtitle: string; cta?: string }> = {
  categories:    { title: 'Categories',    subtitle: "Organise your assets into categories", cta: '+ Add Category' },
  branches:      { title: 'Branches',      subtitle: "Manage your organisation's branches", cta: '+ Add Branch' },
  'ticket-types':{ title: 'Ticket Types',  subtitle: 'Configure custom ticket types', cta: '+ Add Type' },
  notifications: { title: 'Notifications', subtitle: 'Configure notification preferences' },
  reports:       { title: 'Reports',       subtitle: 'Generate and export reports' },
  organisation:  { title: 'Organisation',  subtitle: 'General organisation settings' },
  billing:       { title: 'Billing',       subtitle: 'Manage your subscription and billing' },
}

export function AdminSettings({ user, section = 'categories' }: AdminSettingsProps) {
  // Map route section slug to internal tab name
  const tabMap: Record<string, string> = {
    categories: 'categories',
    branches: 'branches',
    'ticket-types': 'tickets',
    notifications: 'notifications',
    reports: 'reports',
    organisation: 'organization',
    billing: 'billing',
  }
  const activeTab = tabMap[section] || 'categories'
  const [loading, setLoading] = useState(false)

  // Notification preferences (client-side; persistence coming soon)
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    newTicket: true,
    slaBreach: true,
    invoiceSubmitted: true,
    sms: false,
  })

  // Reports State
  const [reportLoading, setReportLoading] = useState(false)
  const [reportDateFrom, setReportDateFrom] = useState('')
  const [reportDateTo, setReportDateTo] = useState('')
  const [reportStatus, setReportStatus] = useState('all')
  const [reportColumns, setReportColumns] = useState<Record<string, boolean>>({
    ticketNumber: true,
    title: true,
    description: true,
    siteBranch: true,
    requesterName: true,
    requesterEmail: true,
    requesterPhone: true,
    dateCreated: true,
    dateClosed: true,
    timeToClose: true,
    slaStatus: true,
    contractor: true,
    category: true,
    type: true,
    assetName: true,
    assetNumber: true,
    repairCost: true,
    invoiceNumber: true,
    priority: true,
    status: true
  })

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

  // ==================== REPORTS ====================
  const handleDownloadTicketReport = async () => {
    setReportLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      if (reportDateFrom) params.append('dateFrom', reportDateFrom)
      if (reportDateTo) params.append('dateTo', reportDateTo)
      if (reportStatus && reportStatus !== 'all') params.append('status', reportStatus)
      
      const res = await fetch(`/api/admin/reports/tickets?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to generate report')
        return
      }

      const tickets = await res.json()

      // Define all available columns with their data extractors
      const columnConfig: { key: string; header: string; getValue: (ticket: any) => string }[] = [
        { key: 'ticketNumber', header: 'Ticket Number', getValue: (t) => t.ticketNumber || '' },
        { key: 'title', header: 'Title', getValue: (t) => t.title || '' },
        { key: 'description', header: 'Description', getValue: (t) => t.description || '' },
        { key: 'siteBranch', header: 'Site/Branch', getValue: (t) => t.location || '' },
        { key: 'requesterName', header: 'Requester Name', getValue: (t) => t.user?.name || '' },
        { key: 'requesterEmail', header: 'Requester Email', getValue: (t) => t.user?.email || '' },
        { key: 'requesterPhone', header: 'Requester Phone', getValue: (t) => t.user?.phone || '' },
        { key: 'dateCreated', header: 'Date Created', getValue: (t) => t.createdAt ? new Date(t.createdAt).toLocaleString() : '' },
        { key: 'dateClosed', header: 'Date Closed', getValue: (t) => t.completedAt ? new Date(t.completedAt).toLocaleString() : '' },
        { key: 'timeToClose', header: 'Time to Close (Hours)', getValue: (t) => {
          if (t.completedAt && t.createdAt) {
            const hours = Math.round((new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60) * 100) / 100
            return hours.toString()
          }
          return ''
        }},
        { key: 'slaStatus', header: 'SLA Status', getValue: (t) => {
          if (!t.resolutionDeadline) return 'N/A'
          if (t.completedAt) {
            return new Date(t.completedAt) <= new Date(t.resolutionDeadline) ? 'Met' : 'Breached'
          }
          return new Date() > new Date(t.resolutionDeadline) ? 'Breached' : 'Pending'
        }},
        { key: 'contractor', header: 'Contractor', getValue: (t) => t.contractor?.name || '' },
        { key: 'category', header: 'Category', getValue: (t) => t.category?.name || '' },
        { key: 'type', header: 'Type', getValue: (t) => t.type?.replace(/_/g, ' ') || '' },
        { key: 'assetName', header: 'Asset Name', getValue: (t) => t.asset?.name || '' },
        { key: 'assetNumber', header: 'Asset Number', getValue: (t) => t.asset?.assetNumber || '' },
        { key: 'repairCost', header: 'Repair Cost', getValue: (t) => t.repairCost ? `$${t.repairCost.toFixed(2)}` : '' },
        { key: 'invoiceNumber', header: 'Invoice Number', getValue: (t) => t.invoiceNumber || '' },
        { key: 'priority', header: 'Priority', getValue: (t) => t.priority || '' },
        { key: 'status', header: 'Status', getValue: (t) => t.status || '' }
      ]

      // Filter to only selected columns
      const selectedColumns = columnConfig.filter(col => reportColumns[col.key])
      
      if (selectedColumns.length === 0) {
        toast.error('Please select at least one column for the report')
        return
      }

      // Generate CSV content with selected columns only
      const headers = selectedColumns.map(col => col.header)
      const rows = tickets.map((ticket: any) => selectedColumns.map(col => col.getValue(ticket)))

      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }

      const csvContent = [
        headers.join(','),
        ...rows.map((row: string[]) => row.map(escapeCSV).join(','))
      ].join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const filename = `tickets-report-${new Date().toISOString().split('T')[0]}.csv`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Report downloaded: ${tickets.length} tickets`)
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error('Failed to generate report')
    } finally {
      setReportLoading(false)
    }
  }

  const handleQuickExport = (type: 'this-month' | 'last-month' | 'closed-only') => {
    const now = new Date()
    
    if (type === 'this-month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      setReportDateFrom(firstDay.toISOString().split('T')[0])
      setReportDateTo(now.toISOString().split('T')[0])
      setReportStatus('all')
    } else if (type === 'last-month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
      setReportDateFrom(firstDay.toISOString().split('T')[0])
      setReportDateTo(lastDay.toISOString().split('T')[0])
      setReportStatus('all')
    } else if (type === 'closed-only') {
      setReportStatus('CLOSED')
    }
    
    // Trigger download after state update
    setTimeout(() => handleDownloadTicketReport(), 100)
  }

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

  const meta = SECTION_META[section] || SECTION_META['categories']

  const handleCtaClick = () => {
    if (section === 'categories') setShowCategoryDialog(true)
    else if (section === 'branches') setShowBranchDialog(true)
    else if (section === 'ticket-types') setShowTicketTypeDialog(true)
  }

  // ── Redesign presentation helpers ──
  const iconBtn: React.CSSProperties = {
    width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'transparent', borderRadius: 7, cursor: 'pointer',
  }
  const addBtn: React.CSSProperties = { height: 34, padding: '0 14px', fontSize: 12.5 }
  const cardHeadTitle: React.CSSProperties = { fontSize: 15, fontWeight: 500 }
  const cardHeadSub: React.CSSProperties = { fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }
  const monoCount: React.CSSProperties = { fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }
  const fieldLabel: React.CSSProperties = { fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }
  const fieldInput: React.CSSProperties = { height: 38, border: '1px solid var(--border)', borderRadius: 9, padding: '0 12px', fontSize: 13.5, background: 'var(--surface)', color: 'var(--text-primary)', width: '100%' }

  // Reports section gets its own full-page component
  if (activeTab === 'reports') {
    return <ReportsHub />
  }

  return (
    <div style={{ padding: '26px 32px 48px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Users Tab */}
            {activeTab === 'users' && (
              <DsCard padding={0} style={{ overflow: 'hidden' }}>
                <UserManagement user={user} />
              </DsCard>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
            <>
            <DsCard padding={0} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px' }}>
                <div>
                  <div style={cardHeadTitle}>Asset categories</div>
                  <div style={cardHeadSub}>Categories route tickets to the right department admin</div>
                </div>
                <button className="btn-accent" style={addBtn} onClick={() => { resetCategoryForm(); setShowCategoryDialog(true) }}>
                  <Plus size={14} strokeWidth={2} />
                  Add category
                </button>
              </div>
              {categories.length === 0 ? (
                <div style={{ padding: '30px 22px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--row-sep)' }}>
                  No categories yet. Click &quot;Add category&quot; to create one.
                </div>
              ) : (
                categories.map((category) => (
                  <div key={category.id} className="ds-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 4, background: category.color || '#3B82F6', flex: 'none' }} />
                    <span style={{ width: 160, fontSize: 13.5, fontWeight: 500, flex: 'none' }}>{category.name}</span>
                    <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{category.description}</span>
                    {category.isDefault && <DsBadge variant="neutral">Default</DsBadge>}
                    <span style={monoCount}>{category._count?.assets || 0} assets</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button style={iconBtn} onClick={() => openEditCategory(category)} title="Edit"><Edit size={14} strokeWidth={1.7} style={{ color: 'var(--text-muted)' }} /></button>
                      <button style={iconBtn} onClick={() => handleDeleteCategory(category)} title="Delete"><Trash2 size={14} strokeWidth={1.7} style={{ color: 'var(--text-muted)' }} /></button>
                    </div>
                  </div>
                ))
              )}
            </DsCard>

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
            <DsCard padding={0} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px' }}>
                <div>
                  <div style={cardHeadTitle}>Branches</div>
                  <div style={cardHeadSub}>Users and tickets are scoped to branches</div>
                </div>
                <button className="btn-accent" style={addBtn} onClick={() => { resetBranchForm(); setShowBranchDialog(true) }}>
                  <Plus size={14} strokeWidth={2} />
                  Add branch
                </button>
              </div>
              {branches.length === 0 ? (
                <div style={{ padding: '30px 22px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--row-sep)' }}>
                  No branches defined yet. Add your first branch.
                </div>
              ) : (
                branches.map((branch) => (
                  <div key={branch.id} className="ds-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px' }}>
                    <span style={{ width: 190, fontSize: 13.5, fontWeight: 500, flex: 'none' }}>{branch.name}</span>
                    <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{branch.address}</span>
                    <DsBadge variant={branch.isHeadOffice ? 'accent' : 'neutral'}>{branch.type.replace(/_/g, ' ')}</DsBadge>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button style={iconBtn} onClick={() => openEditBranch(branch)} title="Edit"><Edit size={14} strokeWidth={1.7} style={{ color: 'var(--text-muted)' }} /></button>
                      <button style={iconBtn} onClick={() => handleDeleteBranch(branch)} title="Delete"><Trash2 size={14} strokeWidth={1.7} style={{ color: 'var(--text-muted)' }} /></button>
                    </div>
                  </div>
                ))
              )}
            </DsCard>

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
                  <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--blue)' }}>
                    <Switch
                      checked={branchForm.isHeadOffice}
                      onCheckedChange={(checked) => setBranchForm({ ...branchForm, isHeadOffice: checked, type: checked ? 'HEAD_OFFICE' : 'BRANCH' })}
                    />
                    <div className="flex-1">
                      <Label className="font-medium" style={{ color: 'var(--text-primary)' }}>Head Office</Label>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Users assigned to HQ have access to all branches</p>
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
            <DsCard padding={0} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px' }}>
                <div>
                  <div style={cardHeadTitle}>Ticket types</div>
                  <div style={cardHeadSub}>Each type sets a default priority and SLA target</div>
                </div>
                <button className="btn-accent" style={addBtn} onClick={() => { resetTicketTypeForm(); setShowTicketTypeDialog(true) }}>
                  <Plus size={14} strokeWidth={2} />
                  Add type
                </button>
              </div>
              {ticketTypes.length === 0 ? (
                <div style={{ padding: '30px 22px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--row-sep)' }}>
                  No ticket types configured. Click &quot;Add type&quot; to create one.
                </div>
              ) : (
                ticketTypes.map((type) => (
                  <div key={type.id} className="ds-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 22px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 4, background: type.color, flex: 'none' }} />
                    <span style={{ width: 150, fontSize: 13.5, fontWeight: 500, flex: 'none' }}>{type.name}</span>
                    <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type.description}</span>
                    {type.requiresAsset && <DsBadge variant="neutral">Requires asset</DsBadge>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button style={iconBtn} onClick={() => openEditTicketType(type)} title="Edit"><Edit size={14} strokeWidth={1.7} style={{ color: 'var(--text-muted)' }} /></button>
                      <button style={iconBtn} onClick={() => handleDeleteTicketType(type)} title="Delete"><Trash2 size={14} strokeWidth={1.7} style={{ color: 'var(--text-muted)' }} /></button>
                    </div>
                  </div>
                ))
              )}
            </DsCard>

            {/* Priority Levels Card */}
            <DsCard padding="18px 22px">
              <div style={cardHeadTitle}>Priority levels</div>
              <div style={cardHeadSub}>System-defined priority levels for tickets</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {([
                  { name: 'Low', variant: 'green' },
                  { name: 'Medium', variant: 'amber' },
                  { name: 'High', variant: 'orange' },
                  { name: 'Critical', variant: 'red' },
                ] as const).map((priority) => (
                  <DsBadge key={priority.name} variant={priority.variant}>{priority.name}</DsBadge>
                ))}
              </div>
            </DsCard>

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
            <DsCard padding={0} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px' }}>
                <div style={cardHeadTitle}>Notifications</div>
                <div style={cardHeadSub}>Email and SMS alerts for your team</div>
              </div>
              {[
                { key: 'newTicket', title: 'New ticket created', desc: 'Email admins when a ticket is raised in their department' },
                { key: 'slaBreach', title: 'SLA breach warning', desc: 'Alert 2 hours before an SLA response deadline' },
                { key: 'invoiceSubmitted', title: 'Invoice submitted', desc: 'Notify when a contractor submits an invoice' },
                { key: 'sms', title: 'SMS notifications', desc: 'Send critical alerts via SMS (Africa’s Talking)' },
              ].map(({ key, title, desc }) => (
                <div key={key} className="ds-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px' }}>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</span>
                  </span>
                  <DsToggle on={!!notifPrefs[key]} onChange={(next) => setNotifPrefs((prev) => ({ ...prev, [key]: next }))} />
                </div>
              ))}
              <div style={{ padding: '16px 22px', borderTop: '1px solid var(--row-sep)' }}>
                <button className="btn-accent" style={{ opacity: 0.5, cursor: 'not-allowed' }} disabled>
                  <Save size={14} strokeWidth={1.8} />
                  Save preferences
                </button>
                <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-muted)' }}>
                  Note: Full notification configuration coming soon.
                </p>
              </div>
            </DsCard>
          )}

          {/* ==================== REPORTS TAB ==================== */}
          {activeTab === 'reports' && (
            <DsCard padding="20px 22px">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={18} strokeWidth={1.7} style={{ color: 'var(--accent-color)' }} />
                <div>
                  <div style={cardHeadTitle}>Reports &amp; data export</div>
                  <div style={cardHeadSub}>Download detailed ticket and repair data for analysis</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>
                {/* Ticket Report */}
                <div style={{ border: '1px solid var(--border-inner)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 style={{ fontSize: 14.5, fontWeight: 500 }}>Ticket report</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Export detailed ticket data including site, requester, dates, SLA, contractor, category, asset, cost, and status.
                      </p>
                    </div>
                    <FileSpreadsheet className="h-8 w-8" style={{ color: 'var(--green)' }} />
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4" style={{ borderTop: '1px solid var(--border-inner)' }}>
                    <div>
                      <Label htmlFor="report-date-from" className="text-xs">From Date</Label>
                      <Input 
                        id="report-date-from"
                        type="date" 
                        value={reportDateFrom}
                        onChange={(e) => setReportDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="report-date-to" className="text-xs">To Date</Label>
                      <Input 
                        id="report-date-to"
                        type="date" 
                        value={reportDateTo}
                        onChange={(e) => setReportDateTo(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="report-status" className="text-xs">Status Filter</Label>
                      <Select value={reportStatus} onValueChange={setReportStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="PROCESSING">Processing</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <button
                        className="btn-accent"
                        onClick={handleDownloadTicketReport}
                        disabled={reportLoading}
                        style={{ width: '100%', justifyContent: 'center', opacity: reportLoading ? 0.6 : 1 }}
                      >
                        {reportLoading ? 'Generating…' : (<><Download size={14} strokeWidth={1.8} /> Download CSV</>)}
                      </button>
                    </div>
                  </div>
                  
                  {/* Report Columns Selection */}
                  <div className="rounded-lg p-4 mt-4" style={{ backgroundColor: 'var(--surface2)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Select columns to include:</h4>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setReportColumns(prev => {
                            const allTrue: Record<string, boolean> = {}
                            Object.keys(prev).forEach(key => allTrue[key] = true)
                            return allTrue
                          })}
                        >
                          Select All
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setReportColumns(prev => {
                            const allFalse: Record<string, boolean> = {}
                            Object.keys(prev).forEach(key => allFalse[key] = false)
                            return allFalse
                          })}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: 'ticketNumber', label: 'Ticket Number' },
                        { key: 'title', label: 'Title' },
                        { key: 'description', label: 'Description' },
                        { key: 'siteBranch', label: 'Site/Branch Name' },
                        { key: 'requesterName', label: 'Requester Name' },
                        { key: 'requesterEmail', label: 'Requester Email' },
                        { key: 'requesterPhone', label: 'Requester Phone' },
                        { key: 'dateCreated', label: 'Date Created' },
                        { key: 'dateClosed', label: 'Date Closed' },
                        { key: 'timeToClose', label: 'Time to Close' },
                        { key: 'slaStatus', label: 'SLA Status' },
                        { key: 'contractor', label: 'Contractor Assigned' },
                        { key: 'category', label: 'Category' },
                        { key: 'type', label: 'Type' },
                        { key: 'assetName', label: 'Asset Name' },
                        { key: 'assetNumber', label: 'Asset Number' },
                        { key: 'repairCost', label: 'Repair Cost' },
                        { key: 'invoiceNumber', label: 'Invoice Number' },
                        { key: 'priority', label: 'Priority' },
                        { key: 'status', label: 'Status' }
                      ].map(col => (
                        <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded">
                          <Checkbox
                            checked={reportColumns[col.key]}
                            onCheckedChange={(checked) =>
                              setReportColumns(prev => ({ ...prev, [col.key]: !!checked }))
                            }
                          />
                          <span style={{ color: 'var(--text-secondary)' }}>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Export Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    className="ds-btn-ghost"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => {
                      const today = new Date()
                      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                      setReportDateFrom(firstDayOfMonth.toISOString().split('T')[0])
                      setReportDateTo(today.toISOString().split('T')[0])
                      setReportStatus('all')
                    }}
                  >
                    <Calendar size={14} strokeWidth={1.7} />
                    This month
                  </button>
                  <button
                    className="ds-btn-ghost"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => {
                      const today = new Date()
                      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
                      setReportDateFrom(lastMonth.toISOString().split('T')[0])
                      setReportDateTo(lastDayOfLastMonth.toISOString().split('T')[0])
                      setReportStatus('all')
                    }}
                  >
                    <Calendar size={14} strokeWidth={1.7} />
                    Last month
                  </button>
                  <button
                    className="ds-btn-ghost"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => {
                      setReportStatus('CLOSED')
                      setReportDateFrom('')
                      setReportDateTo('')
                    }}
                  >
                    <Filter size={14} strokeWidth={1.7} />
                    Closed tickets only
                  </button>
                </div>
              </div>
            </DsCard>
          )}

          {/* ==================== BILLING TAB ==================== */}
          {activeTab === 'billing' && (
            user.role === 'SUPER_ADMIN' ? (
              <DsCard padding="40px 22px">
                <div style={{ textAlign: 'center' }}>
                  <CreditCard className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Super admin billing</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Tenant billing is managed from the Super Admin Dashboard.
                  </p>
                  <button className="ds-btn-ghost" onClick={() => (window.location.href = '/super-admin')}>
                    Go to Super Admin Dashboard
                  </button>
                </div>
              </DsCard>
            ) : (
              <BillingManagement />
            )
          )}

          {/* ==================== ORGANIZATION TAB ==================== */}
          {activeTab === 'organization' && (
            <DsCard padding="22px" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={cardHeadTitle}>Organisation</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="org-name" style={fieldLabel}>Company name</label>
                <input id="org-name" placeholder="Your Company Name" disabled style={{ ...fieldInput, opacity: 0.75 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="org-email" style={fieldLabel}>Contact email</label>
                <input id="org-email" type="email" placeholder="info@yourcompany.com" disabled style={{ ...fieldInput, opacity: 0.75 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={fieldLabel}>Workspace URL</label>
                <div style={{ display: 'flex', alignItems: 'center', height: 38, border: '1px solid var(--border)', borderRadius: 9, padding: '0 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--hover)' }}>
                  your-workspace<span style={{ color: 'var(--text-faint)' }}>.ticktrack.com</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-accent" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  <Save size={14} strokeWidth={1.8} />
                  Save changes
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Note: Organisation settings are managed by Super Admin.
              </p>
            </DsCard>
          )}
      </div>
    </div>
  )
}
