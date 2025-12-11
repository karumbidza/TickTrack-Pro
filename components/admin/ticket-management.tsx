'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RatingModal } from '@/components/tickets/rating-modal'
import { TicketChat } from '@/components/tickets/ticket-chat'
import { MediaViewer } from '@/components/ui/media-viewer'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
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
  User,
  Calendar,
  AlertCircle,
  Settings,
  Eye,
  Edit,
  UserCheck,
  Filter,
  Search,
  X,
  RefreshCw,
  Package,
  Star,
  DollarSign,
  AlertTriangle,
  XCircle,
  Ban,
  FileText,
  Download
} from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name?: string | null
  role: string
  tenantId: string | null
}

interface TicketDetails {
  id: string
  ticketNumber: string
  title: string
  description: string
  status: string
  type: string
  priority: string
  reporterName: string
  reporterContact: string
  location?: string
  createdAt: string
  updatedAt: string
  // Cancellation fields
  cancellationReason?: string
  cancellationRequestedAt?: string
  cancellationRequestedBy?: string
  cancelledAt?: string
  // Rejection fields
  rejectionReason?: string
  rejectedAt?: string
  // HQ Assignment fields
  hqAssignedAt?: string
  hqCompletedAt?: string
  // Work Description Workflow fields
  workDescriptionRequestedAt?: string
  workDescription?: string
  workDescriptionSubmittedAt?: string
  workDescriptionApproved?: boolean
  workDescriptionApprovedAt?: string
  workDescriptionRejectionReason?: string
  user: {
    id: string
    name: string
    email: string
  }
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  asset?: {
    id: string
    name: string
    assetNumber: string
    location: string
  }
  attachments: Array<{
    id: string
    filename: string
    originalName: string
    url: string
    mimeType: string
  }>
  messages: Array<{
    id: string
    content: string
    createdAt: string
    user: {
      id: string
      name: string
      email: string
      role: string
    }
  }>
  invoice?: {
    id: string
    invoiceNumber: string
    amount: number
    status: string
    invoiceFileUrl?: string
  }
  _count: {
    messages: number
  }
}

interface Contractor {
  id: string
  email: string
  name: string
  specializations?: string[]
  rating?: number
  isAvailable: boolean
}

interface HQAdmin {
  id: string
  email: string
  name: string
  role: string
}

interface AdminTicketManagementProps {
  user: User
}

export function AdminTicketManagement({ user }: AdminTicketManagementProps) {
  const [tickets, setTickets] = useState<TicketDetails[]>([])
  const [filteredTickets, setFilteredTickets] = useState<TicketDetails[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [hqAdmins, setHQAdmins] = useState<HQAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Assignment states
  const [selectedContractor, setSelectedContractor] = useState('')
  const [selectedHQAdmin, setSelectedHQAdmin] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [assignmentType, setAssignmentType] = useState<'contractor' | 'hq-admin'>('contractor')

  const statusOptions = [
    'OPEN', 'PROCESSING', 'ACCEPTED', 'IN_PROGRESS', 'ON_SITE', 'AWAITING_DESCRIPTION', 'AWAITING_WORK_APPROVAL', 'AWAITING_APPROVAL', 'COMPLETED', 'CLOSED', 'CANCELLED'
  ]
  
  const priorityOptions = [
    'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  ]

  const typeOptions = [
    'REPAIR', 'MAINTENANCE', 'INSPECTION', 'INSTALLATION', 
    'REPLACEMENT', 'EMERGENCY', 'OTHER'
  ]

  useEffect(() => {
    fetchTickets()
    fetchContractors()
    fetchHQAdmins()
  }, [user])

  useEffect(() => {
    filterTickets()
  }, [tickets, searchTerm, statusFilter, priorityFilter, departmentFilter, assignedFilter])

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/admin/tickets')
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      } else {
        toast.error('Failed to fetch tickets')
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      toast.error('Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }

  const fetchContractors = async () => {
    try {
      const response = await fetch('/api/admin/contractors')
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched contractors:', data.contractors)
        setContractors(data.contractors || [])
      } else {
        console.error('Failed to fetch contractors:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch contractors:', error)
    }
  }

  const fetchHQAdmins = async () => {
    try {
      const response = await fetch('/api/admin/users?role=admin&hq=true')
      if (response.ok) {
        const data = await response.json()
        // Filter to get only admin users (excluding current user if they want self-assign separately)
        const admins = (data.users || []).filter((u: HQAdmin) => 
          u.role.includes('ADMIN') && u.id !== user.id
        )
        setHQAdmins(admins)
      }
    } catch (error) {
      console.error('Failed to fetch HQ admins:', error)
    }
  }

  const handleAssignToSelf = async () => {
    if (!selectedTicket) return
    
    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/assign-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminId: user.id,
          notes: assignmentNotes 
        })
      })

      if (response.ok) {
        toast.success('Ticket assigned to you successfully')
        setAssignmentNotes('')
        fetchTickets()
        // Refresh selected ticket
        const updatedTicket = await response.json()
        setSelectedTicket(updatedTicket.ticket)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to assign ticket')
      }
    } catch (error) {
      console.error('Failed to assign ticket:', error)
      toast.error('Failed to assign ticket')
    }
  }

  const handleAssignToHQAdmin = async () => {
    if (!selectedTicket || !selectedHQAdmin) return
    
    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/assign-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminId: selectedHQAdmin,
          notes: assignmentNotes 
        })
      })

      if (response.ok) {
        toast.success('Ticket assigned to HQ admin successfully')
        setSelectedHQAdmin('')
        setAssignmentNotes('')
        fetchTickets()
        // Refresh selected ticket
        const updatedTicket = await response.json()
        setSelectedTicket(updatedTicket.ticket)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to assign ticket')
      }
    } catch (error) {
      console.error('Failed to assign ticket:', error)
      toast.error('Failed to assign ticket')
    }
  }

  const [hqCompletionNotes, setHQCompletionNotes] = useState('')

  const handleHQJobComplete = async () => {
    if (!selectedTicket) return
    
    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/hq-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          completionNotes: hqCompletionNotes 
        })
      })

      if (response.ok) {
        toast.success('Job marked as complete! User can now close and rate.')
        setHQCompletionNotes('')
        fetchTickets()
        // Refresh selected ticket
        const updatedTicket = await response.json()
        setSelectedTicket(updatedTicket.ticket)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to complete job')
      }
    } catch (error) {
      console.error('Failed to complete job:', error)
      toast.error('Failed to complete job')
    }
  }

  // Unassign/Revoke assignment states and handler
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false)
  const [unassignReason, setUnassignReason] = useState('')
  const [unassigning, setUnassigning] = useState(false)

  const handleUnassignTicket = async () => {
    if (!selectedTicket) return
    
    setUnassigning(true)
    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: unassignReason 
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || 'Assignment revoked successfully')
        setShowUnassignConfirm(false)
        setUnassignReason('')
        fetchTickets()
        // Refresh selected ticket
        setSelectedTicket(result.ticket)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to revoke assignment')
      }
    } catch (error) {
      console.error('Failed to unassign ticket:', error)
      toast.error('Failed to revoke assignment')
    } finally {
      setUnassigning(false)
    }
  }

  const filterTickets = () => {
    let filtered = tickets

    // Text search
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(ticket => 
        ticket.title.toLowerCase().includes(search) ||
        ticket.description.toLowerCase().includes(search) ||
        ticket.ticketNumber.toLowerCase().includes(search) ||
        ticket.reporterName.toLowerCase().includes(search) ||
        ticket.user.name.toLowerCase().includes(search) ||
        ticket.user.email.toLowerCase().includes(search)
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
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.type === departmentFilter)
    }

    // Assignment filter
    if (assignedFilter !== 'all') {
      if (assignedFilter === 'assigned') {
        filtered = filtered.filter(ticket => ticket.assignedTo)
      } else if (assignedFilter === 'unassigned') {
        filtered = filtered.filter(ticket => !ticket.assignedTo)
      }
    }

    setFilteredTickets(filtered)
  }

  const handleAssignContractor = async () => {
    if (!selectedTicket || !selectedContractor) {
      toast.error('Please select a contractor')
      return
    }

    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: selectedContractor,
          notes: assignmentNotes,
          status: 'PROCESSING' // Admin assignment sets to PROCESSING until contractor accepts
        })
      })

      if (response.ok) {
        toast.success('Ticket assigned to contractor successfully')
        setShowAssignDialog(false)
        setSelectedContractor('')
        setAssignmentNotes('')
        setShowTicketModal(false)
        fetchTickets()
      } else {
        const errorData = await response.json()
        console.error('Assignment failed:', response.status, errorData)
        toast.error(`Failed to assign ticket: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to assign ticket:', error)
      toast.error('Failed to assign ticket: Network error')
    }
  }

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      })

      if (response.ok) {
        toast.success('Priority updated successfully')
        fetchTickets()
      } else {
        toast.error('Failed to update priority')
      }
    } catch (error) {
      console.error('Failed to update priority:', error)
      toast.error('Failed to update priority')
    }
  }

  const handleCloseTicket = async (ticketId: string) => {
    setClosingTicketId(ticketId)
    // Set the selected ticket for the rating modal
    const ticket = tickets.find(t => t.id === ticketId)
    if (ticket) {
      setSelectedTicket(ticket)
      setShowTicketModal(false)
      setShowRatingModal(true)
    }
  }

  const handleRatingSubmitted = () => {
    setShowRatingModal(false)
    setClosingTicketId(null)
    setSelectedTicket(null)
    fetchTickets()
    toast.success('Ticket closed and rated successfully')
  }

  const getStatusColor = (status: string) => {
    const colors = {
      OPEN: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
      ON_SITE: 'bg-purple-100 text-purple-800',
      AWAITING_DESCRIPTION: 'bg-amber-100 text-amber-800',
      AWAITING_WORK_APPROVAL: 'bg-indigo-100 text-indigo-800',
      AWAITING_APPROVAL: 'bg-amber-100 text-amber-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
      URGENT: 'bg-red-200 text-red-900'
    }
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': case 'CLOSED': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PROCESSING': case 'ACCEPTED': case 'IN_PROGRESS': case 'ON_SITE': return <Clock className="h-4 w-4 text-orange-500" />
      case 'CANCELLED': return <X className="h-4 w-4 text-red-500" />
      case 'OPEN': return <AlertCircle className="h-4 w-4 text-blue-500" />
      default: return <Ticket className="h-4 w-4 text-blue-500" />
    }
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setDepartmentFilter('all')
    setAssignedFilter('all')
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (searchTerm) count++
    if (statusFilter !== 'all') count++
    if (priorityFilter !== 'all') count++
    if (departmentFilter !== 'all') count++
    if (assignedFilter !== 'all') count++
    return count
  }

  // DataGrid column definitions
  const ticketColumns: GridColDef[] = useMemo(() => [
    {
      field: 'title',
      headerName: 'Title',
      flex: 1.5,
      minWidth: 250,
      renderCell: (params: GridRenderCellParams<TicketDetails>) => {
        const ticket = params.row
        const hasRejection = ticket.rejectedAt && ticket.status === 'OPEN'
        const hasCancellationRequest = ticket.cancellationRequestedAt && !ticket.cancelledAt
        
        return (
          <Box sx={{ py: 1.5, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box sx={{ flexShrink: 0, mt: 0.5 }}>
                {getStatusIcon(ticket.status)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <span className="text-base font-semibold text-gray-900 truncate">
                    {ticket.title}
                  </span>
                  <Chip 
                    label={ticket.type?.replace(/_/g, ' ') || 'GENERAL'} 
                    size="small" 
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                  {hasRejection && (
                    <Chip 
                      icon={<XCircle className="h-3 w-3" />}
                      label="Rejected" 
                      size="small" 
                      color="error"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  )}
                  {hasCancellationRequest && (
                    <Chip 
                      icon={<AlertTriangle className="h-3 w-3" />}
                      label="Cancel Requested" 
                      size="small" 
                      color="warning"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  )}
                </Box>
                <p className="text-sm font-medium text-blue-600">{ticket.ticketNumber}</p>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="h-3 w-3" /> {ticket.user.name}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </Box>
              </Box>
            </Box>
          </Box>
        )
      },
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<TicketDetails>) => (
        <Box sx={{ py: 1.5 }}>
          <p className="text-sm text-gray-700 line-clamp-2">{params.row.description}</p>
        </Box>
      ),
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 110,
      renderCell: (params: GridRenderCellParams<TicketDetails>) => {
        const priorityColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
          LOW: 'success',
          MEDIUM: 'warning',
          HIGH: 'error',
          CRITICAL: 'error',
        }
        return (
          <Chip
            label={params.row.priority}
            size="small"
            color={priorityColors[params.row.priority] || 'default'}
            sx={{ fontWeight: 500 }}
          />
        )
      },
    },
    {
      field: 'assignedTo',
      headerName: 'Assigned To',
      width: 150,
      renderCell: (params: GridRenderCellParams<TicketDetails>) => {
        const ticket = params.row
        return ticket.assignedTo ? (
          <Box>
            <p className="text-sm font-medium text-gray-900">{ticket.assignedTo.name}</p>
            <p className="text-xs text-gray-500">{ticket.assignedTo.email}</p>
          </Box>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        )
      },
    },
    {
      field: 'asset',
      headerName: 'Asset',
      width: 130,
      renderCell: (params: GridRenderCellParams<TicketDetails>) => {
        const ticket = params.row
        return ticket.asset ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Package className="h-3 w-3 text-gray-400" />
            <span className="text-sm text-gray-900 truncate">{ticket.asset.name}</span>
          </Box>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params: GridRenderCellParams<TicketDetails>) => {
        const statusColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'> = {
          OPEN: 'primary',
          PROCESSING: 'warning',
          ACCEPTED: 'info',
          IN_PROGRESS: 'warning',
          ON_SITE: 'secondary',
          AWAITING_DESCRIPTION: 'warning',
          AWAITING_WORK_APPROVAL: 'info',
          AWAITING_APPROVAL: 'warning',
          COMPLETED: 'success',
          CLOSED: 'default',
          CANCELLED: 'error',
        }
        return (
          <Chip
            label={params.row.status.replace(/_/g, ' ')}
            size="small"
            color={statusColors[params.row.status] || 'default'}
            sx={{ fontWeight: 500 }}
          />
        )
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<TicketDetails>) => (
        <Tooltip title="View Details">
          <IconButton
            size="small"
            onClick={() => {
              setSelectedTicket(params.row)
              setShowTicketModal(true)
            }}
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
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading tickets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Tickets</h1>
            <p className="text-gray-600">Review, assign, and manage company tickets</p>
          </div>
          <Button onClick={fetchTickets} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets by title, description, ticket number, or reporter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
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
            
            {showFilters && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {statusOptions.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        {priorityOptions.map(priority => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {typeOptions.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
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

        {/* Results Summary */}
        {getActiveFilterCount() > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Showing {filteredTickets.length} of {tickets.length} tickets</span>
            <span>{getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? 's' : ''} applied</span>
          </div>
        )}

        {/* Tickets Table */}
        <Card>
          <CardContent className="p-0">
            {filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Ticket className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tickets.length === 0 ? 'No tickets yet' : 'No tickets match your filters'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {tickets.length === 0 
                    ? 'Tickets will appear here once users create them'
                    : 'Try adjusting your search criteria'
                  }
                </p>
                {tickets.length > 0 && (
                  <Button variant="outline" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <Box sx={{ width: '100%' }}>
                <DataGrid
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
                  getRowClassName={(params) => {
                    const hasRejection = params.row.rejectedAt && params.row.status === 'OPEN'
                    const hasCancellationRequest = params.row.cancellationRequestedAt && !params.row.cancelledAt
                    if (hasRejection) return 'bg-red-50'
                    if (hasCancellationRequest) return 'bg-amber-50'
                    return ''
                  }}
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
                    '& .bg-red-50': {
                      backgroundColor: '#fef2f2 !important',
                      borderLeft: '4px solid #ef4444',
                    },
                    '& .bg-amber-50': {
                      backgroundColor: '#fffbeb !important',
                      borderLeft: '4px solid #f59e0b',
                    },
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Ticket Detail Modal */}
        <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Ticket Details</span>
                {selectedTicket && (
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {selectedTicket && (
              <div className="space-y-6">
                {/* Ticket Header */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {selectedTicket.title}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Ticket ID:</span> {selectedTicket.ticketNumber}</p>
                      <p><span className="font-medium">Type:</span> {selectedTicket.type}</p>
                      <p><span className="font-medium">Created:</span> {new Date(selectedTicket.createdAt).toLocaleDateString()}</p>
                      <p><span className="font-medium">Reporter:</span> {selectedTicket.reporterName || selectedTicket.user.name}</p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Assigned To:</p>
                        {selectedTicket.assignedTo ? (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-900">{selectedTicket.assignedTo.name}</p>
                              <p className="text-xs text-gray-500">
                                {selectedTicket.hqAssignedAt ? 'HQ Staff' : 'Contractor'}
                              </p>
                            </div>
                            {!['CANCELLED', 'CLOSED', 'COMPLETED'].includes(selectedTicket.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => setShowUnassignConfirm(true)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Revoke
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Unassigned</p>
                        )}
                      </div>
                      
                      {selectedTicket.asset && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Related Asset:</p>
                          <p className="text-sm text-gray-900">{selectedTicket.asset.name} ({selectedTicket.asset.assetNumber})</p>
                          <p className="text-xs text-gray-500">{selectedTicket.asset.location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedTicket.description}</p>
                </div>

                {/* Attachments */}
                {selectedTicket.attachments.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Media & Attachments</h4>
                    <MediaViewer 
                      files={selectedTicket.attachments}
                      gridCols={3}
                      thumbnailSize="md"
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

                {/* Assignment Section - Only show for non-cancelled/closed tickets without contractor */}
                {!selectedTicket.assignedTo && !['CANCELLED', 'CLOSED', 'COMPLETED'].includes(selectedTicket.status) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Assign Ticket</h4>
                    
                    {/* Assignment Type Toggle */}
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={assignmentType === 'contractor' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAssignmentType('contractor')}
                      >
                        To Contractor
                      </Button>
                      <Button
                        variant={assignmentType === 'hq-admin' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAssignmentType('hq-admin')}
                      >
                        To HQ Staff
                      </Button>
                    </div>

                    {assignmentType === 'contractor' ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="contractor">Select Contractor</Label>
                          <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a contractor" />
                            </SelectTrigger>
                            <SelectContent>
                              {contractors.length === 0 ? (
                                <SelectItem value="no-contractors" disabled>
                                  No contractors available
                                </SelectItem>
                              ) : (
                                contractors.map(contractor => (
                                  <SelectItem key={contractor.id} value={contractor.id}>
                                    {contractor.name || contractor.email} {contractor.isAvailable ? '' : '(Busy)'}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="notes">Assignment Notes</Label>
                          <Textarea
                            id="notes"
                            placeholder="Add instructions or notes for the contractor..."
                            value={assignmentNotes}
                            onChange={(e) => setAssignmentNotes(e.target.value)}
                          />
                        </div>
                        
                        <Button 
                          onClick={handleAssignContractor} 
                          disabled={!selectedContractor}
                          className="w-full"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Assign to Contractor
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 mb-2">
                          Assign to yourself or another HQ admin to handle this ticket internally.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            onClick={handleAssignToSelf}
                            variant="default"
                            className="w-full"
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Assign to Me
                          </Button>
                          
                          <Select value={selectedHQAdmin} onValueChange={setSelectedHQAdmin}>
                            <SelectTrigger>
                              <SelectValue placeholder="Other HQ Admin" />
                            </SelectTrigger>
                            <SelectContent>
                              {hqAdmins.length === 0 ? (
                                <SelectItem value="no-admins" disabled>
                                  No other admins
                                </SelectItem>
                              ) : (
                                hqAdmins.map(admin => (
                                  <SelectItem key={admin.id} value={admin.id}>
                                    {admin.name || admin.email}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {selectedHQAdmin && (
                          <Button 
                            onClick={handleAssignToHQAdmin}
                            className="w-full"
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Assign to Selected Admin
                          </Button>
                        )}
                        
                        <div>
                          <Label htmlFor="hq-notes">Notes (Optional)</Label>
                          <Textarea
                            id="hq-notes"
                            placeholder="Add notes about the assignment..."
                            value={assignmentNotes}
                            onChange={(e) => setAssignmentNotes(e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* HQ Admin Job Complete Section - Show when ticket is HQ-assigned and current user is the assigned admin */}
                {selectedTicket.hqAssignedAt && 
                 selectedTicket.assignedTo?.id === user.id && 
                 !['CANCELLED', 'CLOSED', 'COMPLETED'].includes(selectedTicket.status) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
                      HQ Assignment - Your Ticket
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      This ticket is assigned to you. When you have completed the work, click &quot;Mark Job Complete&quot; 
                      to notify the user for review and rating.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="completion-notes">Completion Notes (Optional)</Label>
                        <Textarea
                          id="completion-notes"
                          placeholder="Describe what was done to resolve this ticket..."
                          value={hqCompletionNotes}
                          onChange={(e) => setHQCompletionNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button 
                        onClick={handleHQJobComplete}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Job Complete
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cancelled status message */}
                {selectedTicket.status === 'CANCELLED' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-red-800 mb-2">Ticket Cancelled</h4>
                    <p className="text-sm text-red-600">
                      This ticket has been cancelled and cannot be assigned to a contractor.
                    </p>
                    {selectedTicket.cancellationReason && (
                      <div className="mt-2 p-2 bg-red-100 rounded">
                        <p className="text-xs text-red-700 font-medium">Cancellation Reason:</p>
                        <p className="text-sm text-red-800">{selectedTicket.cancellationReason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Awaiting Description - Contractor needs to submit work description */}
                {selectedTicket.status === 'AWAITING_DESCRIPTION' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-amber-800 mb-2 flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Awaiting Work Description
                    </h4>
                    <p className="text-sm text-amber-700">
                      The user has marked this job as complete. Waiting for the contractor to submit a description of the work done.
                    </p>
                    {selectedTicket.workDescriptionRejectionReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs text-red-700 font-medium">Previous description was rejected:</p>
                        <p className="text-sm text-red-800">{selectedTicket.workDescriptionRejectionReason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Awaiting Work Approval - User needs to approve description */}
                {selectedTicket.status === 'AWAITING_WORK_APPROVAL' && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-indigo-800 mb-2 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Awaiting User Approval
                    </h4>
                    <p className="text-sm text-indigo-700 mb-3">
                      The contractor has submitted a work description. Waiting for user to review and approve.
                    </p>
                    {selectedTicket.workDescription && (
                      <div className="p-3 bg-white border border-indigo-100 rounded">
                        <p className="text-xs text-gray-500 font-medium mb-1">Work Description:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.workDescription}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Completed status message - Updated with work description info */}
                {selectedTicket.status === 'COMPLETED' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      Job Completed - Work Approved
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      The user has approved the work description. Waiting for user to close and rate. Contractor can now upload invoice.
                    </p>
                    {selectedTicket.workDescription && (
                      <div className="p-3 bg-white border border-green-100 rounded">
                        <p className="text-xs text-gray-500 font-medium mb-1">Approved Work Description:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.workDescription}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Invoice Section for CLOSED tickets */}
                {selectedTicket.status === 'CLOSED' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-600" />
                      Invoice
                    </h4>
                    {selectedTicket.invoice ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Invoice Number</p>
                            <p className="text-lg font-semibold text-gray-900">{selectedTicket.invoice.invoiceNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Amount</p>
                            <p className="text-lg font-semibold text-green-600 flex items-center">
                              <DollarSign className="h-5 w-5" />
                              {selectedTicket.invoice.amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className={
                            selectedTicket.invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                            selectedTicket.invoice.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {selectedTicket.invoice.status}
                          </Badge>
                          <div className="flex items-center space-x-2">
                            {selectedTicket.invoice.invoiceFileUrl && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(selectedTicket.invoice?.invoiceFileUrl, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Invoice PDF
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(`/api/admin/invoices/summary?invoiceId=${selectedTicket.invoice?.id}`, '_blank')}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Summary Doc
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No invoice submitted yet. The contractor will upload their invoice.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Simple Assignment Dialog for already assigned tickets */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reassign Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="contractor">Select New Contractor</Label>
                <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.length === 0 ? (
                      <SelectItem value="no-contractors" disabled>
                        No contractors available
                      </SelectItem>
                    ) : (
                      contractors.map(contractor => (
                        <SelectItem key={contractor.id} value={contractor.id}>
                          {contractor.name || contractor.email} {contractor.isAvailable ? '' : '(Busy)'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignContractor} disabled={!selectedContractor}>
                  Reassign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Unassign Confirmation Dialog */}
        <Dialog open={showUnassignConfirm} onOpenChange={setShowUnassignConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Revoke Assignment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to revoke the assignment from{' '}
                <span className="font-semibold">{selectedTicket?.assignedTo?.name}</span>?
                {selectedTicket?.hqAssignedAt && (
                  <span className="block mt-1 text-blue-600">
                    This is an HQ staff assignment.
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500">
                The ticket will be returned to &quot;Open&quot; status and can be reassigned.
              </p>
              
              <div>
                <Label htmlFor="unassign-reason">Reason (Optional)</Label>
                <Textarea
                  id="unassign-reason"
                  placeholder="Why is this assignment being revoked?"
                  value={unassignReason}
                  onChange={(e) => setUnassignReason(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowUnassignConfirm(false)
                    setUnassignReason('')
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleUnassignTicket}
                  disabled={unassigning}
                >
                  {unassigning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Revoking...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Revoke Assignment
                    </>
                  )}
                </Button>
              </div>
            </div>
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
      </div>
    </div>
  )
}