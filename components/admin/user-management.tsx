'use client'

import { useEffect, useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  User,
  Users,
  Edit,
  Mail,
  Send,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { Card as DSCard, MonoLabel, Badge as DSBadge, Avatar, avatarTint, type BadgeVariant } from '@/components/admin/kit'

interface UserData {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  isActive: boolean
  createdAt: string
  phone?: string | null
  branches?: Array<{
    branch: {
      id: string
      name: string
      isHeadOffice: boolean
    }
  }>
}

interface Branch {
  id: string
  name: string
  type: string
  isHeadOffice: boolean
  isActive: boolean
}

interface UserManagementProps {
  user: any
}

const ROLE_OPTIONS = [
  { value: 'END_USER', label: 'End User', description: 'Can create and view their own tickets' },
  { value: 'TENANT_ADMIN', label: 'Tenant Admin', description: 'Full admin access to company' },
  { value: 'IT_ADMIN', label: 'IT Admin', description: 'Admin for IT department tickets' },
  { value: 'SALES_ADMIN', label: 'Sales Admin', description: 'Admin for Sales department tickets' },
  { value: 'RETAIL_ADMIN', label: 'Retail Admin', description: 'Admin for Retail department tickets' },
  { value: 'MAINTENANCE_ADMIN', label: 'Maintenance Admin', description: 'Admin for Maintenance tickets' },
  { value: 'PROJECTS_ADMIN', label: 'Projects Admin', description: 'Admin for Projects department' },
]

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function getRolePill(role: string): React.CSSProperties {
  if (role.includes('ADMIN')) return { backgroundColor: '#f0efe9', color: '#444441' }
  if (role === 'END_USER') return { backgroundColor: '#eff6ff', color: '#1e40af' }
  return { backgroundColor: '#f0efe9', color: '#6b6860' }
}

function formatRoleLabel(role: string): string {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

// Redesign role badge variant
function roleVariant(role: string): BadgeVariant {
  switch (role) {
    case 'TENANT_ADMIN': return 'accent'
    case 'IT_ADMIN': return 'blue'
    case 'MAINTENANCE_ADMIN': return 'amber'
    case 'END_USER': return 'neutral'
    default: return role.includes('ADMIN') ? 'blue' : 'neutral'
  }
}

const USER_GRID = '1.5fr 150px 160px 90px 110px 100px 44px'

export function UserManagement({ user }: UserManagementProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])

  // Filter drawer state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [userFilters, setUserFilters] = useState({ role: '', status: '' })
  // statFilter: '' | 'total' | 'admins' | 'end_users' | 'active'
  const [statFilter, setStatFilter] = useState('')

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteExpiry, setInviteExpiry] = useState('72')
  const [isInviting, setIsInviting] = useState(false)

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'END_USER',
    branchIds: [] as string[]
  })

  const [editUser, setEditUser] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    isActive: true,
    branchIds: [] as string[]
  })

  const [newPassword, setNewPassword] = useState('')

  // Action menu state for inline dropdown
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [menuUser, setMenuUser] = useState<UserData | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchBranches()
  }, [])

  useEffect(() => {
    const handleClickOutside = () => { if (menuAnchorEl) { setMenuAnchorEl(null); setMenuUser(null) } }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuAnchorEl])

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      } else {
        toast.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      toast.error('Email is required')
      return
    }

    setIsInviting(true)
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          expiresInHours: parseInt(inviteExpiry)
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Invitation sent successfully')
        // If email didn't send, show the link for manual copying
        if (data.invitation?.inviteLink) {
          console.log('Invitation link:', data.invitation.inviteLink)
          // Copy link to clipboard
          try {
            await navigator.clipboard.writeText(data.invitation.inviteLink)
            toast.info('Invitation link copied to clipboard (check console for link)', { duration: 5000 })
          } catch (e) {
            toast.info('Check browser console for invitation link', { duration: 5000 })
          }
        }
        setShowInviteDialog(false)
        setInviteEmail('')
        setInviteName('')
        setInviteExpiry('72')
      } else {
        toast.error(data.error || 'Failed to send invitation')
      }
    } catch (error) {
      toast.error('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.phone) {
      toast.error('Please fill in all required fields including phone number')
      return
    }

    if (newUser.branchIds.length === 0) {
      toast.error('Please select at least one branch')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        toast.success('User created successfully. An activation email has been sent.')
        setShowCreateDialog(false)
        setNewUser({ name: '', email: '', phone: '', role: 'END_USER', branchIds: [] })
        fetchUsers()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Failed to create user:', error)
      toast.error('Failed to create user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUser = (userData: UserData) => {
    setSelectedUser(userData)
    setEditUser({
      name: userData.name || '',
      email: userData.email,
      role: userData.role,
      phone: userData.phone || '',
      isActive: userData.isActive,
      branchIds: userData.branches?.map(ub => ub.branch.id) || []
    })
    setShowEditDialog(true)
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    if (editUser.branchIds.length === 0) {
      toast.error('Please select at least one branch')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUser)
      })

      if (response.ok) {
        toast.success('User updated successfully')
        setShowEditDialog(false)
        fetchUsers()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Failed to update user:', error)
      toast.error('Failed to update user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = (userData: UserData) => {
    setSelectedUser(userData)
    setNewPassword('')
    setShowResetPasswordDialog(true)
  }

  const handlePasswordReset = async () => {
    if (!selectedUser || !newPassword) {
      toast.error('Please enter a new password')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      })

      if (response.ok) {
        toast.success(`Password reset successfully for ${selectedUser.name || selectedUser.email}`)
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
      setIsSubmitting(false)
    }
  }

  const handleSendActivationEmail = async (userData: UserData) => {
    try {
      toast.loading(`Sending activation email to ${userData.email}...`, { id: 'activation-email' })
      const response = await fetch(`/api/admin/users/${userData.id}/send-activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Activation email sent to ${userData.email}`, { id: 'activation-email' })
        // Copy link to clipboard for development
        if (data.activationLink) {
          try {
            await navigator.clipboard.writeText(data.activationLink)
            toast.info('Activation link also copied to clipboard', { duration: 3000 })
          } catch (e) {
            console.log('Activation link:', data.activationLink)
          }
        }
        fetchUsers()
      } else {
        toast.error(data.error || 'Failed to send activation email', { id: 'activation-email' })
      }
    } catch (error) {
      console.error('Failed to send activation email:', error)
      toast.error('Failed to send activation email', { id: 'activation-email' })
    }
  }

  const handleToggleActive = async (userData: UserData) => {
    try {
      const response = await fetch(`/api/admin/users/${userData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !userData.isActive })
      })

      if (response.ok) {
        toast.success(`User ${userData.isActive ? 'deactivated' : 'activated'}`)
        fetchUsers()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const getRoleBadgeStyle = (role: string): React.CSSProperties => {
    switch (role) {
      case 'TENANT_ADMIN':
        return { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }
      case 'IT_ADMIN':
        return { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }
      case 'SALES_ADMIN':
        return { backgroundColor: 'var(--green-bg)', color: 'var(--green)' }
      case 'RETAIL_ADMIN':
        return { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }
      case 'MAINTENANCE_ADMIN':
        return { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }
      case 'PROJECTS_ADMIN':
        return { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }
      case 'END_USER':
        return { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }
      default:
        return { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, userData: UserData) => {
    setMenuAnchorEl(event.currentTarget)
    setMenuUser(userData)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
    setMenuUser(null)
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search
      if (searchQuery) {
        const s = searchQuery.toLowerCase()
        if (!u.name?.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s)) return false
      }
      // Stat card filter
      if (statFilter === 'admins') { if (!u.role.includes('ADMIN')) return false }
      else if (statFilter === 'end_users') { if (u.role !== 'END_USER') return false }
      else if (statFilter === 'active') { if (!u.isActive) return false }
      // Drawer role filter
      if (userFilters.role) {
        if (userFilters.role === 'admin' && !u.role.includes('ADMIN')) return false
        if (userFilters.role === 'end_user' && u.role !== 'END_USER') return false
      }
      // Drawer status filter
      if (userFilters.status === 'active' && !u.isActive) return false
      if (userFilters.status === 'inactive' && u.isActive) return false
      return true
    })
  }, [users, searchQuery, statFilter, userFilters])

  const activeFilterCount = (userFilters.role ? 1 : 0) + (userFilters.status ? 1 : 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Filter drawer overlay */}
      {filterDrawerOpen && (
        <div onClick={() => setFilterDrawerOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26,25,22,0.25)', zIndex: 49 }} />
      )}
      {/* Filter drawer panel */}
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: 300, backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 50, transform: filterDrawerOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.22s ease', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>Filters</span>
          <button onClick={() => setFilterDrawerOpen(false)} style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Role section */}
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--text-muted)', marginBottom: 8 }}>Role</div>
          {[{ value: 'admin', label: 'Admin' }, { value: 'end_user', label: 'End User' }].map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={userFilters.role === opt.value} onChange={() => setUserFilters(f => ({ ...f, role: f.role === opt.value ? '' : opt.value }))} style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{opt.label}</span>
            </label>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 12px' }} />
          {/* Status section */}
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--text-muted)', marginBottom: 8 }}>Status</div>
          {[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }].map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={userFilters.status === opt.value} onChange={() => setUserFilters(f => ({ ...f, status: f.status === opt.value ? '' : opt.value }))} style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{opt.label}</span>
            </label>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button onClick={() => { setUserFilters({ role: '', status: '' }); setFilterDrawerOpen(false) }} style={{ flex: 1, padding: '7px', fontSize: 'var(--text-xs)', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-secondary)' }}>Clear all</button>
          <button onClick={() => setFilterDrawerOpen(false)} style={{ flex: 2, padding: '7px', fontSize: 'var(--text-xs)', border: '1px solid var(--accent)', borderRadius: 7, background: 'var(--accent)', cursor: 'pointer', color: 'var(--bg)', fontWeight: 500 }}>Apply Filters</button>
        </div>
      </div>

      <div style={{ padding: '26px 32px 48px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 300, letterSpacing: '-0.03em', margin: 0 }}>Users</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{users.length} users across {branches.length} branches</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Filters ghost button with badge */}
            <button onClick={() => setFilterDrawerOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 13px', border: '1px solid var(--border)', borderRadius: 9, background: filterDrawerOpen ? 'var(--hover)' : 'var(--surface)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', position: 'relative' }}>
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: 'currentColor', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' }}><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filters
              {activeFilterCount > 0 && (
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent-color)', color: '#fff', fontSize: 10, fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>
              )}
            </button>
            {/* Add User ghost button */}
            <button onClick={() => setShowCreateDialog(true)} style={{ height: 36, padding: '0 13px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>Add user</button>
            {/* Invite User primary button */}
            <button className="btn-accent" onClick={() => setShowInviteDialog(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              Invite user
            </button>
          </div>
        </div>

        {/* 4 stat cards (click to filter) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { key: '', label: 'Total Users', value: users.length, color: 'var(--text-primary)' },
            { key: 'admins', label: 'Admins', value: users.filter(u => u.role.includes('ADMIN')).length, color: 'var(--text-primary)' },
            { key: 'end_users', label: 'End Users', value: users.filter(u => u.role === 'END_USER').length, color: 'var(--blue)' },
            { key: 'active', label: 'Active', value: users.filter(u => u.isActive).length, color: 'var(--green)' },
          ].map(card => {
            const active = statFilter === card.key
            return (
              <DSCard key={card.key} padding="16px 18px" onClick={() => setStatFilter(statFilter === card.key ? '' : card.key)}
                style={{ border: active ? '1px solid var(--accent-color)' : undefined, background: active ? 'var(--accent-soft)' : undefined }}>
                <MonoLabel>{card.label}</MonoLabel>
                <div style={{ fontSize: 29, fontWeight: 300, letterSpacing: '-0.03em', color: card.color, marginTop: 8 }}>{card.value}</div>
              </DSCard>
            )
          })}
        </div>

        {/* Table card with inline search in header */}
        <DSCard padding={0} style={{ overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 22px', borderBottom: '1px solid var(--border-inner)' }}>
            <span style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text-primary)' }}>All users</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text-muted)' }}>{filteredUsers.length} results</span>
              {/* Inline search */}
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, stroke: 'var(--text-muted)', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' }} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users..." style={{ paddingLeft: 28, paddingRight: 10, height: 32, fontSize: 12.5, border: '1px solid var(--border)', borderRadius: 8, backgroundColor: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', width: 200 }} />
              </div>
            </div>
          </div>

          {/* Table header */}
          <div className="ds-thead" style={{ display: 'grid', gridTemplateColumns: USER_GRID, gap: 12, padding: '11px 22px', borderBottom: '1px solid var(--border-inner)' }}>
            <span>USER</span>
            <span>ROLE</span>
            <span>BRANCH</span>
            <span>TICKETS</span>
            <span>STATUS</span>
            <span>JOINED</span>
            <span />
          </div>

          {/* Rows */}
          {filteredUsers.map(userData => {
            const tint = avatarTint(userData.email || userData.id)
            const active = userData.isActive
            const invited = !active && (userData.status || '').toUpperCase() === 'INVITED'
            const statusLabel = active ? 'Active' : invited ? 'Invited' : 'Inactive'
            const dotColor = active ? 'var(--green)' : invited ? 'var(--amber)' : 'var(--red)'
            return (
              <div key={userData.id} className="ds-row" style={{ display: 'grid', gridTemplateColumns: USER_GRID, gap: 12, alignItems: 'center', padding: '13px 22px' }}>
                {/* User */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <Avatar initials={getInitials(userData.name, userData.email)} size={32} tint={tint.tint} color={tint.color} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userData.name || 'No Name'}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userData.email}</span>
                  </span>
                </span>
                {/* Role */}
                <span><DSBadge variant={roleVariant(userData.role)}>{formatRoleLabel(userData.role)}</DSBadge></span>
                {/* Branch */}
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userData.branches && userData.branches.length > 0
                    ? userData.branches.map(ub => ub.branch.name).join(', ')
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </span>
                {/* Tickets */}
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                {/* Status */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: dotColor, flex: 'none' }} />
                  {statusLabel}
                </span>
                {/* Joined */}
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(userData.createdAt).toLocaleDateString()}
                </span>
                {/* Actions — ··· button opens inline dropdown */}
                <span style={{ textAlign: 'right' }}>
                  <button
                    onClick={e => { e.stopPropagation(); handleMenuOpen(e, userData) }}
                    style={{ fontSize: 15, padding: '2px 6px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', letterSpacing: 2, borderRadius: 6 }}
                  >···</button>
                </span>
              </div>
            )
          })}

          {filteredUsers.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 20px' }}>
              <div style={{ width: 32, height: 32, backgroundColor: 'var(--hover)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <svg style={{ width: 16, height: 16, stroke: 'var(--text-muted)', fill: 'none', strokeWidth: 1.5 }} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>No users found</div>
            </div>
          )}
        </DSCard>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter user's full name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+263 77 123 4567"
                value={newUser.phone}
                onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
              />
              <p className="text-xs text-muted-foreground mt-1">For SMS notifications</p>
            </div>

            <div className="rounded-md p-3 border" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--accent)' }}>
              <p className="text-sm" style={{ color: 'var(--blue)' }}>
                <Mail className="inline h-4 w-4 mr-1" />
                An activation email will be sent to the user. They will set their own password.
              </p>
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <Select value={newUser.role} onValueChange={(value) => {
                setNewUser({...newUser, role: value})
                // If role contains ADMIN or is TENANT_ADMIN, auto-select all branches if there's a head office
                const isAdmin = value.includes('ADMIN')
                if (isAdmin) {
                  const hqBranch = branches.find(b => b.isHeadOffice)
                  if (hqBranch) {
                    // Select all branches if assigned to HQ
                    setNewUser({...newUser, role: value, branchIds: [hqBranch.id]})
                  }
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <p className="font-medium">{role.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{role.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Selection */}
            <div className="space-y-2">
              <Label>Assign Branches *</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {branches.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No branches available. Create branches first.</p>
                ) : (
                  branches.map((branch) => {
                    const isHQ = branch.isHeadOffice
                    const isSelected = newUser.branchIds.includes(branch.id)
                    const isAdminRole = newUser.role.includes('ADMIN')

                    return (
                      <div key={branch.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`branch-${branch.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Add branch
                              const newBranchIds = [...newUser.branchIds, branch.id]
                              // If HQ is selected and user is admin, auto-select all branches
                              if (isHQ && isAdminRole) {
                                setNewUser({...newUser, branchIds: branches.map(b => b.id)})
                              } else {
                                setNewUser({...newUser, branchIds: newBranchIds})
                              }
                            } else {
                              // Remove branch
                              setNewUser({...newUser, branchIds: newUser.branchIds.filter(id => id !== branch.id)})
                            }
                          }}
                        />
                        <Label
                          htmlFor={`branch-${branch.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <span>{branch.name}</span>
                            {isHQ && (
                              <Badge variant="secondary" className="text-xs">HQ</Badge>
                            )}
                          </div>
                          {isHQ && isAdminRole && isSelected && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>Auto-selects all branches</p>
                          )}
                        </Label>
                      </div>
                    )
                  })
                )}
              </div>
              {newUser.branchIds.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{newUser.branchIds.length} branch(es) selected</p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Send an invitation email to a new user. They will be able to create their account after accepting.
          </p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-name">Name (Optional)</Label>
              <Input
                id="invite-name"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="invite-expiry">Invitation Expiry</Label>
              <Select value={inviteExpiry} onValueChange={setInviteExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours (default)</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendInvite} disabled={isInviting}>
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editUser.name}
                onChange={(e) => setEditUser({...editUser, name: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUser.email}
                onChange={(e) => setEditUser({...editUser, email: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={editUser.phone}
                onChange={(e) => setEditUser({...editUser, phone: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editUser.role} onValueChange={(value) => {
                setEditUser({...editUser, role: value})
                // Auto-select all branches for admin roles with HQ
                if (value.includes('ADMIN')) {
                  const hqBranch = branches.find(b => b.isHeadOffice)
                  if (hqBranch && editUser.branchIds.includes(hqBranch.id)) {
                    setEditUser(prev => ({
                      ...prev,
                      role: value,
                      branchIds: branches.map(b => b.id)
                    }))
                  }
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Selection */}
            <div>
              <Label>Assigned Branches</Label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                {editUser.role.includes('ADMIN')
                  ? 'Admins at Head Office get access to all branches'
                  : 'Select the branch(es) this user can access'}
              </p>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                {branches.map(branch => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-branch-${branch.id}`}
                      checked={editUser.branchIds.includes(branch.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const newBranchIds = [...editUser.branchIds, branch.id]
                          // If HQ selected and admin role, auto-select all
                          if (branch.isHeadOffice && editUser.role.includes('ADMIN')) {
                            setEditUser({...editUser, branchIds: branches.map(b => b.id)})
                          } else {
                            setEditUser({...editUser, branchIds: newBranchIds})
                          }
                        } else {
                          setEditUser({
                            ...editUser,
                            branchIds: editUser.branchIds.filter(id => id !== branch.id)
                          })
                        }
                      }}
                    />
                    <label
                      htmlFor={`edit-branch-${branch.id}`}
                      className="text-sm cursor-pointer flex items-center gap-2"
                    >
                      {branch.name}
                      {branch.isHeadOffice && (
                        <Badge variant="secondary" className="text-xs">HQ</Badge>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              {editUser.branchIds.length === 0 && (
                <p className="text-xs text-ds-red mt-1">At least one branch required</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={editUser.isActive}
                onChange={(e) => setEditUser({...editUser, isActive: e.target.checked})}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="edit-isActive">Account Active</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={isSubmitting || editUser.branchIds.length === 0}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
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
              Reset password for <strong>{selectedUser?.name || selectedUser?.email}</strong>
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
              <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handlePasswordReset} disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline actions dropdown — renders near the ··· button */}
      {menuUser && menuAnchorEl && (
        <div style={{ position: 'fixed', top: (menuAnchorEl as HTMLElement).getBoundingClientRect().bottom + 4, left: (menuAnchorEl as HTMLElement).getBoundingClientRect().left, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <button onClick={() => { handleEditUser(menuUser); handleMenuClose() }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--surface2)' }}>Edit</button>
          <button onClick={() => { handleResetPassword(menuUser); handleMenuClose() }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--surface2)' }}>Reset Password</button>
          <button onClick={() => { handleSendActivationEmail(menuUser); handleMenuClose() }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--surface2)' }}>Send Activation Email</button>
          <button onClick={() => { handleToggleActive(menuUser); handleMenuClose() }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 'var(--text-xs)', color: menuUser.isActive ? '#991b1b' : '#2d6a4f', background: 'none', border: 'none', cursor: 'pointer' }}>{menuUser.isActive ? 'Deactivate' : 'Activate'}</button>
        </div>
      )}
    </div>
  )
}
