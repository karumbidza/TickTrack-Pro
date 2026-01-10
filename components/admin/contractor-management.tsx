'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { ScrollableDataGrid } from '@/components/ui/scrollable-data-grid'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MuiDivider from '@mui/material/Divider'
import { 
  Plus,
  User,
  Star,
  Phone,
  Mail,
  Wrench,
  CheckCircle,
  XCircle,
  Edit,
  Clock,
  Shield,
  Heart,
  ClipboardCheck,
  Copy,
  Key,
  Search,
  MoreHorizontal,
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
        
        // Show the registration link for copying
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

  // Categories are now managed in the Edit Contractor dialog

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
      // Update contractor details
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

      // Update categories
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
      flex: 1.2,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<Contractor>) => {
        const contractor = params.row
        const initials = contractor.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C'
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <Box 
              sx={{ 
                width: 32, 
                height: 32, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'primary.main'
              }}
            >
              {initials}
            </Box>
            <Box sx={{ overflow: 'hidden' }}>
              <p className="font-medium text-gray-900 text-sm leading-tight truncate">{contractor.name}</p>
              <p className="text-xs text-gray-500 truncate">{contractor.email}</p>
            </Box>
          </Box>
        )
      },
    },
    {
      field: 'categories',
      headerName: 'Service Categories',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<Contractor>) => {
        const contractor = params.row
        const cats = contractor.categories || []
        const maxShow = 2
        
        if (cats.length === 0) {
          return (
            <span className="text-gray-400 text-xs italic">No categories</span>
          )
        }
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap', overflow: 'hidden' }}>
            {cats.slice(0, maxShow).map((cat, index) => (
              <Chip
                key={index}
                label={cat.name}
                size="small"
                sx={{ 
                  fontSize: '0.7rem', 
                  height: 22,
                  borderRadius: '11px',
                  bgcolor: cat.color ? `${cat.color}20` : 'grey.100',
                  color: cat.color || 'inherit',
                  border: cat.color ? `1px solid ${cat.color}` : '1px solid #e0e0e0',
                  opacity: cat.isAvailable ? 1 : 0.5,
                  '& .MuiChip-label': { px: 1 }
                }}
              />
            ))}
            {cats.length > maxShow && (
              <Tooltip title={cats.slice(maxShow).map(c => c.name).join(', ')}>
                <Chip
                  label={`+${cats.length - maxShow}`}
                  size="small"
                  sx={{ 
                    fontSize: '0.7rem', 
                    height: 22,
                    borderRadius: '11px',
                    bgcolor: 'grey.100',
                    '& .MuiChip-label': { px: 0.75 }
                  }}
                />
              </Tooltip>
            )}
          </Box>
        )
      },
    },
    {
      field: 'rating',
      headerName: 'Rating',
      flex: 0.5,
      minWidth: 70,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Contractor>) => {
        const contractor = params.row
        const stats = contractor.ratingStats
        const hasRatings = stats && stats.totalRatings > 0
        const rating = contractor.rating && contractor.rating > 0 ? contractor.rating.toFixed(1) : '-'
        
        return (
          <Tooltip
            title={
              hasRatings ? (
                <Box sx={{ p: 0.5 }}>
                  <Box sx={{ fontWeight: 600, mb: 1, borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 0.5 }}>
                    Rating Breakdown ({stats.totalRatings} review{stats.totalRatings > 1 ? 's' : ''})
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, fontSize: '0.8rem' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <span>Punctuality:</span>
                      <span style={{ fontWeight: 600 }}>{stats.avgPunctuality}/5</span>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <span>Customer Service:</span>
                      <span style={{ fontWeight: 600 }}>{stats.avgCustomerService}/5</span>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <span>Workmanship:</span>
                      <span style={{ fontWeight: 600 }}>{stats.avgWorkmanship}/5</span>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 0.5, pt: 0.5, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                      <span>PPE Compliance:</span>
                      <span style={{ fontWeight: 600 }}>{stats.ppeComplianceRate}%</span>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <span>Procedures:</span>
                      <span style={{ fontWeight: 600 }}>{stats.procedureComplianceRate}%</span>
                    </Box>
                  </Box>
                </Box>
              ) : 'No ratings yet'
            }
            arrow
            placement="left"
          >
            <Box
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer',
                py: 0.5,
                px: 1.5,
                borderRadius: 1,
                bgcolor: hasRatings ? 'primary.50' : 'grey.100',
                '&:hover': { bgcolor: hasRatings ? 'primary.100' : 'grey.200' }
              }}
              onClick={() => handleViewRatings(contractor)}
            >
              <span className={`text-lg font-bold ${hasRatings ? 'text-primary-600' : 'text-gray-400'}`}>
                {rating}
              </span>
              {hasRatings && (
                <span className="text-xs text-gray-500 ml-1">({stats.totalRatings})</span>
              )}
            </Box>
          </Tooltip>
        )
      },
    },
    {
      field: 'hourlyRate',
      headerName: 'Rate',
      flex: 0.4,
      minWidth: 60,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Contractor>) => (
        params.row.hourlyRate ? (
          <span className="font-semibold text-gray-700 text-xs">${params.row.hourlyRate}/hr</span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.5,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Contractor>) => (
        <Chip
          label={params.row.isAvailable ? 'Available' : 'Busy'}
          size="small"
          color={params.row.isAvailable ? 'success' : 'warning'}
          sx={{ 
            fontWeight: 600,
            fontSize: '0.7rem',
            height: 22
          }}
        />
      ),
    },
    {
      field: 'totalJobs',
      headerName: 'Jobs',
      flex: 0.3,
      minWidth: 50,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Contractor>) => (
        <span className="font-semibold text-gray-700 text-sm">{params.row.totalJobs || 0}</span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 40,
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
    <div className="p-5 space-y-5">
        {/* Action Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => { if (menuContractor) handleEditContractor(menuContractor); handleMenuClose(); }}>
            <ListItemIcon><Edit className="h-4 w-4" /></ListItemIcon>
            <ListItemText>Edit Contractor</ListItemText>
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
                  {generatedLink ? (
                    // Show the generated link for copying
                    <>
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-green-800">Invitation Sent Successfully!</p>
                          <p className="text-sm text-green-600">Email sent to {inviteEmail}</p>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Registration Link</Label>
                        <p className="text-xs text-gray-500 mb-2">
                          You can also share this link directly with the contractor
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={generatedLink}
                            readOnly
                            className="text-sm font-mono bg-gray-50"
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
                    // Show the invite form
                    <>
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
                    </>
                  )}
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

                <p className="text-sm text-gray-500">
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
                <ScrollableDataGrid
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
                  rowHeight={60}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell': {
                      borderBottom: '1px solid #f0f0f0',
                      py: 1,
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      bgcolor: '#fafafa',
                      borderBottom: '2px solid #e5e5e5',
                    },
                    '& .MuiDataGrid-row:hover': {
                      bgcolor: '#f8fafc',
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

              {/* Service Categories Section */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4" />
                  Service Categories
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Select the categories this contractor can be assigned to
                </p>
                <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                  {allCategories.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No categories available
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {allCategories.map((category) => (
                        <div 
                          key={category.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            selectedCategoryIds.includes(category.id) 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
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
                              borderColor: selectedCategoryIds.includes(category.id) ? '#3b82f6' : '#d1d5db',
                              backgroundColor: selectedCategoryIds.includes(category.id) ? '#3b82f6' : 'transparent'
                            }}
                          >
                            {selectedCategoryIds.includes(category.id) && (
                              <CheckCircle className="h-3 w-3 text-white" />
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
                <p className="text-xs text-gray-500 mt-1">
                  {selectedCategoryIds.length} of {allCategories.length} selected
                </p>
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
