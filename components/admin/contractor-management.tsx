'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MuiDivider from '@mui/material/Divider'
import Rating from '@mui/material/Rating'
import { 
  Plus,
  User,
  Star,
  Phone,
  Mail,
  Wrench,
  DollarSign,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Clock,
  Shield,
  Heart,
  ClipboardCheck,
  Key,
  Search,
  MoreHorizontal,
  Trash2,
  Send,
  FileText,
  UserPlus
} from 'lucide-react'
import { toast } from 'sonner'
import { ContractorKYCManagement } from './contractor-kyc-management'

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

interface Contractor {
  id: string
  email: string
  name: string
  phone?: string
  secondaryPhone?: string
  isActive: boolean
  specializations?: string[]
  rating?: number
  totalJobs?: number
  hourlyRate?: number | null
  isAvailable: boolean
  contractorProfileId?: string
}

interface ContractorManagementProps {
  user: any
}

export function ContractorManagement({ user }: ContractorManagementProps) {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [showRatingsModal, setShowRatingsModal] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [contractorRatings, setContractorRatings] = useState<ContractorRating[]>([])
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const [newContractor, setNewContractor] = useState({
    name: '',
    email: '',
    phone: '',
    secondaryPhone: '',
    specialties: '',
    hourlyRate: ''
  })
  const [editContractor, setEditContractor] = useState({
    name: '',
    email: '',
    phone: '',
    secondaryPhone: '',
    specialties: '',
    hourlyRate: '',
    isActive: true
  })
  const [newPassword, setNewPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCompanyName, setInviteCompanyName] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    fetchContractors()
  }, [])

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
        setShowInviteDialog(false)
        setInviteEmail('')
        setInviteCompanyName('')
        
        // Show the registration link (for testing purposes)
        if (data.registrationUrl) {
          console.log('Registration URL:', data.registrationUrl)
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
      specialties: contractor.specializations?.join(', ') || '',
      hourlyRate: contractor.hourlyRate?.toString() || '',
      isActive: contractor.isActive
    })
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
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
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

    // Validate phone number if provided
    if (newContractor.phone && !newContractor.phone.match(/^\+?[0-9\s\-()]+$/)) {
      toast.error('Please enter a valid phone number')
      return
    }

    try {
      const specialtiesArray = newContractor.specialties
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      const response = await fetch('/api/admin/contractors/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContractor.name,
          email: newContractor.email,
          phone: newContractor.phone || undefined,
          secondaryPhone: newContractor.secondaryPhone || undefined,
          specialties: specialtiesArray,
          hourlyRate: newContractor.hourlyRate
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Contractor created! Default password: ${data.defaultPassword}`)
        setShowCreateDialog(false)
        setNewContractor({ name: '', email: '', phone: '', secondaryPhone: '', specialties: '', hourlyRate: '' })
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
      const specialtiesArray = editContractor.specialties
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      const response = await fetch(`/api/admin/contractors/${selectedContractor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editContractor.name,
          email: editContractor.email,
          phone: editContractor.phone || null,
          secondaryPhone: editContractor.secondaryPhone || null,
          specialties: specialtiesArray,
          hourlyRate: editContractor.hourlyRate ? parseFloat(editContractor.hourlyRate) : null,
          isActive: editContractor.isActive
        })
      })

      if (response.ok) {
        toast.success('Contractor updated successfully')
        setShowEditDialog(false)
        fetchContractors()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update contractor')
      }
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

  // Filter contractors based on search query
  const filteredContractors = contractors.filter(contractor => {
    const query = searchQuery.toLowerCase()
    return (
      contractor.name?.toLowerCase().includes(query) ||
      contractor.email?.toLowerCase().includes(query) ||
      contractor.specializations?.some(s => s.toLowerCase().includes(query))
    )
  })

  // Action menu state for DataGrid
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [menuContractor, setMenuContractor] = useState<Contractor | null>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, contractor: Contractor) => {
    setMenuAnchorEl(event.currentTarget)
    setMenuContractor(contractor)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
    setMenuContractor(null)
  }

  // DataGrid column definitions
  const contractorColumns: GridColDef[] = useMemo(() => [
    {
      field: 'contractor',
      headerName: 'Contractor',
      flex: 1,
      minWidth: 250,
      renderCell: (params: GridRenderCellParams<Contractor>) => {
        const contractor = params.row
        const initials = contractor.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C'
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.light', width: 40, height: 40 }}>
              {initials}
            </Avatar>
            <Box>
              <p className="font-medium text-gray-900">{contractor.name}</p>
              <p className="text-sm text-gray-500">{contractor.email}</p>
            </Box>
          </Box>
        )
      },
    },
    {
      field: 'specializations',
      headerName: 'Specialties',
      width: 200,
      renderCell: (params: GridRenderCellParams<Contractor>) => {
        const contractor = params.row
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {contractor.specializations?.slice(0, 2).map((specialty, index) => (
              <Chip
                key={index}
                label={specialty}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 24 }}
              />
            ))}
            {(contractor.specializations?.length || 0) > 2 && (
              <Chip
                label={`+${(contractor.specializations?.length || 0) - 2}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 24 }}
              />
            )}
          </Box>
        )
      },
    },
    {
      field: 'rating',
      headerName: 'Rating',
      width: 130,
      renderCell: (params: GridRenderCellParams<Contractor>) => {
        const contractor = params.row
        return (
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
            onClick={() => handleViewRatings(contractor)}
          >
            <Rating
              value={contractor.rating || 0}
              precision={0.1}
              size="small"
              readOnly
            />
            <span className="text-sm font-medium">
              {contractor.rating && contractor.rating > 0 ? contractor.rating.toFixed(1) : 'N/A'}
            </span>
          </Box>
        )
      },
    },
    {
      field: 'hourlyRate',
      headerName: 'Rate',
      width: 100,
      renderCell: (params: GridRenderCellParams<Contractor>) => (
        params.row.hourlyRate ? (
          <span className="font-medium">${params.row.hourlyRate}/hr</span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams<Contractor>) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            label={params.row.isAvailable ? 'Available' : 'Busy'}
            size="small"
            color={params.row.isAvailable ? 'success' : 'warning'}
            sx={{ fontWeight: 500 }}
          />
          {!params.row.isActive && (
            <Chip
              label="Inactive"
              size="small"
              color="error"
              sx={{ fontWeight: 500 }}
            />
          )}
        </Box>
      ),
    },
    {
      field: 'totalJobs',
      headerName: 'Jobs',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Contractor>) => (
        <span className="font-medium">{params.row.totalJobs || 0}</span>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Contractor>) => (
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
          <p className="text-gray-600">Loading contractors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
        {/* Action Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => { if (menuContractor) handleViewRatings(menuContractor); handleMenuClose(); }}>
            <ListItemIcon><Star className="h-4 w-4" /></ListItemIcon>
            <ListItemText>View Ratings</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { if (menuContractor) handleEditContractor(menuContractor); handleMenuClose(); }}>
            <ListItemIcon><Edit className="h-4 w-4" /></ListItemIcon>
            <ListItemText>Edit Details</ListItemText>
          </MenuItem>
          <MuiDivider />
          <MenuItem onClick={() => { if (menuContractor) handleResetPassword(menuContractor); handleMenuClose(); }}>
            <ListItemIcon><Key className="h-4 w-4" /></ListItemIcon>
            <ListItemText>Reset Password</ListItemText>
          </MenuItem>
          <MuiDivider />
          <MenuItem onClick={() => { if (menuContractor) handleToggleActive(menuContractor); handleMenuClose(); }}>
            {menuContractor?.isActive ? (
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
            <h1 className="text-2xl font-bold text-gray-900">Contractors</h1>
            <p className="text-gray-600">Manage contractor accounts and invitations</p>
          </div>
          
          <div className="flex space-x-3">
            {/* Invite Contractor Button */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Invite Contractor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite Contractor for KYC Registration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
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
                    <p className="text-xs text-gray-500 mt-1">
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
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Contractor Button (Quick Add) */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Quick Add
                </Button>
              </DialogTrigger>
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
                    <p className="text-xs text-gray-500 mt-1">International format (e.g., +263...)</p>
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
                
                <div>
                  <Label htmlFor="specialties">Specialties (comma-separated)</Label>
                  <Textarea
                    id="specialties"
                    placeholder="e.g., Plumbing, Electrical, HVAC"
                    value={newContractor.specialties}
                    onChange={(e) => setNewContractor({...newContractor, specialties: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate (Optional)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    placeholder="0.00"
                    value={newContractor.hourlyRate}
                    onChange={(e) => setNewContractor({...newContractor, hourlyRate: e.target.value})}
                  />
                </div>

                <p className="text-sm text-gray-500">
                  A default password will be generated and shown after creation.
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
          </div>
        </div>

        {/* Tabs for Active Contractors and KYC Applications */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Active Contractors
            </TabsTrigger>
            <TabsTrigger value="kyc" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              KYC Applications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractors.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractors.filter(c => c.isAvailable).length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractors.filter(c => c.isActive).length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contractors.filter(c => c.rating && c.rating > 0).length > 0
                  ? (contractors.reduce((sum, c) => sum + (c.rating || 0), 0) / contractors.filter(c => c.rating && c.rating > 0).length).toFixed(1)
                  : 'N/A'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contractors by name, email, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contractors Table */}
        <Card>
          <CardContent className="pt-6">
            {filteredContractors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No contractors found' : 'No contractors yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery ? 'Try a different search term' : 'Add your first contractor to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contractor
                  </Button>
                )}
              </div>
            ) : (
              <Box sx={{ width: '100%' }}>
                <DataGrid
                  rows={filteredContractors}
                  columns={contractorColumns}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 10, page: 0 },
                    },
                    sorting: {
                      sortModel: [{ field: 'rating', sort: 'desc' }],
                    },
                  }}
                  pageSizeOptions={[5, 10, 25, 50]}
                  disableRowSelectionOnClick
                  autoHeight
                  sx={{
                    '& .MuiDataGrid-cell': {
                      borderColor: '#f3f4f6',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                    },
                    '& .MuiDataGrid-row:hover': {
                      backgroundColor: '#f9fafb',
                    },
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="kyc">
            <ContractorKYCManagement />
          </TabsContent>
        </Tabs>

        {/* Edit Contractor Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Contractor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                  <p className="text-xs text-gray-500 mt-1">International format</p>
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
              
              <div>
                <Label htmlFor="edit-specialties">Specialties (comma-separated)</Label>
                <Textarea
                  id="edit-specialties"
                  value={editContractor.specialties}
                  onChange={(e) => setEditContractor({...editContractor, specialties: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-hourlyRate">Hourly Rate</Label>
                <Input
                  id="edit-hourlyRate"
                  type="number"
                  value={editContractor.hourlyRate}
                  onChange={(e) => setEditContractor({...editContractor, hourlyRate: e.target.value})}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={editContractor.isActive}
                  onChange={(e) => setEditContractor({...editContractor, isActive: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="edit-isActive">Account Active</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
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
              <p className="text-gray-600">
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-4xl font-bold text-gray-900">
                        {selectedContractor.rating?.toFixed(1) || 'N/A'}
                      </div>
                      <div>
                        {renderStars(Math.round(selectedContractor.rating || 0))}
                        <p className="text-sm text-gray-500 mt-1">
                          Based on {contractorRatings.length} review{contractorRatings.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedContractor.totalJobs || 0}
                      </div>
                      <p className="text-sm text-gray-500">Total Jobs</p>
                    </div>
                  </div>

                  {/* Average Ratings Breakdown */}
                  {contractorRatings.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <Clock className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                        <div className="text-lg font-semibold">
                          {(contractorRatings.reduce((sum, r) => sum + r.punctualityRating, 0) / contractorRatings.length).toFixed(1)}
                        </div>
                        <p className="text-xs text-gray-500">Punctuality</p>
                      </div>
                      <div className="text-center">
                        <Heart className="h-5 w-5 mx-auto text-pink-500 mb-1" />
                        <div className="text-lg font-semibold">
                          {(contractorRatings.reduce((sum, r) => sum + r.customerServiceRating, 0) / contractorRatings.length).toFixed(1)}
                        </div>
                        <p className="text-xs text-gray-500">Service</p>
                      </div>
                      <div className="text-center">
                        <Wrench className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                        <div className="text-lg font-semibold">
                          {(contractorRatings.reduce((sum, r) => sum + r.workmanshipRating, 0) / contractorRatings.length).toFixed(1)}
                        </div>
                        <p className="text-xs text-gray-500">Workmanship</p>
                      </div>
                      <div className="text-center">
                        <Shield className="h-5 w-5 mx-auto text-green-500 mb-1" />
                        <div className="text-lg font-semibold">
                          {Math.round((contractorRatings.filter(r => r.ppeCompliant).length / contractorRatings.length) * 100)}%
                        </div>
                        <p className="text-xs text-gray-500">PPE Compliant</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Individual Ratings */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Individual Reviews</h4>
                  <ScrollArea className="h-[300px]">
                    {ratingsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Loading ratings...</p>
                      </div>
                    ) : contractorRatings.length === 0 ? (
                      <div className="text-center py-8">
                        <Star className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No ratings yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {contractorRatings.map((rating) => (
                          <div key={rating.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {rating.ticket?.title || 'Job'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {rating.ticket?.ticketNumber} • {new Date(rating.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1">
                                {renderStars(rating.overallRating)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span>{rating.punctualityRating}/5</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Heart className="h-3 w-3 text-gray-400" />
                                <span>{rating.customerServiceRating}/5</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Wrench className="h-3 w-3 text-gray-400" />
                                <span>{rating.workmanshipRating}/5</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                {rating.ppeCompliant ? (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                                <span>PPE</span>
                              </div>
                            </div>

                            {rating.comment && (
                              <p className="text-sm text-gray-600 italic">"{rating.comment}"</p>
                            )}
                            
                            {rating.user && (
                              <p className="text-xs text-gray-400 mt-2">
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
