'use client'

import { useEffect, useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Star,
  Wrench,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Heart,
  Copy,
  Send,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ContractorKYCManagement } from './contractor-kyc-management'
import { Card, MonoLabel, Badge, Avatar, avatarTint } from '@/components/admin/kit'

interface ContractorRating {
  id: string
  ticketId: string
  punctualityRating: number
  customerServiceRating: number
  workmanshipRating: number
  overallRating: number
  ppeCompliant: boolean
  followedSiteProcedures: boolean
  comment?: string
  createdAt: string
  ticket?: {
    title: string
    ticketNumber: string
  }
  user?: {
    name: string
    email: string
  }
}

interface RatingStats {
  totalRatings: number
  avgPunctuality: number
  avgCustomerService: number
  avgWorkmanship: number
  avgOverall: number
  ppeComplianceRate: number
  procedureComplianceRate: number
}

interface ContractorCategoryInfo {
  id: string
  name: string
  color?: string
  isAvailable: boolean
}

interface Contractor {
  id: string
  email: string
  name: string
  phone?: string
  secondaryPhone?: string
  isActive: boolean
  specializations?: string[]
  categories?: ContractorCategoryInfo[]
  rating?: number
  totalJobs?: number
  hourlyRate?: number | null
  isAvailable: boolean
  contractorProfileId?: string
  ratingStats?: RatingStats
}

interface AssetCategory {
  id: string
  name: string
  color?: string
}

interface ContractorManagementProps {
  user: any
}

function getInitials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export function ContractorManagement({ user }: ContractorManagementProps) {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [showRatingsModal, setShowRatingsModal] = useState(false)
  const [allCategories, setAllCategories] = useState<AssetCategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [contractorRatings, setContractorRatings] = useState<ContractorRating[]>([])
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const [newContractor, setNewContractor] = useState({
    name: '',
    email: '',
    phone: '',
    secondaryPhone: ''
  })
  const [editContractor, setEditContractor] = useState({
    name: '',
    email: '',
    phone: '',
    secondaryPhone: '',
    isActive: true
  })
  const [newPassword, setNewPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCompanyName, setInviteCompanyName] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  // New state
  const [statFilter, setStatFilter] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [contractorFilters, setContractorFilters] = useState({ status: '' })
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [menuContractor, setMenuContractor] = useState<Contractor | null>(null)

  useEffect(() => {
    fetchContractors()
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/asset-categories')
      if (response.ok) {
        const data = await response.json()
        setAllCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleInviteContractor = async () => {
    if (!inviteEmail || !inviteCompanyName) {
      toast.error('Please enter both email and company name')
      return
    }

    setIsInviting(true)
    try {
      const response = await fetch('/api/admin/contractors/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          companyName: inviteCompanyName
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Invitation sent successfully!', {
          description: `Registration link sent to ${inviteEmail}`
        })

        if (data.registrationLink) {
          setGeneratedLink(data.registrationLink)
        } else {
          setShowInviteDialog(false)
          setInviteEmail('')
          setInviteCompanyName('')
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Failed to invite contractor:', error)
      toast.error('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const fetchContractors = async () => {
    try {
      const response = await fetch('/api/admin/contractors')
      if (response.ok) {
        const data = await response.json()
        setContractors(data.contractors || [])
      } else {
        toast.error('Failed to fetch contractors')
      }
    } catch (error) {
      console.error('Failed to fetch contractors:', error)
      toast.error('Failed to fetch contractors')
    } finally {
      setLoading(false)
    }
  }

  const fetchContractorRatings = async (contractorId: string) => {
    setRatingsLoading(true)
    try {
      const response = await fetch(`/api/admin/contractors/${contractorId}/ratings`)
      if (response.ok) {
        const data = await response.json()
        setContractorRatings(data.ratings || [])
      } else {
        toast.error('Failed to fetch ratings')
      }
    } catch (error) {
      console.error('Failed to fetch ratings:', error)
      toast.error('Failed to fetch ratings')
    } finally {
      setRatingsLoading(false)
    }
  }

  const handleViewRatings = (contractor: Contractor) => {
    setSelectedContractor(contractor)
    setShowRatingsModal(true)
    fetchContractorRatings(contractor.contractorProfileId || contractor.id)
  }

  const handleEditContractor = (contractor: Contractor) => {
    setSelectedContractor(contractor)
    setEditContractor({
      name: contractor.name || '',
      email: contractor.email || '',
      phone: contractor.phone || '',
      secondaryPhone: contractor.secondaryPhone || '',
      isActive: contractor.isActive
    })
    setSelectedCategoryIds(contractor.categories?.map(c => c.id) || [])
    setShowEditDialog(true)
  }

  const handleResetPassword = (contractor: Contractor) => {
    setSelectedContractor(contractor)
    setNewPassword('')
    setShowResetPasswordDialog(true)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-ds-amber fill-yellow-400' : 'text-text-muted'}`}
          />
        ))}
      </div>
    )
  }

  const handleCreateContractor = async () => {
    if (!newContractor.name || !newContractor.email) {
      toast.error('Name and email are required')
      return
    }

    if (newContractor.phone && !newContractor.phone.match(/^\+?[0-9\s\-()]+$/)) {
      toast.error('Please enter a valid phone number')
      return
    }

    try {
      const response = await fetch('/api/admin/contractors/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContractor.name,
          email: newContractor.email,
          phone: newContractor.phone || undefined,
          secondaryPhone: newContractor.secondaryPhone || undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Contractor created! Default password: ${data.defaultPassword}`)
        setShowCreateDialog(false)
        setNewContractor({ name: '', email: '', phone: '', secondaryPhone: '' })
        fetchContractors()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create contractor')
      }
    } catch (error) {
      console.error('Failed to create contractor:', error)
      toast.error('Failed to create contractor')
    }
  }

  const handleUpdateContractor = async () => {
    if (!selectedContractor) return

    try {
      const response = await fetch(`/api/admin/contractors/${selectedContractor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editContractor.name,
          email: editContractor.email,
          phone: editContractor.phone || null,
          secondaryPhone: editContractor.secondaryPhone || null,
          isActive: editContractor.isActive
        })
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Failed to update contractor')
        return
      }

      const categoriesResponse = await fetch(`/api/admin/contractors/${selectedContractor.id}/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: selectedCategoryIds })
      })

      if (!categoriesResponse.ok) {
        const error = await categoriesResponse.json()
        toast.error(error.error || 'Failed to update categories')
        return
      }

      toast.success('Contractor updated successfully')
      setShowEditDialog(false)
      fetchContractors()
    } catch (error) {
      console.error('Failed to update contractor:', error)
      toast.error('Failed to update contractor')
    }
  }

  const handlePasswordReset = async () => {
    if (!selectedContractor || !newPassword) {
      toast.error('Please enter a new password')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsResetting(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedContractor.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      })

      if (response.ok) {
        toast.success(`Password reset successfully for ${selectedContractor.name}`)
        setShowResetPasswordDialog(false)
        setNewPassword('')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Failed to reset password:', error)
      toast.error('Failed to reset password')
    } finally {
      setIsResetting(false)
    }
  }

  const handleToggleActive = async (contractor: Contractor) => {
    try {
      const response = await fetch(`/api/admin/contractors/${contractor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !contractor.isActive
        })
      })

      if (response.ok) {
        toast.success(`Contractor ${contractor.isActive ? 'deactivated' : 'activated'}`)
        fetchContractors()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update contractor')
      }
    } catch (error) {
      console.error('Failed to toggle contractor status:', error)
      toast.error('Failed to update contractor status')
    }
  }

  // Derived data
  const activeContractors = useMemo(() => contractors.filter(c => c.isActive), [contractors])
  const availableCount = useMemo(() => contractors.filter(c => c.isAvailable && c.isActive).length, [contractors])
  const avgRating = useMemo(() => {
    const rated = contractors.filter(c => c.rating && c.rating > 0)
    if (rated.length === 0) return null
    return (rated.reduce((sum, c) => sum + (c.rating || 0), 0) / rated.length).toFixed(2)
  }, [contractors])

  const filteredContractors = useMemo(() => {
    let result = searchQuery
      ? contractors.filter(c =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : contractors
    if (statFilter === 'available') result = result.filter(c => c.isAvailable)
    if (statFilter === 'active') result = result.filter(c => c.isActive && !c.isAvailable)
    if (contractorFilters.status === 'available') result = result.filter(c => c.isAvailable)
    if (contractorFilters.status === 'active') result = result.filter(c => c.isActive)
    if (contractorFilters.status === 'inactive') result = result.filter(c => !c.isActive)
    return result
  }, [contractors, searchQuery, statFilter, contractorFilters])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading contractors...</p>
        </div>
      </div>
    )
  }

  const activeFilterCount = contractorFilters.status ? 1 : 0

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', padding: '26px 32px 48px' }}>
      {/* Filter drawer overlay */}
      {filterDrawerOpen && <div onClick={() => setFilterDrawerOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26,25,22,0.25)', zIndex: 49 }} />}
      {/* Filter drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: 300, backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 50, transform: filterDrawerOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.22s ease', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Filters</span>
          <button onClick={() => setFilterDrawerOpen(false)} style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface2)', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ flex: 1, padding: 16 }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--text-muted)', marginBottom: 8 }}>Status</div>
          {[{ value: 'available', label: 'Available' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }].map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={contractorFilters.status === opt.value} onChange={() => setContractorFilters(f => ({ ...f, status: f.status === opt.value ? '' : opt.value }))} style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{opt.label}</span>
            </label>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button onClick={() => { setContractorFilters({ status: '' }); setFilterDrawerOpen(false) }} style={{ flex: 1, padding: 7, fontSize: 'var(--text-xs)', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-secondary)' }}>Clear all</button>
          <button onClick={() => setFilterDrawerOpen(false)} style={{ flex: 2, padding: 7, fontSize: 'var(--text-xs)', background: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 7, cursor: 'pointer', color: 'var(--bg)', fontWeight: 500 }}>Apply Filters</button>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            {activeContractors.length} active contractor{activeContractors.length === 1 ? '' : 's'}
            {avgRating != null && <> · avg rating <span style={{ color: 'var(--amber)' }}>★</span> {avgRating}</>}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setFilterDrawerOpen(o => !o)} className="filter-chip" style={{ height: 34, position: 'relative' }}>
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' }}><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filters
              {activeFilterCount > 0 && <span className="chip-count">{activeFilterCount}</span>}
            </button>
            <button onClick={() => setShowCreateDialog(true)} style={{ height: 36, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)' }}>Quick add</button>
            <button onClick={() => setShowInviteDialog(true)} className="btn-accent">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              Invite contractor
            </button>
          </div>
        </div>

        {/* Stat cards (clickable quick-filters) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { key: '', label: 'Total', value: contractors.length, color: 'var(--text-primary)', clickable: true },
            { key: 'available', label: 'Available', value: availableCount, color: 'var(--green)', clickable: true },
            { key: 'active', label: 'Active / On jobs', value: activeContractors.length, color: 'var(--blue)', clickable: true },
            { key: '__avg', label: 'Avg rating', value: avgRating ?? '—', color: 'var(--text-primary)', clickable: false },
          ].map(card => {
            const active = card.clickable && statFilter === card.key
            return (
              <Card
                key={card.label}
                padding="16px 18px"
                onClick={card.clickable ? () => setStatFilter(statFilter === card.key ? '' : card.key) : undefined}
                style={active ? { border: '1px solid var(--accent-color)', background: 'var(--accent-soft)' } : undefined}
              >
                <MonoLabel>{card.label}</MonoLabel>
                <div className="stat-number" style={{ marginTop: 6, color: card.color }}>{card.value}</div>
              </Card>
            )
          })}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ value: 'active', label: 'Active contractors' }, { value: 'kyc', label: 'KYC applications' }].map(tab => (
              <button key={tab.value} onClick={() => setActiveTab(tab.value)} style={{ padding: '9px 4px', marginRight: 14, fontSize: 13, fontWeight: activeTab === tab.value ? 500 : 400, color: activeTab === tab.value ? 'var(--accent-color)' : 'var(--text-secondary)', background: 'none', border: 'none', borderBottom: activeTab === tab.value ? '2px solid var(--accent-color)' : '2px solid transparent', cursor: 'pointer', transition: 'color 0.12s', marginBottom: -1 }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, stroke: 'var(--text-muted)', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' }} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search contractors…" style={{ paddingLeft: 30, paddingRight: 12, height: 34, fontSize: 13, border: '1px solid var(--border)', borderRadius: 9, backgroundColor: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', width: 220 }} />
          </div>
        </div>

        {/* Table / KYC */}
        {activeTab === 'active' ? (
          <Card padding={0} style={{ overflow: 'hidden' }}>
            {/* Column header */}
            <div className="ds-thead" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.3fr 90px 90px 110px 110px 130px', gap: 12, padding: '11px 22px', borderBottom: '1px solid var(--border-inner)' }}>
              <span>Contractor</span><span>Specialties</span><span>Rate</span><span>Rating</span><span>Active jobs</span><span>Status</span><span />
            </div>
            {filteredContractors.map(contractor => {
              const t = avatarTint(contractor.name || contractor.email)
              const specs = (contractor.categories && contractor.categories.length > 0)
                ? contractor.categories.map(c => c.name)
                : (contractor.specializations || [])
              const statusVariant = contractor.isAvailable ? 'green' : contractor.isActive ? 'blue' : 'neutral'
              const statusText = contractor.isAvailable ? 'Available' : contractor.isActive ? 'Active' : 'Inactive'
              return (
                <div
                  key={contractor.id}
                  className="ds-row"
                  onClick={() => handleViewRatings(contractor)}
                  style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.3fr 90px 90px 110px 110px 130px', gap: 12, alignItems: 'center', padding: '14px 22px', cursor: 'pointer' }}
                >
                  {/* Contractor */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <Avatar initials={getInitials(contractor.name, contractor.email)} size={36} tint={t.tint} color={t.color} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{contractor.name}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contractor.email}</span>
                    </span>
                  </span>
                  {/* Specialties */}
                  <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {specs.length > 0 ? specs.slice(0, 3).map((s, idx) => (
                      <span key={idx} style={{ fontSize: 11, background: 'var(--hover-strong)', color: 'var(--text-tertiary)', borderRadius: 99, padding: '2px 9px', whiteSpace: 'nowrap' }}>{s}</span>
                    )) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
                  </span>
                  {/* Rate */}
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12.5 }}>{contractor.hourlyRate != null ? `$${contractor.hourlyRate}/hr` : '—'}</span>
                  {/* Rating */}
                  <span style={{ fontSize: 13, color: contractor.rating ? 'var(--amber)' : 'var(--text-muted)' }}>{contractor.rating ? `★ ${contractor.rating.toFixed(1)}` : '—'}</span>
                  {/* Active jobs */}
                  <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>{contractor.totalJobs ?? 0} done</span>
                  {/* Status */}
                  <span><Badge variant={statusVariant}>{statusText}</Badge></span>
                  {/* Actions */}
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                    <span onClick={e => { e.stopPropagation(); handleEditContractor(contractor) }} style={{ fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer' }}>Edit</span>
                    <span onClick={e => { e.stopPropagation(); handleViewRatings(contractor) }} className="link-accent" style={{ fontSize: 12.5 }}>View profile →</span>
                  </span>
                </div>
              )
            })}
            {filteredContractors.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
                <div style={{ width: 32, height: 32, backgroundColor: 'var(--surface2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <svg style={{ width: 16, height: 16, stroke: 'var(--text-muted)', fill: 'none', strokeWidth: 1.5 }} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>No contractors found</div>
              </div>
            )}
          </Card>
        ) : (
          /* KYC tab — render ContractorKYCManagement */
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <ContractorKYCManagement />
          </Card>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Contractor for KYC Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {generatedLink ? (
              <>
                <div className="flex items-center gap-2 p-3 border rounded-lg" style={{ backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }}>
                  <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--green)' }} />
                  <div>
                    <p className="font-medium" style={{ color: 'var(--green)' }}>Invitation Sent Successfully!</p>
                    <p className="text-sm" style={{ color: 'var(--green)' }}>Email sent to {inviteEmail}</p>
                  </div>
                </div>

                <div>
                  <Label>Registration Link</Label>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    You can also share this link directly with the contractor
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={generatedLink}
                      readOnly
                      className="text-sm font-mono"
                      style={{ backgroundColor: 'var(--surface2)' }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink)
                        toast.success('Link copied to clipboard!')
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => {
                      setShowInviteDialog(false)
                      setInviteEmail('')
                      setInviteCompanyName('')
                      setGeneratedLink(null)
                    }}
                  >
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Send a registration link to the contractor's email. They will complete their KYC registration
                  and you'll be able to review their application before approving them.
                </p>

                <div>
                  <Label htmlFor="inviteCompanyName">Company Name</Label>
                  <Input
                    id="inviteCompanyName"
                    placeholder="ABC Contractors (Pvt) Ltd"
                    value={inviteCompanyName}
                    onChange={(e) => setInviteCompanyName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="inviteEmail">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="contractor@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    A unique registration link will be sent to this email
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowInviteDialog(false)} disabled={isInviting}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteContractor} disabled={isInviting}>
                    {isInviting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Contractor Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Contractor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter contractor's full name"
                value={newContractor.name}
                onChange={(e) => setNewContractor({...newContractor, name: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="contractor@example.com"
                value={newContractor.email}
                onChange={(e) => setNewContractor({...newContractor, email: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Primary Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+263 77 123 4567"
                  value={newContractor.phone}
                  onChange={(e) => setNewContractor({...newContractor, phone: e.target.value})}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>International format (e.g., +263...)</p>
              </div>
              <div>
                <Label htmlFor="secondaryPhone">Secondary Phone (Optional)</Label>
                <Input
                  id="secondaryPhone"
                  type="tel"
                  placeholder="+263 77 987 6543"
                  value={newContractor.secondaryPhone}
                  onChange={(e) => setNewContractor({...newContractor, secondaryPhone: e.target.value})}
                />
              </div>
            </div>

            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              A default password will be generated and shown after creation.
              You can assign service categories after creating the contractor.
            </p>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateContractor}>
                Create Contractor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contractor Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contractor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editContractor.name}
                  onChange={(e) => setEditContractor({...editContractor, name: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editContractor.email}
                  onChange={(e) => setEditContractor({...editContractor, email: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-phone">Primary Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  placeholder="+263 77 123 4567"
                  value={editContractor.phone}
                  onChange={(e) => setEditContractor({...editContractor, phone: e.target.value})}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>International format</p>
              </div>
              <div>
                <Label htmlFor="edit-secondaryPhone">Secondary Phone</Label>
                <Input
                  id="edit-secondaryPhone"
                  type="tel"
                  placeholder="+263 77 987 6543"
                  value={editContractor.secondaryPhone}
                  onChange={(e) => setEditContractor({...editContractor, secondaryPhone: e.target.value})}
                />
              </div>
            </div>

            {/* Service Categories Section */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4" />
                Service Categories
              </Label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                Select the categories this contractor can be assigned to
              </p>
              <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                {allCategories.length === 0 ? (
                  <p className="text-sm text-center py-2" style={{ color: 'var(--text-muted)' }}>
                    No categories available
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {allCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors border-border"
                        style={selectedCategoryIds.includes(category.id) ? { borderColor: 'var(--accent)', backgroundColor: 'var(--blue-bg)' } : {}}
                        onClick={() => {
                          setSelectedCategoryIds(prev =>
                            prev.includes(category.id)
                              ? prev.filter(id => id !== category.id)
                              : [...prev, category.id]
                          )
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: selectedCategoryIds.includes(category.id) ? 'var(--accent)' : 'var(--border)',
                            backgroundColor: selectedCategoryIds.includes(category.id) ? 'var(--accent)' : 'transparent'
                          }}
                        >
                          {selectedCategoryIds.includes(category.id) && (
                            <CheckCircle className="h-3 w-3 text-bg" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {category.color && (
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                          <span className="text-sm truncate">{category.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {selectedCategoryIds.length} of {allCategories.length} selected
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={editContractor.isActive}
                onChange={(e) => setEditContractor({...editContractor, isActive: e.target.checked})}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="edit-isActive">Account Active</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateContractor}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p style={{ color: 'var(--text-secondary)' }}>
              Reset password for <strong>{selectedContractor?.name}</strong> ({selectedContractor?.email})
            </p>

            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)} disabled={isResetting}>
                Cancel
              </Button>
              <Button onClick={handlePasswordReset} disabled={isResetting}>
                {isResetting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ratings Modal */}
      <Dialog open={showRatingsModal} onOpenChange={setShowRatingsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>{selectedContractor?.name} - Rating Details</span>
            </DialogTitle>
          </DialogHeader>

          {selectedContractor && (
            <div className="space-y-6">
              {/* Rating Summary */}
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--surface2)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-4xl font-medium" style={{ color: 'var(--text-primary)' }}>
                      {selectedContractor.rating?.toFixed(1) || 'N/A'}
                    </div>
                    <div>
                      {renderStars(Math.round(selectedContractor.rating || 0))}
                      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Based on {contractorRatings.length} review{contractorRatings.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
                      {selectedContractor.totalJobs || 0}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Jobs</p>
                  </div>
                </div>

                {/* Average Ratings Breakdown */}
                {contractorRatings.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <Clock className="h-5 w-5 mx-auto text-ds-blue mb-1" />
                      <div className="text-lg font-medium">
                        {(contractorRatings.reduce((sum, r) => sum + r.punctualityRating, 0) / contractorRatings.length).toFixed(1)}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Punctuality</p>
                    </div>
                    <div className="text-center">
                      <Heart className="h-5 w-5 mx-auto text-pink-500 mb-1" />
                      <div className="text-lg font-medium">
                        {(contractorRatings.reduce((sum, r) => sum + r.customerServiceRating, 0) / contractorRatings.length).toFixed(1)}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Service</p>
                    </div>
                    <div className="text-center">
                      <Wrench className="h-5 w-5 mx-auto text-ds-amber mb-1" />
                      <div className="text-lg font-medium">
                        {(contractorRatings.reduce((sum, r) => sum + r.workmanshipRating, 0) / contractorRatings.length).toFixed(1)}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Workmanship</p>
                    </div>
                    <div className="text-center">
                      <Shield className="h-5 w-5 mx-auto text-ds-green mb-1" />
                      <div className="text-lg font-medium">
                        {Math.round((contractorRatings.filter(r => r.ppeCompliant).length / contractorRatings.length) * 100)}%
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PPE Compliant</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Individual Ratings */}
              <div>
                <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Individual Reviews</h4>
                <ScrollArea className="h-[300px]">
                  {ratingsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--accent)' }}></div>
                      <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Loading ratings...</p>
                    </div>
                  ) : contractorRatings.length === 0 ? (
                    <div className="text-center py-8">
                      <Star className="h-12 w-12 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                      <p style={{ color: 'var(--text-muted)' }}>No ratings yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contractorRatings.map((rating) => (
                        <div key={rating.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {rating.ticket?.title || 'Job'}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {rating.ticket?.ticketNumber} • {new Date(rating.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1">
                              {renderStars(rating.overallRating)}
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                              <span>{rating.punctualityRating}/5</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                              <span>{rating.customerServiceRating}/5</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Wrench className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                              <span>{rating.workmanshipRating}/5</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {rating.ppeCompliant ? (
                                <CheckCircle className="h-3 w-3 text-ds-green" />
                              ) : (
                                <XCircle className="h-3 w-3 text-ds-red" />
                              )}
                              <span>PPE</span>
                            </div>
                          </div>

                          {rating.comment && (
                            <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>"{rating.comment}"</p>
                          )}

                          {rating.user && (
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                              — {rating.user.name || rating.user.email}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
