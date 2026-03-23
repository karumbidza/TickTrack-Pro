'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MediaViewer } from '@/components/ui/media-viewer'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Wrench,
  DollarSign,
  MapPin,
  User,
  History,
  TrendingUp,
  AlertCircle,
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

function getStatusPill(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    ACTIVE:               { backgroundColor: '#e8f5ee', color: '#2d6a4f' },
    PENDING_APPROVAL:     { backgroundColor: '#fef3c7', color: '#92400e' },
    IN_MAINTENANCE:       { backgroundColor: '#eff6ff', color: '#1e40af' },
    REPAIR_NEEDED:        { backgroundColor: '#fef2f2', color: '#991b1b' },
    OUT_OF_SERVICE:       { backgroundColor: '#fef2f2', color: '#991b1b' },
    DECOMMISSIONED:       { backgroundColor: '#f0efe9', color: '#6b6860' },
    PENDING_DECOMMISSION: { backgroundColor: '#fef3c7', color: '#92400e' },
    MAINTENANCE:          { backgroundColor: '#eff6ff', color: '#1e40af' },
    RETIRED:              { backgroundColor: '#f0efe9', color: '#6b6860' },
  }
  return map[status] || { backgroundColor: '#f0efe9', color: '#6b6860' }
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
  const [statFilter, setStatFilter] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [drawerFilters, setDrawerFilters] = useState({ status: '', category: '', branch: '' })

  const applyDrawerFilters = () => {
    setStatusFilter(drawerFilters.status || 'all')
    setCategoryFilter(drawerFilters.category || 'all')
    setBranchFilter(drawerFilters.branch || 'all')
    setFilterDrawerOpen(false)
  }

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
      'ACTIVE':               { style: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' }, icon: <CheckCircle className="h-3 w-3" /> },
      'MAINTENANCE':          { style: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }, icon: <Wrench className="h-3 w-3" /> },
      'OUT_OF_SERVICE':       { style: { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }, icon: <XCircle className="h-3 w-3" /> },
      'RETIRED':              { style: { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }, icon: <Clock className="h-3 w-3" /> },
      'REPAIR_NEEDED':        { style: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }, icon: <AlertTriangle className="h-3 w-3" /> },
      'DECOMMISSIONED':       { style: { backgroundColor: 'var(--surface2)', color: 'var(--text-muted)' }, icon: <XCircle className="h-3 w-3" /> },
      'TRANSFERRED':          { style: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }, icon: <TrendingUp className="h-3 w-3" /> },
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
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Filter drawer overlay */}
      {filterDrawerOpen && (
        <div
          onClick={() => setFilterDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26,25,22,0.25)', zIndex: 49 }}
        />
      )}

      {/* Filter drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: 270, backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 50, transform: filterDrawerOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.22s ease', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Filters</span>
          <button onClick={() => setFilterDrawerOpen(false)} style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* Status section */}
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Status</div>
          {['ACTIVE', 'PENDING_APPROVAL', 'IN_MAINTENANCE', 'REPAIR_NEEDED', 'DECOMMISSIONED'].map(s => (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={drawerFilters.status === s} onChange={() => setDrawerFilters(f => ({ ...f, status: f.status === s ? '' : s }))} style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</span>
            </label>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 12px' }} />
          {/* Category section */}
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Category</div>
          {categories.map(cat => (
            <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={drawerFilters.category === cat.id} onChange={() => setDrawerFilters(f => ({ ...f, category: f.category === cat.id ? '' : cat.id }))} style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cat.name}</span>
            </label>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 12px' }} />
          {/* Branch section */}
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Branch</div>
          {branches.map(br => (
            <label key={br.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={drawerFilters.branch === br.id} onChange={() => setDrawerFilters(f => ({ ...f, branch: f.branch === br.id ? '' : br.id }))} style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{br.name}</span>
            </label>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setDrawerFilters({ status: '', category: '', branch: '' })
              setStatusFilter('all')
              setCategoryFilter('all')
              setBranchFilter('all')
              setFilterDrawerOpen(false)
            }}
            style={{ flex: 1, padding: 7, fontSize: 11, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >Clear all</button>
          <button
            onClick={applyDrawerFilters}
            style={{ flex: 2, padding: 7, fontSize: 11, background: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 7, cursor: 'pointer', color: 'var(--bg)', fontWeight: 500 }}
          >Apply Filters</button>
        </div>
      </div>

      {/* Topbar — 52px */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Assets</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{assets.length} assets</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(() => {
            const count = [drawerFilters.status, drawerFilters.category, drawerFilters.branch].filter(Boolean).length
            return (
              <button
                onClick={() => setFilterDrawerOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 7, background: filterDrawerOpen ? 'var(--surface2)' : 'var(--surface)', cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}
              >
                <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: 'currentColor', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' }}>
                  <line x1="4" y1="6" x2="20" y2="6"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                  <line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Filters
                {count > 0 && (
                  <span style={{ width: 15, height: 15, borderRadius: '50%', background: 'var(--accent)', color: 'var(--bg)', fontSize: 9, fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
                )}
              </button>
            )
          })()}
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 6 stat cards in a grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          {[
            { key: '',                  label: 'Total',       value: stats?.total ?? assets.length,             color: 'var(--text-primary)' },
            { key: 'ACTIVE',            label: 'Active',      value: stats?.active ?? 0,                        color: '#2d6a4f' },
            { key: 'PENDING_APPROVAL',  label: 'Pending',     value: stats?.pendingDecommission ?? 0,           color: '#92400e' },
            { key: 'IN_MAINTENANCE',    label: 'Maintenance', value: stats?.maintenance ?? 0,                   color: '#1e40af' },
            { key: 'REPAIR_NEEDED',     label: 'Repair',      value: stats?.repairNeeded ?? 0,                  color: '#991b1b' },
            { key: 'DECOMMISSIONED',    label: 'Decomm.',     value: stats?.decommissioned ?? 0,                color: '#9e9c94' },
          ].map(card => (
            <div
              key={card.key}
              onClick={() => { setStatFilter(statFilter === card.key ? '' : card.key); setStatusFilter(card.key || 'all') }}
              style={{ background: 'var(--surface)', border: statFilter === card.key ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 9, padding: '10px 12px', cursor: 'pointer', transition: 'border 0.15s ease' }}
            >
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 5 }}>{card.label}</div>
              <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: '-0.03em', color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Search bar full width */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, stroke: 'var(--text-muted)', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' }} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: 13, border: '1px solid var(--border)', borderRadius: 7, backgroundColor: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Table card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>All Assets</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text-muted)' }}>{assets.length} results</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 20px' }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Asset ID', 'Name', 'Category', 'Branch', 'Status', 'Last Updated', 'Actions'].map(col => (
                      <th key={col} style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 400, padding: '8px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset, i) => (
                    <tr
                      key={asset.id}
                      style={{ borderBottom: i === assets.length - 1 ? 'none' : '1px solid var(--surface2)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={() => fetchAssetDetail(asset.id)}
                    >
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-muted)', padding: '9px 14px', whiteSpace: 'nowrap' }}>{asset.assetNumber}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-primary)', padding: '9px 14px' }}>
                        <div style={{ fontWeight: 400 }}>{asset.name}</div>
                        {asset.brand && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{asset.brand}</div>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '9px 14px' }}>{asset.category?.name || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '9px 14px' }}>{asset.branch?.name || '—'}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '2px 7px', borderRadius: 99, ...getStatusPill(asset.status) }}>
                          {asset.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-muted)', padding: '9px 14px', whiteSpace: 'nowrap' }}>
                        {new Date(asset.purchaseDate || '').toLocaleDateString() !== 'Invalid Date' && asset.purchaseDate
                          ? new Date(asset.purchaseDate).toLocaleDateString()
                          : '—'
                        }
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); fetchAssetDetail(asset.id) }}
                          style={{ fontSize: 11, padding: '3px 9px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assets.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 20px' }}>
                  <div style={{ width: 32, height: 32, backgroundColor: 'var(--surface2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <svg style={{ width: 16, height: 16, stroke: 'var(--text-muted)', fill: 'none', strokeWidth: 1.5 }} viewBox="0 0 24 24">
                      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No assets found</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Try adjusting your filters</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Asset Detail Modal */}
      <Dialog open={showAssetDetail} onOpenChange={setShowAssetDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
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
