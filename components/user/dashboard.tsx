'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog'
import { TicketDetailModal } from '@/components/tickets/ticket-detail-modal'
import { RatingModal } from '@/components/tickets/rating-modal'
import { AssetRegister } from '@/components/assets/asset-register'
import { TicketChat } from '@/components/tickets/ticket-chat'
import { MediaViewer } from '@/components/ui/media-viewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { calculateSLAInfo, getSLAChipColor } from '@/lib/sla-utils'
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { ScrollableDataGrid } from '@/components/ui/scrollable-data-grid'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { 
  Plus,
  Ticket,
  Clock,
  CheckCircle,
  MessageSquare,
  Star,
  Filter,
  Search,
  X,
  Calendar,
  Wrench,
  Package,
  Eye,
  User,
  Phone,
  MapPin,
  AlertCircle,
  XCircle,
  AlertTriangle,
  Paperclip,
  FileText,
  Pencil,
  Video,
  Upload,
  Image as ImageIcon,
  Timer,
  RefreshCw
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface User {
  id: string
  email: string
  name?: string | null
  role: string
  tenantId: string | null
}

interface TicketSummary {
  id: string
  title: string
  description: string
  status: string
  type: string
  priority: string
  category?: {
    id: string
    name: string
    color: string
  }
  asset?: {
    id: string
    name: string
    assetNumber: string
    location?: string
  }
  assignedTo?: {
    id: string
    name: string
    email: string
    phone?: string
    contractorProfile?: {
      id: string
      specialties: string[]
      rating: number
    }
  }
  attachments?: {
    id: string
    filename: string
    originalName: string
    url: string
    mimeType: string
  }[]
  // Work description workflow fields
  workDescriptionRequestedAt?: string
  workDescription?: string
  workDescriptionSubmittedAt?: string
  workDescriptionApproved?: boolean
  workDescriptionApprovedAt?: string
  workDescriptionRejectionReason?: string
  // SLA tracking fields
  assignedAt?: string
  contractorAcceptedAt?: string
  onSiteAt?: string
  completedAt?: string
  responseDeadline?: string
  resolutionDeadline?: string
  createdAt: string
  updatedAt: string
  location?: string
  branch?: {
    id: string
    name: string
  }
  _count: {
    messages: number
  }
}

interface UserDashboardProps {
  user: User
}

export function UserDashboard({ user }: UserDashboardProps) {
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [filteredTickets, setFilteredTickets] = useState<TicketSummary[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketSummary | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    priority: '',
    type: '',
    categoryId: '',
    location: '',
    assetId: ''
  })
  const [editCategories, setEditCategories] = useState<{id: string, name: string, color: string}[]>([])
  const [editAssets, setEditAssets] = useState<{id: string, name: string, assetNumber: string, categoryId?: string, category?: {id: string, name: string, color?: string}}[]>([])
  const [editMediaFiles, setEditMediaFiles] = useState<File[]>([])
  const [existingAttachments, setExistingAttachments] = useState<{id: string, filename: string, originalName: string, url: string, mimeType: string}[]>([])
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('tickets')
  
  // Work description approval state
  const [showWorkApprovalDialog, setShowWorkApprovalDialog] = useState(false)
  const [workApprovalLoading, setWorkApprovalLoading] = useState(false)
  const [workRejectionReason, setWorkRejectionReason] = useState('')
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('all')

  // Auto-refresh interval (30 seconds)
  const [refreshInterval] = useState(30)

  useEffect(() => {
    fetchUserTickets()
  }, [])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(async () => {
      // Don't refresh if any modal is open
      if (selectedTicket || showCreateDialog || showEditDialog || showCancelDialog) return
      
      setIsRefreshing(true)
      try {
        const response = await fetch('/api/tickets')
        const data = await response.json()
        setTickets(data.tickets || [])
        setLastRefresh(new Date())
      } catch (error) {
        console.error('Auto-refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }, refreshInterval * 1000)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, selectedTicket, showCreateDialog, showEditDialog, showCancelDialog])

  useEffect(() => {
    applyFilters()
  }, [tickets, searchTerm, statusFilter, priorityFilter, typeFilter, dateFilter, assignedFilter])

  const fetchUserTickets = async () => {
    try {
      const response = await fetch('/api/tickets')
      const data = await response.json()
      setTickets(data.tickets)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = tickets

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.type === typeFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter(ticket => new Date(ticket.createdAt) >= filterDate)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          filtered = filtered.filter(ticket => new Date(ticket.createdAt) >= filterDate)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          filtered = filtered.filter(ticket => new Date(ticket.createdAt) >= filterDate)
          break
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3)
          filtered = filtered.filter(ticket => new Date(ticket.createdAt) >= filterDate)
          break
      }
    }

    // Assigned filter
    if (assignedFilter === 'assigned') {
      filtered = filtered.filter(ticket => ticket.assignedTo)
    } else if (assignedFilter === 'unassigned') {
      filtered = filtered.filter(ticket => !ticket.assignedTo)
    }

    setFilteredTickets(filtered)
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setTypeFilter('all')
    setDateFilter('all')
    setAssignedFilter('all')
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (searchTerm) count++
    if (statusFilter !== 'all') count++
    if (priorityFilter !== 'all') count++
    if (typeFilter !== 'all') count++
    if (dateFilter !== 'all') count++
    if (assignedFilter !== 'all') count++
    return count
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-800',
      ASSIGNED: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
      ON_SITE: 'bg-purple-100 text-purple-800',
      AWAITING_DESCRIPTION: 'bg-amber-100 text-amber-800',
      AWAITING_WORK_APPROVAL: 'bg-indigo-100 text-indigo-800',
      AWAITING_APPROVAL: 'bg-indigo-100 text-indigo-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      case 'IN_PROGRESS':
      case 'ON_SITE':
        return <Clock className="h-4 w-4" />
      default:
        return <Ticket className="h-4 w-4" />
    }
  }

  const handleViewTicket = (ticket: TicketSummary) => {
    setSelectedTicket(ticket)
    setShowViewModal(true)
  }

  const handleCompleteAndRate = () => {
    setShowViewModal(false)
    setShowRatingModal(true)
  }

  const handleRatingSubmitted = () => {
    setShowRatingModal(false)
    setSelectedTicket(null)
    fetchUserTickets()
  }

  const handleUpdateTicketStatus = async (newStatus: string) => {
    if (!selectedTicket) return
    
    setStatusUpdateLoading(true)
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const statusMessages: Record<string, string> = {
          'ON_SITE': 'Contractor marked as on-site',
          'COMPLETED': 'Job marked as completed'
        }
        alert(statusMessages[newStatus] || 'Status updated')
        setShowViewModal(false)
        setSelectedTicket(null)
        fetchUserTickets()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status')
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  const handleCancelTicket = async () => {
    if (!selectedTicket) return
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation')
      return
    }

    setCancelLoading(true)
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || 'Ticket cancelled successfully')
        setShowCancelDialog(false)
        setShowViewModal(false)
        setCancelReason('')
        setSelectedTicket(null)
        fetchUserTickets()
      } else {
        alert(data.error || 'Failed to cancel ticket')
      }
    } catch (error) {
      console.error('Failed to cancel ticket:', error)
      alert('Failed to cancel ticket')
    } finally {
      setCancelLoading(false)
    }
  }

  // Handle work description approval/rejection
  const handleWorkApproval = async (approved: boolean) => {
    if (!selectedTicket) return
    
    if (!approved && !workRejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setWorkApprovalLoading(true)
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/approve-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approved,
          rejectionReason: workRejectionReason.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || (approved ? 'Work approved successfully' : 'Work description rejected'))
        setShowWorkApprovalDialog(false)
        setWorkRejectionReason('')
        fetchUserTickets()
        // Update selected ticket
        setSelectedTicket(data.ticket)
      } else {
        alert(data.error || 'Failed to process approval')
      }
    } catch (error) {
      console.error('Failed to process work approval:', error)
      alert('Failed to process approval')
    } finally {
      setWorkApprovalLoading(false)
    }
  }

  // Check if user can cancel ticket (only when OPEN or PROCESSING without contractor assigned)
  const canCancelTicket = (ticket: TicketSummary) => {
    return ticket.status === 'OPEN' || (ticket.status === 'PROCESSING' && !ticket.assignedTo)
  }

  // Check if user can edit ticket (same logic as cancel - only when not yet assigned)
  const canEditTicket = (ticket: TicketSummary) => {
    return ticket.status === 'OPEN' || (ticket.status === 'PROCESSING' && !ticket.assignedTo)
  }

  // Fetch categories for edit dialog
  const fetchEditCategories = async () => {
    try {
      const response = await fetch('/api/asset-categories')
      const data = await response.json()
      setEditCategories(data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  // Fetch assets for edit dialog
  const fetchEditAssets = async () => {
    try {
      const response = await fetch('/api/assets')
      const data = await response.json()
      setEditAssets(data.assets || [])
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    }
  }

  // Open edit dialog with current ticket data
  const openEditDialog = (ticket: TicketSummary) => {
    setEditFormData({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      type: ticket.type,
      categoryId: ticket.category?.id || '',
      location: ticket.location || '',
      assetId: ticket.asset?.id || ''
    })
    setExistingAttachments(ticket.attachments || [])
    setAttachmentsToDelete([])
    setEditMediaFiles([])
    fetchEditCategories()
    fetchEditAssets()
    setShowEditDialog(true)
  }

  // Handle edit ticket submission
  const handleEditTicket = async () => {
    if (!selectedTicket) return

    if (!editFormData.title.trim()) {
      alert('Please enter a ticket title')
      return
    }

    setEditLoading(true)
    try {
      // Create FormData to handle file uploads
      const formData = new FormData()
      formData.append('title', editFormData.title.trim())
      formData.append('description', editFormData.description.trim())
      formData.append('priority', editFormData.priority)
      formData.append('type', editFormData.type)
      if (editFormData.categoryId) {
        formData.append('categoryId', editFormData.categoryId)
      }
      if (editFormData.location) {
        formData.append('location', editFormData.location.trim())
      }
      // Include assetId (can be empty to clear asset)
      formData.append('assetId', editFormData.assetId || '')
      
      // Add attachments to delete
      if (attachmentsToDelete.length > 0) {
        formData.append('deleteAttachments', JSON.stringify(attachmentsToDelete))
      }
      
      // Add new files
      editMediaFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        alert('Ticket updated successfully')
        setShowEditDialog(false)
        setEditMediaFiles([])
        setAttachmentsToDelete([])
        fetchUserTickets()
        // Update selected ticket with new data
        setSelectedTicket({ ...selectedTicket, ...data.ticket })
      } else {
        alert(data.error || 'Failed to update ticket')
      }
    } catch (error) {
      console.error('Failed to update ticket:', error)
      alert('Failed to update ticket')
    } finally {
      setEditLoading(false)
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ')
  }

  const stats = {
    total: filteredTickets.length,
    open: filteredTickets.filter(t => ['OPEN', 'ASSIGNED'].includes(t.status)).length,
    inProgress: filteredTickets.filter(t => ['IN_PROGRESS', 'ON_SITE'].includes(t.status)).length,
    completed: filteredTickets.filter(t => ['COMPLETED', 'CLOSED'].includes(t.status)).length
  }

  const getStatusChipColor = (status: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (status) {
      case 'OPEN': return 'primary'
      case 'ASSIGNED': return 'warning'
      case 'IN_PROGRESS': return 'warning'
      case 'ON_SITE': return 'secondary'
      case 'AWAITING_DESCRIPTION': return 'warning'
      case 'AWAITING_WORK_APPROVAL': return 'info'
      case 'AWAITING_APPROVAL': return 'info'
      case 'COMPLETED': return 'success'
      case 'CLOSED': return 'default'
      case 'CANCELLED': return 'error'
      default: return 'default'
    }
  }

  const getPriorityChipColor = (priority: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (priority) {
      case 'LOW': return 'success'
      case 'MEDIUM': return 'warning'
      case 'HIGH': return 'error'
      case 'CRITICAL': return 'error'
      default: return 'default'
    }
  }

  // DataGrid column definitions
  const ticketColumns: GridColDef[] = useMemo(() => [
    {
      field: 'ticket',
      headerName: 'Ticket',
      flex: 1.2,
      minWidth: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <Box sx={{ py: 1, textAlign: 'center', width: '100%' }}>
          <p className="font-medium text-gray-900 text-sm truncate">{params.row.title}</p>
        </Box>
      ),
    },
    {
      field: 'ticketId',
      headerName: 'Ticket ID',
      flex: 0.6,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <span className="text-xs font-mono text-gray-600">
          {params.row.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Tooltip 
            title={
              <Box sx={{ p: 1, maxWidth: 400 }}>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                  {params.row.description || 'No description'}
                </p>
              </Box>
            }
            arrow
            placement="top"
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: 'grey.900',
                  '& .MuiTooltip-arrow': { color: 'grey.900' },
                  maxWidth: 400,
                },
              },
            }}
          >
            <p className="text-xs text-gray-600 truncate cursor-pointer text-center" style={{ maxWidth: '100%' }}>
              {params.row.description || 'No description'}
            </p>
          </Tooltip>
        </Box>
      ),
    },
    {
      field: 'category',
      headerName: 'Category',
      flex: 0.6,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <Chip
          label={params.row.category?.name || 'Uncategorized'}
          size="small"
          sx={{ 
            fontWeight: 500, 
            fontSize: '0.7rem',
            backgroundColor: params.row.category?.color || '#9e9e9e',
            color: '#fff'
          }}
        />
      ),
    },
    {
      field: 'priority',
      headerName: 'Priority',
      flex: 0.5,
      minWidth: 70,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <Chip
          label={params.row.priority}
          size="small"
          color={getPriorityChipColor(params.row.priority)}
          sx={{ fontWeight: 500, fontSize: '0.7rem' }}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.7,
      minWidth: 90,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <Chip
          label={formatStatus(params.row.status)}
          size="small"
          color={getStatusChipColor(params.row.status)}
          sx={{ fontWeight: 500, fontSize: '0.7rem' }}
        />
      ),
    },
    {
      field: 'sla',
      headerName: 'SLA',
      flex: 0.8,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => {
        const slaInfo = calculateSLAInfo({
          createdAt: params.row.createdAt,
          priority: params.row.priority,
          status: params.row.status,
          assignedAt: params.row.assignedAt,
          contractorAcceptedAt: params.row.contractorAcceptedAt,
          onSiteAt: params.row.onSiteAt,
          completedAt: params.row.completedAt,
          responseDeadline: params.row.responseDeadline,
          resolutionDeadline: params.row.resolutionDeadline
        })
        
        const showResolution = !['OPEN', 'PROCESSING', 'ASSIGNED'].includes(params.row.status)
        const status = showResolution ? slaInfo.resolutionStatus : slaInfo.responseStatus
        const label = showResolution ? slaInfo.formattedResolutionRemaining : slaInfo.formattedResponseRemaining
        const tooltipText = showResolution 
          ? `Resolution: ${slaInfo.formattedResolutionRemaining}`
          : `Response: ${slaInfo.formattedResponseRemaining}`
        
        return (
          <Tooltip title={tooltipText}>
            <Chip
              icon={<Timer className="h-3 w-3" />}
              label={label.length > 10 ? label.substring(0, 10) + '...' : label}
              size="small"
              color={getSLAChipColor(status)}
              sx={{ fontWeight: 500, fontSize: '0.65rem' }}
            />
          </Tooltip>
        )
      },
    },
    {
      field: 'assignedTo',
      headerName: 'Contractor',
      flex: 0.7,
      minWidth: 90,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        params.row.assignedTo ? (
          <span className="text-xs truncate">{params.row.assignedTo.name || params.row.assignedTo.email}</span>
        ) : (
          <span className="text-xs text-gray-400">Not assigned</span>
        )
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      flex: 0.5,
      minWidth: 75,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
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
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <Tooltip title="View Details">
          <IconButton
            size="small"
            onClick={() => handleViewTicket(params.row)}
            sx={{ color: 'primary.main' }}
          >
            <Eye className="h-4 w-4" />
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
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-3 sm:p-5">
      <div className="space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back, {user.name || 'User'}</h1>
            <p className="text-sm sm:text-base text-gray-600">
              {user.role === 'END_USER' ? 'Manage your tickets and assets' : 
               user.role === 'TENANT_ADMIN' ? 'Manage company tickets and projects' :
               user.role === 'CONTRACTOR' ? 'View assigned tickets and projects' :
               'System administration'}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {activeTab === 'tickets' && user.role === 'END_USER' ? (
              <CreateTicketDialog tenantId={user.tenantId || ''} onTicketCreated={fetchUserTickets} />
            ) : activeTab === 'assets' && user.role === 'END_USER' ? (
              <Button onClick={() => setActiveTab('tickets')} size="sm">
                <Ticket className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">View Tickets</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {/* Only show My Tickets tab for END_USER */}
            {user.role === 'END_USER' && (
              <button
                onClick={() => setActiveTab('tickets')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tickets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Ticket className="h-4 w-4" />
                  <span>My Tickets</span>
                  <Badge variant="secondary" className="ml-1">
                    {tickets.length}
                  </Badge>
                </div>
              </button>
            )}
            
            {/* Asset Register tab for END_USER */}
            {user.role === 'END_USER' && (
              <button
                onClick={() => setActiveTab('assets')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'assets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4" />
                  <span>Asset Register</span>
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {user.role === 'END_USER' ? (
          // END_USER content with tabs
          activeTab === 'tickets' ? (
            <>
              {/* Search and Filter Bar */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                
                {/* Filter Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={getActiveFilterCount() > 0 ? 'border-blue-500 bg-blue-50' : ''}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {getActiveFilterCount() > 0 && (
                    <Badge className="ml-2 h-5 w-5 p-0 text-xs">
                      {getActiveFilterCount()}
                    </Badge>
                  )}
                </Button>
              
              {getActiveFilterCount() > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            
            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="ON_SITE">On Site</SelectItem>
                        <SelectItem value="AWAITING_APPROVAL">Awaiting Approval</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Priority Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="SALES">Sales</SelectItem>
                        <SelectItem value="RETAIL">Retail</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="PROJECTS">Projects</SelectItem>
                        <SelectItem value="GENERAL">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Date Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 days</SelectItem>
                        <SelectItem value="month">Last 30 days</SelectItem>
                        <SelectItem value="quarter">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Assignment Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assignment</label>
                    <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tickets</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <Ticket className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.open}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>My Tickets</span>
              {getActiveFilterCount() > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  Showing {filteredTickets.length} of {tickets.length} tickets
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              {tickets.length === 0 ? (
                <>
                  <Ticket className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
                  <p className="text-gray-600 mb-4">Create your first support ticket to get started</p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Ticket
                  </Button>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets match your filters</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search criteria</p>
                  <Button variant="outline" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Box sx={{ width: '100%' }}>
              <ScrollableDataGrid
                rows={filteredTickets}
                columns={ticketColumns}
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
          </>
        ) : (
          /* Asset Register Tab */
          <AssetRegister tenantId={user.tenantId || ''} userRole={user.role} />
        )
        ) : (
          /* Admin Users - Direct them to proper admin sections */
          <Card>
            <CardHeader>
              <CardTitle>Admin Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="space-y-4">
                <div className="text-gray-600">
                  As an admin, you should use the dedicated admin sections to manage tickets and company resources.
                </div>
                <div className="flex justify-center space-x-4">
                  <Button asChild>
                    <Link href="/admin">Admin Dashboard</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/admin/tickets">Manage Tickets</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* View Ticket Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ticket Details</DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-6">
                {/* Ticket Info */}
                <div>
                  <h3 className="text-lg font-semibold">{selectedTicket.title}</h3>
                  <p className="text-gray-600 mt-2">{selectedTicket.description}</p>
                </div>
                
                {/* Status and Priority */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={getStatusColor(selectedTicket.status)}>
                    {formatStatus(selectedTicket.status)}
                  </Badge>
                  <Badge className={getPriorityColor(selectedTicket.priority)}>
                    {selectedTicket.priority}
                  </Badge>
                  <Badge variant="outline">{selectedTicket.type?.replace(/_/g, ' ')}</Badge>
                </div>
                
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="ml-2">{new Date(selectedTicket.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Contractor Info */}
                {selectedTicket.assignedTo && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3 flex items-center">
                      <Wrench className="h-4 w-4 mr-2" />
                      Assigned Contractor
                    </h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{selectedTicket.assignedTo.name || 'Contractor'}</span>
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{selectedTicket.assignedTo.email}</span>
                      </div>
                      {selectedTicket.assignedTo.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{selectedTicket.assignedTo.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Location */}
                {selectedTicket.location && (
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{selectedTicket.location}</span>
                  </div>
                )}

                {/* Attachments Section */}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <MediaViewer 
                      files={selectedTicket.attachments}
                      title="Attachments"
                      gridCols={2}
                      thumbnailSize="sm"
                    />
                  </div>
                )}

                {/* Ticket Chat */}
                <TicketChat 
                  ticketId={selectedTicket.id}
                  currentUser={{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                  }}
                  ticketStatus={selectedTicket.status}
                  pollInterval={5000}
                />

                {/* Status Info Messages */}
                {selectedTicket.status === 'PROCESSING' && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
                    Waiting for contractor to accept the job
                  </div>
                )}

                {/* Waiting for contractor to submit work description */}
                {selectedTicket.status === 'AWAITING_DESCRIPTION' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-800 mb-2 flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Waiting for Work Description
                    </h4>
                    <p className="text-sm text-amber-700">
                      You&apos;ve marked the job as complete. The contractor is now required to provide a description of the work done before you can close the ticket.
                    </p>
                  </div>
                )}

                {/* Work Description Approval Required */}
                {selectedTicket.status === 'AWAITING_WORK_APPROVAL' && selectedTicket.workDescription && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-medium text-indigo-800 mb-2 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Review Work Description
                    </h4>
                    <p className="text-sm text-indigo-700 mb-3">
                      The contractor has submitted a description of the work performed. Please review and approve or reject.
                    </p>
                    <div className="bg-white border border-indigo-100 rounded p-3 mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Work Description:</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedTicket.workDescription}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleWorkApproval(true)}
                        disabled={workApprovalLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => setShowWorkApprovalDialog(true)}
                        disabled={workApprovalLoading}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <DialogFooter className="flex gap-2 flex-wrap justify-between w-full">
                  <div className="flex gap-2">
                    {/* Edit Ticket Button - only for OPEN or PROCESSING without contractor */}
                    {canEditTicket(selectedTicket) && (
                      <Button 
                        variant="outline" 
                        onClick={() => openEditDialog(selectedTicket)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Ticket
                      </Button>
                    )}
                    {/* Cancel Ticket Button - only for OPEN or PROCESSING without contractor */}
                    {canCancelTicket(selectedTicket) && (
                      <Button 
                        variant="destructive" 
                        onClick={() => setShowCancelDialog(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Ticket
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowViewModal(false)}>
                      Close
                    </Button>
                  
                    {/* Confirm On-Site button when contractor has accepted */}
                    {selectedTicket.status === 'ACCEPTED' && (
                      <Button 
                        onClick={() => handleUpdateTicketStatus('ON_SITE')} 
                        disabled={statusUpdateLoading}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Confirm Contractor On-Site
                      </Button>
                    )}
                  
                    {/* Mark Completed button when contractor is on site - triggers work description request */}
                    {selectedTicket.status === 'ON_SITE' && (
                      <Button 
                        onClick={() => handleUpdateTicketStatus('AWAITING_DESCRIPTION')} 
                        disabled={statusUpdateLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Job Completed
                      </Button>
                    )}
                    
                    {/* Also allow marking complete from IN_PROGRESS */}
                    {selectedTicket.status === 'IN_PROGRESS' && (
                      <Button 
                        onClick={() => handleUpdateTicketStatus('AWAITING_DESCRIPTION')} 
                        disabled={statusUpdateLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Job Completed
                      </Button>
                    )}
                  
                    {/* Close Ticket & Rate button when job is completed (work approved) */}
                    {selectedTicket.status === 'COMPLETED' && (
                      <Button 
                        onClick={() => {
                          setShowViewModal(false)
                          setShowRatingModal(true)
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Close Ticket & Rate Contractor
                      </Button>
                    )}
                  
                    {selectedTicket.status === 'CLOSED' && (
                      <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                        Ticket closed
                      </div>
                    )}
                  </div>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Ticket Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center text-blue-600">
                <Pencil className="h-5 w-5 mr-2" />
                Edit Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="editTitle">Title <span className="text-red-500">*</span></Label>
                <Input
                  id="editTitle"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Ticket title"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Describe the issue..."
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editPriority">Priority</Label>
                  <Select value={editFormData.priority} onValueChange={(value) => setEditFormData({ ...editFormData, priority: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editType">Type</Label>
                  <Select value={editFormData.type} onValueChange={(value) => setEditFormData({ ...editFormData, type: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPAIR">Repair</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="INSPECTION">Inspection</SelectItem>
                      <SelectItem value="INSTALLATION">Installation</SelectItem>
                      <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Asset */}
              <div>
                <Label htmlFor="editAsset">Related Asset</Label>
                <Select 
                  value={editFormData.assetId || 'none'} 
                  onValueChange={(value) => {
                    // When asset changes, also update category to match asset's category
                    const selectedAsset = editAssets.find(a => a.id === value)
                    setEditFormData({ 
                      ...editFormData, 
                      assetId: value === 'none' ? '' : value,
                      categoryId: selectedAsset?.categoryId || editFormData.categoryId
                    })
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select asset (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Asset</SelectItem>
                    {editAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} ({asset.assetNumber}) {asset.category ? `- ${asset.category.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  * Changing asset will update the category automatically
                </p>
              </div>
              
              {/* Category */}
              <div>
                <Label htmlFor="editCategory">Category</Label>
                <Select value={editFormData.categoryId} onValueChange={(value) => setEditFormData({ ...editFormData, categoryId: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {editCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="editLocation">Location</Label>
                <Input
                  id="editLocation"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  placeholder="e.g., Building A, Floor 2, Room 201"
                  className="mt-1"
                />
              </div>
              
              {/* Existing Attachments */}
              {existingAttachments.length > 0 && (
                <div>
                  <Label className="mb-2 block">Current Attachments</Label>
                  <div className="space-y-2">
                    {existingAttachments
                      .filter(att => !attachmentsToDelete.includes(att.id))
                      .map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {attachment.mimeType?.startsWith('image/') ? (
                              <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            ) : attachment.mimeType?.startsWith('video/') ? (
                              <Video className="h-4 w-4 text-purple-500 flex-shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            )}
                            <span className="text-sm truncate">{attachment.originalName || attachment.filename}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            onClick={() => setAttachmentsToDelete([...attachmentsToDelete, attachment.id])}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                  {attachmentsToDelete.length > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      {attachmentsToDelete.length} file(s) will be removed on save
                    </p>
                  )}
                </div>
              )}
              
              {/* Add New Attachments */}
              <div>
                <Label>Add New Attachments</Label>
                <div className="mt-2">
                  <input
                    id="editFiles"
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      const maxSize = 10 * 1024 * 1024 // 10MB
                      const validFiles = files.filter(file => {
                        if (file.size > maxSize) {
                          alert(`File ${file.name} is too large. Maximum size is 10MB.`)
                          return false
                        }
                        return true
                      })
                      setEditMediaFiles(prev => [...prev, ...validFiles])
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('editFiles')?.click()}
                    className="w-full border-dashed border-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Images, Videos, Audio, PDFs (Max 10MB per file)
                </p>
                
                {/* New files to upload */}
                {editMediaFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <Label className="text-sm text-green-600">New files to add:</Label>
                    {editMediaFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {file.type.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          ) : file.type.startsWith('video/') ? (
                            <Video className="h-4 w-4 text-purple-500 flex-shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          )}
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-gray-400">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          onClick={() => setEditMediaFiles(prev => prev.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={editLoading}>
                Cancel
              </Button>
              <Button 
                onClick={handleEditTicket} 
                disabled={editLoading || !editFormData.title.trim()}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Ticket Confirmation Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Cancel Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to cancel this ticket? Please provide a reason below.
              </p>
              <div>
                <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="cancelReason"
                  placeholder="Please explain why you want to cancel this ticket..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={cancelLoading}>
                Keep Ticket
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelTicket} 
                disabled={cancelLoading || !cancelReason.trim()}
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Work Description Rejection Dialog */}
        <Dialog open={showWorkApprovalDialog} onOpenChange={setShowWorkApprovalDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <XCircle className="h-5 w-5 mr-2" />
                Reject Work Description
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please provide a reason for rejecting the work description. The contractor will be notified and asked to submit a revised description.
              </p>
              
              <div>
                <Label htmlFor="workRejectionReason">Reason for Rejection *</Label>
                <Textarea
                  id="workRejectionReason"
                  placeholder="Why is this description not acceptable? What details are missing or incorrect?"
                  value={workRejectionReason}
                  onChange={(e) => setWorkRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowWorkApprovalDialog(false)
                setWorkRejectionReason('')
              }}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleWorkApproval(false)}
                disabled={workApprovalLoading || !workRejectionReason.trim()}
              >
                {workApprovalLoading ? 'Rejecting...' : 'Reject Description'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Rating Modal */}
        {selectedTicket && (
          <RatingModal
            ticketId={selectedTicket.id}
            open={showRatingModal}
            onOpenChange={setShowRatingModal}
            onRatingSubmitted={handleRatingSubmitted}
          />
        )}

        {/* Controlled Create Ticket Dialog for Empty State */}
        <CreateTicketDialog 
          tenantId={user.tenantId || ''} 
          onTicketCreated={fetchUserTickets}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          hideTrigger={true}
        />
      </div>
    </div>
  )
}