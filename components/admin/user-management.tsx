'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { ScrollableDataGrid } from '@/components/ui/scrollable-data-grid'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import { 
  Plus,
  User,
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  Key,
  Search,
  MoreHorizontal,
  Mail,
  UserCog,
  Send,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

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

export function UserManagement({ user }: UserManagementProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  
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
    password: '',
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

  useEffect(() => {
    fetchUsers()
    fetchBranches()
  }, [])

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
    if (!newUser.name || !newUser.email || !newUser.phone || !newUser.password) {
      toast.error('Please fill in all required fields including phone number')
      return
    }

    if (newUser.branchIds.length === 0) {
      toast.error('Please select at least one branch')
      return
    }

    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters')
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
        toast.success('User created successfully')
        setShowCreateDialog(false)
        setNewUser({ name: '', email: '', phone: '', role: 'END_USER', password: '', branchIds: [] })
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'TENANT_ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'IT_ADMIN':
        return 'bg-blue-100 text-blue-800'
      case 'SALES_ADMIN':
        return 'bg-green-100 text-green-800'
      case 'RETAIL_ADMIN':
        return 'bg-orange-100 text-orange-800'
      case 'MAINTENANCE_ADMIN':
        return 'bg-yellow-100 text-yellow-800'
      case 'PROJECTS_ADMIN':
        return 'bg-cyan-100 text-cyan-800'
      case 'END_USER':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter users based on search and role
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  // Count users by role
  const adminCount = users.filter(u => u.role.includes('ADMIN')).length
  const endUserCount = users.filter(u => u.role === 'END_USER').length

  // Action menu state for DataGrid
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [menuUser, setMenuUser] = useState<UserData | null>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, userData: UserData) => {
    setMenuAnchorEl(event.currentTarget)
    setMenuUser(userData)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
    setMenuUser(null)
  }

  const getRoleChipColor = (role: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (role) {
      case 'TENANT_ADMIN': return 'secondary'
      case 'IT_ADMIN': return 'primary'
      case 'SALES_ADMIN': return 'success'
      case 'RETAIL_ADMIN': return 'warning'
      case 'MAINTENANCE_ADMIN': return 'warning'
      case 'PROJECTS_ADMIN': return 'info'
      case 'END_USER': return 'default'
      default: return 'default'
    }
  }

  // DataGrid column definitions
  const userColumns: GridColDef[] = useMemo(() => [
    {
      field: 'user',
      headerName: 'User',
      flex: 1.2,
      minWidth: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<UserData>) => {
        const userData = params.row
        const initials = userData.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || userData.email.slice(0, 2).toUpperCase()
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 1, width: '100%' }}>
            <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32, fontSize: '0.75rem' }}>
              {initials}
            </Avatar>
            <Box sx={{ textAlign: 'left', overflow: 'hidden' }}>
              <p className="font-medium text-gray-900 text-sm truncate">{userData.name || 'No Name'}</p>
              <p className="text-xs text-gray-500 truncate">{userData.email}</p>
            </Box>
          </Box>
        )
      },
    },
    {
      field: 'role',
      headerName: 'Role',
      flex: 0.6,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<UserData>) => (
        <Chip
          label={formatRole(params.row.role)}
          size="small"
          color={getRoleChipColor(params.row.role)}
          sx={{ fontWeight: 500, fontSize: '0.7rem' }}
        />
      ),
    },
    {
      field: 'branches',
      headerName: 'Branches',
      flex: 0.8,
      minWidth: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<UserData>) => {
        const userData = params.row
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
            {userData.branches && userData.branches.length > 0 ? (
              <>
                {userData.branches.slice(0, 1).map(ub => (
                  <Chip
                    key={ub.branch.id}
                    label={ub.branch.name}
                    size="small"
                    variant="outlined"
                    color={ub.branch.isHeadOffice ? 'primary' : 'default'}
                    sx={{ fontSize: '0.65rem', height: 22 }}
                  />
                ))}
                {userData.branches.length > 1 && (
                  <Chip
                    label={`+${userData.branches.length - 1}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 22 }}
                  />
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">No branches</span>
            )}
          </Box>
        )
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.6,
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<UserData>) => {
        const status = params.row.status || (params.row.isActive ? 'ACTIVE' : 'DEACTIVATED')
        const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
          'ACTIVE': { label: 'Active', color: 'success' },
          'PENDING_APPROVAL': { label: 'Pending', color: 'warning' },
          'APPROVED_EMAIL_PENDING': { label: 'Awaiting Setup', color: 'info' },
          'SUSPENDED': { label: 'Suspended', color: 'error' },
          'DEACTIVATED': { label: 'Inactive', color: 'error' }
        }
        const config = statusConfig[status] || { label: status, color: 'default' }
        return (
          <Chip
            label={config.label}
            size="small"
            color={config.color}
            sx={{ fontWeight: 500, fontSize: '0.7rem' }}
          />
        )
      },
    },
    {
      field: 'createdAt',
      headerName: 'Joined',
      flex: 0.5,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<UserData>) => (
        <span className="text-xs text-gray-500">
          {new Date(params.row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<UserData>) => (
        <Tooltip title="More options">
          <IconButton
            size="small"
            onClick={(e) => handleMenuOpen(e, params.row)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5">
        {/* Action Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => { if (menuUser) handleEditUser(menuUser); handleMenuClose(); }}>
            <ListItemIcon><Edit className="h-4 w-4" /></ListItemIcon>
            <ListItemText>Edit User</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { if (menuUser) handleSendActivationEmail(menuUser); handleMenuClose(); }}>
            <ListItemIcon><Mail className="h-4 w-4 text-blue-500" /></ListItemIcon>
            <ListItemText>Send Activation Email</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { if (menuUser) handleResetPassword(menuUser); handleMenuClose(); }}>
            <ListItemIcon><Key className="h-4 w-4" /></ListItemIcon>
            <ListItemText>Reset Password</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { if (menuUser) handleToggleActive(menuUser); handleMenuClose(); }}>
            {menuUser?.isActive ? (
              <>
                <ListItemIcon><XCircle className="h-4 w-4 text-red-500" /></ListItemIcon>
                <ListItemText sx={{ color: 'error.main' }}>Deactivate</ListItemText>
              </>
            ) : (
              <>
                <ListItemIcon><CheckCircle className="h-4 w-4 text-green-500" /></ListItemIcon>
                <ListItemText sx={{ color: 'success.main' }}>Activate</ListItemText>
              </>
            )}
          </MenuItem>
        </Menu>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600">Manage users and department admins</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowInviteDialog(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Invite User
            </Button>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
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
                
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
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
                            <p className="text-xs text-gray-500">{role.description}</p>
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
                      <p className="text-sm text-gray-500">No branches available. Create branches first.</p>
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
                                <p className="text-xs text-blue-600 mt-0.5">Auto-selects all branches</p>
                              )}
                            </Label>
                          </div>
                        )
                      })
                    )}
                  </div>
                  {newUser.branchIds.length > 0 && (
                    <p className="text-xs text-gray-600">{newUser.branchIds.length} branch(es) selected</p>
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
          </div>
        </div>

        {/* Invite User Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500 mb-4">
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">End Users</CardTitle>
              <User className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{endUserCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => u.isActive).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="pt-6">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || roleFilter !== 'all' ? 'No users found' : 'No users yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || roleFilter !== 'all' ? 'Try a different search or filter' : 'Add your first user to get started'}
                </p>
                {!searchQuery && roleFilter === 'all' && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                )}
              </div>
            ) : (
              <Box sx={{ width: '100%' }}>
                <ScrollableDataGrid
                  rows={filteredUsers}
                  columns={userColumns}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 10, page: 0 },
                    },
                    sorting: {
                      sortModel: [{ field: 'createdAt', sort: 'desc' }],
                    },
                  }}
                  pageSizeOptions={[5, 10, 25, 50]}
                  disableRowSelectionOnClick
                  autoHeight
                />
              </Box>
            )}
          </CardContent>
        </Card>

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
                <p className="text-xs text-gray-500 mb-2">
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
                  <p className="text-xs text-red-500 mt-1">At least one branch required</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={editUser.isActive}
                  onChange={(e) => setEditUser({...editUser, isActive: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300"
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
              <p className="text-gray-600">
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
    </div>
  )
}
