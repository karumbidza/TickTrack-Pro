'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
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
import { FilterDrawer, FilterButton, ActiveFilterTags, EMPTY_FILTERS, countActiveFilters } from '@/components/FilterDrawer'
import type { FilterState } from '@/components/FilterDrawer'

interface User {
  id: string
  email: string
  name?: string | null
  role: string
  tenantId: string | null
  branchName?: string | null
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
  initialTab?: 'tickets' | 'assets'
}

export function UserDashboard({ user, initialTab = 'tickets' }: UserDashboardProps) {
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
  const [editUploadProgress, setEditUploadProgress] = useState(0)
  const [isEditUploading, setIsEditUploading] = useState(false)
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
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)

  // Work description approval state
  const [showWorkApprovalDialog, setShowWorkApprovalDialog] = useState(false)
  const [workApprovalLoading, setWorkApprovalLoading] = useState(false)
  const [workRejectionReason, setWorkRejectionReason] = useState('')
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [showClosedTickets, setShowClosedTickets] = useState(false)

  // Auto-refresh interval (30 seconds)
  const refreshInterval = 30

  useEffect(() => {
    fetchUserTickets()
  }, [])

  // Auto-refresh effect (background) - runs independently
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/tickets')
        const data = await response.json()
        setTickets(data.tickets || [])
      } catch (error) {
        console.error('Auto-refresh failed:', error)
      }
    }, refreshInterval * 1000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    applyFilters()
  }, [tickets, searchTerm, filters, showClosedTickets])

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

    // Hide closed tickets unless explicitly filtered
    if (!showClosedTickets && !filters.status.includes('CLOSED')) {
      filtered = filtered.filter(ticket => ticket.status !== 'CLOSED')
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter (multi-select — empty = show all)
    if (filters.status.length > 0) {
      filtered = filtered.filter(ticket => filters.status.includes(ticket.status))
    }

    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(ticket => filters.priority.includes(ticket.priority))
    }

    // Type filter
    if (filters.type.length > 0) {
      filtered = filtered.filter(ticket => filters.type.includes(ticket.type))
    }

    // Date filter
    if (filters.date) {
      const now = new Date()
      const filterDate = new Date()
      switch (filters.date) {
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
        case 'custom':
          if (filters.dateFrom) filtered = filtered.filter(ticket => new Date(ticket.createdAt) >= new Date(filters.dateFrom))
          if (filters.dateTo) filtered = filtered.filter(ticket => new Date(ticket.createdAt) <= new Date(filters.dateTo + 'T23:59:59'))
          break
      }
    }

    setFilteredTickets(filtered)
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setFilters(EMPTY_FILTERS)
  }

  const removeFilter = (field: keyof FilterState, value: string) => {
    if (field === 'date') {
      setFilters(f => ({ ...f, date: '', dateFrom: '', dateTo: '' }))
    } else {
      setFilters(f => ({ ...f, [field]: (f[field] as string[]).filter(v => v !== value) }))
    }
  }

  const getActiveFilterCount = () => countActiveFilters(filters) + (searchTerm ? 1 : 0)

  const getStatusColor = (status: string): React.CSSProperties => {
    const colors: Record<string, React.CSSProperties> = {
      OPEN: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      ASSIGNED: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      IN_PROGRESS: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      ON_SITE: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      AWAITING_DESCRIPTION: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      AWAITING_WORK_APPROVAL: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      AWAITING_APPROVAL: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      COMPLETED: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' },
      CLOSED: { backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' },
      CANCELLED: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' },
    }
    return colors[status] || { backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' }
  }

  const getPriorityColor = (priority: string): React.CSSProperties => {
    const colors: Record<string, React.CSSProperties> = {
      LOW: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' },
      MEDIUM: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      HIGH: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' },
      CRITICAL: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' },
    }
    return colors[priority] || { backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' }
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
    setIsEditUploading(editMediaFiles.length > 0)
    setEditUploadProgress(0)
    
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

      // Use XMLHttpRequest for upload progress
      const result = await new Promise<{success: boolean, data?: any, error?: string}>((resolve) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            setEditUploadProgress(percent)
          }
        })
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve({ success: true, data })
            } catch {
              resolve({ success: false, error: 'Invalid response' })
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText)
              resolve({ success: false, error: error.error || 'Failed to update ticket' })
            } catch {
              resolve({ success: false, error: `Failed to update ticket (${xhr.status})` })
            }
          }
        })
        
        xhr.addEventListener('error', () => {
          resolve({ success: false, error: 'Network error during upload' })
        })
        
        xhr.addEventListener('abort', () => {
          resolve({ success: false, error: 'Upload cancelled' })
        })
        
        xhr.open('PATCH', `/api/tickets/${selectedTicket.id}`)
        xhr.send(formData)
      })

      if (result.success && result.data) {
        alert('Ticket updated successfully')
        setShowEditDialog(false)
        setEditMediaFiles([])
        setAttachmentsToDelete([])
        fetchUserTickets()
        // Update selected ticket with new data
        setSelectedTicket({ ...selectedTicket, ...result.data.ticket })
      } else {
        alert(result.error || 'Failed to update ticket')
      }
    } catch (error) {
      console.error('Failed to update ticket:', error)
      alert('Failed to update ticket')
    } finally {
      setEditLoading(false)
      setIsEditUploading(false)
      setEditUploadProgress(0)
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
      align: 'left',
      headerAlign: 'left',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <Box sx={{ py: 1, textAlign: 'left', width: '100%' }}>
          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{params.row.title}</p>
        </Box>
      ),
    },
    {
      field: 'ticketId',
      headerName: 'Ticket ID',
      flex: 0.6,
      minWidth: 80,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          {params.row.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      minWidth: 150,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
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
            <p className="text-xs truncate cursor-pointer text-left" style={{ maxWidth: '100%', color: 'var(--text-secondary)' }}>
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
      align: 'left',
      headerAlign: 'left',
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
      align: 'left',
      headerAlign: 'left',
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
      align: 'left',
      headerAlign: 'left',
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
      align: 'left',
      headerAlign: 'left',
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
      align: 'left',
      headerAlign: 'left',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        params.row.assignedTo ? (
          <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{params.row.assignedTo.name || params.row.assignedTo.email}</span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not assigned</span>
        )
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      flex: 0.5,
      minWidth: 75,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params: GridRenderCellParams<TicketSummary>) => (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Page header bar — only shown on tickets tab; asset register has its own header */}
      {activeTab === 'tickets' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, minHeight: 52, padding: '0 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div>
          <h1 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>My Tickets</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{user.branchName || user.name || user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'tickets' && (
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-muted)' }} />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ height: 32, fontSize: 12, paddingLeft: 28, width: 200, backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}
              />
            </div>
          )}
          {activeTab === 'tickets' && (
            <FilterButton
              isOpen={filterDrawerOpen}
              activeCount={countActiveFilters(filters)}
              onClick={() => setFilterDrawerOpen(o => !o)}
            />
          )}
          {activeTab === 'tickets' && user.role === 'END_USER' && (
            <CreateTicketDialog tenantId={user.tenantId || ''} onTicketCreated={fetchUserTickets} />
          )}
        </div>
      </div>}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={setFilters}
        filters={filters}
        sections={['status', 'priority', 'type', 'date']}
        statusOptions={[
          { value: 'OPEN', label: 'Open' },
          { value: 'ASSIGNED', label: 'Assigned' },
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'ON_SITE', label: 'On Site' },
          { value: 'AWAITING_APPROVAL', label: 'Awaiting Approval' },
          { value: 'COMPLETED', label: 'Completed' },
          { value: 'CLOSED', label: 'Closed' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ]}
      />

      {/* Active Filter Tags */}
      <ActiveFilterTags
        filters={filters}
        statusOptions={[
          { value: 'OPEN', label: 'Open' },
          { value: 'ASSIGNED', label: 'Assigned' },
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'ON_SITE', label: 'On Site' },
          { value: 'AWAITING_APPROVAL', label: 'Awaiting Approval' },
          { value: 'COMPLETED', label: 'Completed' },
          { value: 'CLOSED', label: 'Closed' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ]}
        onRemove={removeFilter}
        onClearAll={clearAllFilters}
      />

      {/* Tab Content */}
      {user.role === 'END_USER' ? (
        activeTab === 'tickets' ? (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Stats Strip */}
              <div className="stats-strip">
                {[
                  { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
                  { label: 'Open', value: stats.open, color: 'var(--blue)' },
                  { label: 'In Progress', value: stats.inProgress, color: 'var(--amber)' },
                  { label: 'Completed', value: stats.completed, color: 'var(--green)' },
                ].map((s, i) => (
                  <div key={i} className="stats-strip-item">
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 300, color: s.color, letterSpacing: '-0.025em', lineHeight: 1 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Tickets Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    Tickets
                    {getActiveFilterCount() > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                        {filteredTickets.length} of {tickets.length}
                      </span>
                    )}
                  </span>
                </CardHeader>
                <CardContent style={{ paddingTop: 0 }}>
                  {filteredTickets.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                      {tickets.length === 0 ? (
                        <>
                          <Ticket style={{ width: 28, height: 28, marginBottom: 10, color: 'var(--text-muted)' }} />
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>No tickets yet</p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Create your first support ticket to get started</p>
                          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />Create Ticket
                          </Button>
                        </>
                      ) : (
                        <>
                          <Search style={{ width: 28, height: 28, marginBottom: 10, color: 'var(--text-muted)' }} />
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>No tickets match your filters</p>
                          <Button variant="outline" size="sm" onClick={clearAllFilters}>
                            <X className="h-3.5 w-3.5 mr-1.5" />Clear Filters
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
                          pagination: { paginationModel: { pageSize: 10, page: 0 } },
                          sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
                        }}
                        pageSizeOptions={[5, 10, 25, 50]}
                        disableRowSelectionOnClick
                        autoHeight
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
          </div>
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
                <div style={{ color: 'var(--text-secondary)' }}>
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
                  <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)', fontWeight: 300 }}>{selectedTicket.title}</h3>
                  <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>{selectedTicket.description}</p>
                </div>
                
                {/* Status and Priority */}
                <div className="flex flex-wrap gap-2">
                  <Badge style={{ ...getStatusColor(selectedTicket.status), fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {formatStatus(selectedTicket.status)}
                  </Badge>
                  <Badge style={{ ...getPriorityColor(selectedTicket.priority), fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {selectedTicket.priority}
                  </Badge>
                  <Badge variant="outline">{selectedTicket.type?.replace(/_/g, ' ')}</Badge>
                </div>
                
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Created:</span>
                    <span className="ml-2" style={{ color: 'var(--text-primary)' }}>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Last Updated:</span>
                    <span className="ml-2" style={{ color: 'var(--text-primary)' }}>{new Date(selectedTicket.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Contractor Info */}
                {selectedTicket.assignedTo && (
                  <div className="rounded-lg p-4 border border-border" style={{ backgroundColor: 'var(--surface2)' }}>
                    <h4 className="font-medium mb-3 flex items-center" style={{ color: 'var(--text-primary)' }}>
                      <Wrench className="h-4 w-4 mr-2" />
                      Assigned Contractor
                    </h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" style={{ color: 'var(--text-muted)' }} />
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedTicket.assignedTo.name || 'Contractor'}</span>
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" style={{ color: 'var(--text-muted)' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{selectedTicket.assignedTo.email}</span>
                      </div>
                      {selectedTicket.assignedTo.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" style={{ color: 'var(--text-muted)' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{selectedTicket.assignedTo.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Location */}
                {selectedTicket.location && (
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2" style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{selectedTicket.location}</span>
                  </div>
                )}

                {/* Attachments Section */}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="rounded-lg p-4 border border-border" style={{ backgroundColor: 'var(--surface2)' }}>
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
                  <div className="text-sm px-4 py-2 rounded-lg" style={{ color: 'var(--amber)', backgroundColor: 'var(--amber-bg)' }}>
                    Waiting for contractor to accept the job
                  </div>
                )}

                {/* Waiting for contractor to submit work description */}
                {selectedTicket.status === 'AWAITING_DESCRIPTION' && (
                  <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                    <h4 className="font-medium mb-2 flex items-center" style={{ color: 'var(--amber)' }}>
                      <Clock className="h-5 w-5 mr-2" />
                      Waiting for Work Description
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--amber)' }}>
                      You&apos;ve marked the job as complete. The contractor is now required to provide a description of the work done before you can close the ticket.
                    </p>
                  </div>
                )}

                {/* Work Description Approval Required */}
                {selectedTicket.status === 'AWAITING_WORK_APPROVAL' && selectedTicket.workDescription && (
                  <div className="rounded-lg p-4 border border-border" style={{ backgroundColor: 'var(--blue-bg)' }}>
                    <h4 className="font-medium mb-2 flex items-center" style={{ color: 'var(--blue)' }}>
                      <FileText className="h-5 w-5 mr-2" />
                      Review Work Description
                    </h4>
                    <p className="text-sm mb-3" style={{ color: 'var(--blue)' }}>
                      The contractor has submitted a description of the work performed. Please review and approve or reject.
                    </p>
                    <div className="rounded p-3 mb-4 border border-border" style={{ backgroundColor: 'var(--surface)' }}>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Work Description:</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{selectedTicket.workDescription}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleWorkApproval(true)}
                        disabled={workApprovalLoading}
                        style={{ backgroundColor: 'var(--green)', color: '#fff' }}
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
                        style={{ backgroundColor: 'var(--blue)', color: '#fff' }}
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
                        style={{ backgroundColor: 'var(--green)', color: '#fff' }}
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
                        style={{ backgroundColor: 'var(--green)', color: '#fff' }}
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
                        style={{ backgroundColor: 'var(--green)', color: '#fff' }}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Close Ticket & Rate Contractor
                      </Button>
                    )}
                  
                    {selectedTicket.status === 'CLOSED' && (
                      <div className="text-sm px-4 py-2 rounded-lg" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface2)' }}>
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
              <DialogTitle className="flex items-center" style={{ color: 'var(--accent)' }}>
                <Pencil className="h-5 w-5 mr-2" />
                Edit Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="editTitle">Title <span className="text-ds-red">*</span></Label>
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
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
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
                        <div key={attachment.id} className="flex items-center justify-between p-2 rounded-lg border border-border" style={{ backgroundColor: 'var(--surface2)' }}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {attachment.mimeType?.startsWith('image/') ? (
                              <ImageIcon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--blue)' }} />
                            ) : attachment.mimeType?.startsWith('video/') ? (
                              <Video className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                            ) : (
                              <FileText className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
)}
                            <span className="text-sm truncate">{attachment.originalName || attachment.filename}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-ds-red hover:text-ds-red hover:bg-red-bg flex-shrink-0"
                            onClick={() => setAttachmentsToDelete([...attachmentsToDelete, attachment.id])}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                  {attachmentsToDelete.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--amber)' }}>
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
                      const maxImageSize = 10 * 1024 * 1024 // 10MB for images/docs
                      const maxVideoSize = 100 * 1024 * 1024 // 100MB for videos
                      const validFiles = files.filter(file => {
                        const isVideo = file.type.startsWith('video/')
                        const maxSize = isVideo ? maxVideoSize : maxImageSize
                        if (file.size > maxSize) {
                          const maxSizeMB = isVideo ? '100' : '10'
                          alert(`File ${file.name} is too large. Maximum size is ${maxSizeMB}MB.`)
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
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Images, Audio, PDFs (Max 10MB) | Videos (Max 100MB)
                </p>
                
                {/* New files to upload */}
                {editMediaFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <Label className="text-sm" style={{ color: 'var(--green)' }}>New files to add:</Label>
                    {editMediaFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg border border-border" style={{ backgroundColor: 'var(--green-bg)' }}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {file.type.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--blue)' }} />
                          ) : file.type.startsWith('video/') ? (
                            <Video className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                          ) : (
                            <FileText className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          )}
                          <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-ds-red hover:text-ds-red hover:bg-red-bg flex-shrink-0"
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
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              {/* Upload Progress Bar */}
              {isEditUploading && (
                <div className="w-full mb-2 sm:mb-0 sm:mr-auto">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium" style={{ color: 'var(--accent)' }}>
                      Uploading {editMediaFiles.length} file{editMediaFiles.length > 1 ? 's' : ''}...
                    </span>
                    <span className="font-medium" style={{ color: 'var(--accent)' }}>{editUploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--blue-bg)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${editUploadProgress}%`, backgroundColor: 'var(--accent)' }}
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end w-full sm:w-auto">
                <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={editLoading}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditTicket} 
                  disabled={editLoading || !editFormData.title.trim()}
                >
                  {editLoading ? (isEditUploading ? `Uploading ${editUploadProgress}%...` : 'Saving...') : 'Save Changes'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Ticket Confirmation Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center text-ds-red">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Cancel Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p style={{ color: 'var(--text-secondary)' }}>
                Are you sure you want to cancel this ticket? Please provide a reason below.
              </p>
              <div>
                <label htmlFor="cancelReason" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Reason for cancellation <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <textarea
                  id="cancelReason"
                  placeholder="Please explain why you want to cancel this ticket..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-md px-3 py-2 border border-border"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
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
              <DialogTitle className="flex items-center text-ds-red">
                <XCircle className="h-5 w-5 mr-2" />
                Reject Work Description
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
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
  )
}