'use client'

import React from 'react'
import { useEffect, useState, useMemo, useCallback } from 'react'
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
import { MediaViewer, MediaHoverPreview } from '@/components/ui/media-viewer'
import { calculateSLAInfo, getSLAChipColor } from '@/lib/sla-utils'
import {
  Plus,
  Ticket,
  Clock,
  CheckCircle,
  MessageSquare,
  User,
  Calendar,
  AlertCircle,
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
  FileText,
  Download,
  Timer
} from 'lucide-react'
import { toast } from 'sonner'
import { FilterDrawer, FilterButton, ActiveFilterTags, EMPTY_FILTERS, countActiveFilters } from '@/components/FilterDrawer'
import type { FilterState } from '@/components/FilterDrawer'
import { Badge as DSBadge, Avatar, MonoLabel, getInitials, avatarTint, type BadgeVariant } from '@/components/admin/kit'

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
  // Quote/Estimate Workflow fields
  quoteRequested?: boolean
  quoteRequestedAt?: string
  quoteAmount?: number
  quoteDescription?: string
  quoteFileUrl?: string
  quoteSubmittedAt?: string
  quoteApproved?: boolean
  quoteApprovedAt?: string
  quoteRejectionReason?: string
  categoryId?: string
  // SLA tracking fields
  assignedAt?: string
  contractorAcceptedAt?: string
  onSiteAt?: string
  completedAt?: string
  responseDeadline?: string
  resolutionDeadline?: string
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
  branch?: {
    id: string
    name: string
  }
  category?: {
    id: string
    name: string
    color?: string
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
  invoices?: Array<{
    id: string
    invoiceNumber: string
    amount: number
    status: string
    invoiceFileUrl?: string
  }>
  _count: {
    messages: number
  }
}

interface Contractor {
  id: string
  userId: string
  email: string
  name: string
  phone?: string
  bio?: string
  specialties?: string[]
  rating?: number
  totalJobs?: number
  status?: string
  categories?: {
    id: string
    name: string
    color?: string
  }[]
  stats?: {
    totalRatings: number
    totalMaintenanceJobs: number
    avgPunctuality: string
    avgCustomerService: string
    avgWorkmanship: string
  }
  isAvailable?: boolean
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

function getStatusPill(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    OPEN:                    { backgroundColor: '#e8f5ee', color: '#2d6a4f' },
    ASSIGNED:                { backgroundColor: '#fef3c7', color: '#92400e' },
    IN_PROGRESS:             { backgroundColor: '#fef3c7', color: '#92400e' },
    ON_SITE:                 { backgroundColor: '#fef3c7', color: '#92400e' },
    AWAITING_APPROVAL:       { backgroundColor: '#fef3c7', color: '#92400e' },
    AWAITING_QUOTE:          { backgroundColor: '#fef3c7', color: '#92400e' },
    AWAITING_DESCRIPTION:    { backgroundColor: '#fef3c7', color: '#92400e' },
    AWAITING_WORK_APPROVAL:  { backgroundColor: '#fef3c7', color: '#92400e' },
    QUOTE_SUBMITTED:         { backgroundColor: '#fef3c7', color: '#92400e' },
    PROCESSING:              { backgroundColor: '#fef3c7', color: '#92400e' },
    ACCEPTED:                { backgroundColor: '#fef3c7', color: '#92400e' },
    COMPLETED:               { backgroundColor: '#eff6ff', color: '#1e40af' },
    CLOSED:                  { backgroundColor: '#f0efe9', color: '#6b6860' },
    CANCELLED:               { backgroundColor: '#fef2f2', color: '#991b1b' },
  }
  return map[status] || { backgroundColor: '#f0efe9', color: '#6b6860' }
}

function getPriorityPill(priority: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    LOW:      { backgroundColor: '#f0efe9', color: '#6b6860' },
    MEDIUM:   { backgroundColor: '#fef3c7', color: '#92400e' },
    HIGH:     { backgroundColor: '#fef2f2', color: '#991b1b' },
    CRITICAL: { backgroundColor: '#991b1b', color: '#fff' },
  }
  return map[priority] || { backgroundColor: '#f0efe9', color: '#6b6860' }
}

// ── Redesign: status/priority → kit Badge variant (matches dashboard) ──
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  OPEN: 'amber', ASSIGNED: 'blue', ACCEPTED: 'blue', IN_PROGRESS: 'blue', PROCESSING: 'blue',
  ON_SITE: 'violet', AWAITING_QUOTE: 'amber', QUOTE_SUBMITTED: 'amber',
  AWAITING_DESCRIPTION: 'amber', AWAITING_WORK_APPROVAL: 'amber', AWAITING_APPROVAL: 'amber',
  COMPLETED: 'green', CLOSED: 'neutral', CANCELLED: 'red',
}
const PRIORITY_VARIANT: Record<string, BadgeVariant> = { LOW: 'green', MEDIUM: 'amber', HIGH: 'orange', CRITICAL: 'red', URGENT: 'red' }
// Category dot colour: prefer ticket.category.color, else derive from type (seed-style palette).
const TYPE_COLOR: Record<string, string> = {
  REPAIR: '#5A51D6', MAINTENANCE: '#2D6A4F', INSPECTION: '#1E40AF',
  INSTALLATION: '#9A3412', REPLACEMENT: '#5B21B6', EMERGENCY: '#991B1B', OTHER: '#9E9C94',
}
const statusLabel = (s: string) => s.replace(/_/g, ' ')

// Filter chip definitions. Counts always reflect the full dataset.
const CHIP_DEFS: Array<{ key: string; label: string; statuses?: string[] }> = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open', statuses: ['OPEN'] },
  { key: 'assigned', label: 'Assigned', statuses: ['ASSIGNED', 'ACCEPTED', 'PROCESSING'] },
  { key: 'in_progress', label: 'In progress', statuses: ['IN_PROGRESS'] },
  { key: 'on_site', label: 'On site', statuses: ['ON_SITE'] },
  { key: 'awaiting', label: 'Awaiting approval', statuses: ['AWAITING_APPROVAL', 'AWAITING_QUOTE', 'AWAITING_DESCRIPTION', 'AWAITING_WORK_APPROVAL', 'QUOTE_SUBMITTED'] },
  { key: 'completed', label: 'Completed', statuses: ['COMPLETED'] },
  { key: 'closed', label: 'Closed', statuses: ['CLOSED'] },
]

export function AdminTicketManagement({ user }: AdminTicketManagementProps) {
  const [tickets, setTickets] = useState<TicketDetails[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [filteredContractors, setFilteredContractors] = useState<Contractor[]>([])
  const [recommendedContractor, setRecommendedContractor] = useState<Contractor | null>(null)
  const [loadingContractors, setLoadingContractors] = useState(false)
  const [hqAdmins, setHQAdmins] = useState<HQAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [branches, setBranches] = useState<{id: string, name: string}[]>([])
  const [showClosedTickets, setShowClosedTickets] = useState(false)

  // Stat card filter
  const [statFilter, setStatFilter] = useState('') // '' | 'open' | 'in_progress' | 'completed'

  // Redesign: single-select filter chip ('' = All)
  const [chipFilter, setChipFilter] = useState('')

  // Assignment states
  const [selectedContractor, setSelectedContractor] = useState('')
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]) // Multi-select for quote requests
  const [selectedHQAdmin, setSelectedHQAdmin] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [assignmentType, setAssignmentType] = useState<'contractor' | 'hq-admin'>('contractor')
  const [requestQuote, setRequestQuote] = useState(false)

  // Quote request management states
  const [quoteRequests, setQuoteRequests] = useState<any[]>([])
  const [loadingQuoteRequests, setLoadingQuoteRequests] = useState(false)

  // Quote approval states
  const [quoteRejectionReason, setQuoteRejectionReason] = useState('')
  const [processingQuote, setProcessingQuote] = useState(false)

  // Asset editing states
  const [assets, setAssets] = useState<Array<{
    id: string
    name: string
    assetNumber: string
    location: string
    categoryId?: string
    category?: { id: string; name: string; color?: string }
  }>>([])
  const [editingAsset, setEditingAsset] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')
  const [assetUpdateLoading, setAssetUpdateLoading] = useState(false)

  // Auto-refresh interval (30 seconds - background feature)
  const refreshInterval = 30

  const statusOptions = [
    'OPEN', 'AWAITING_QUOTE', 'QUOTE_SUBMITTED', 'PROCESSING', 'ACCEPTED', 'IN_PROGRESS', 'ON_SITE', 'AWAITING_DESCRIPTION', 'AWAITING_WORK_APPROVAL', 'AWAITING_APPROVAL', 'COMPLETED', 'CLOSED', 'CANCELLED'
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
    fetchAssets()
    fetchBranches()
  }, [user])

  // Auto-refresh effect (background) - runs independently
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/admin/tickets')
        if (response.ok) {
          const data = await response.json()
          setTickets(data.tickets || [])
        }
      } catch (error) {
        console.error('Auto-refresh failed:', error)
      }
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [])

  // Fetch filtered contractors when a ticket is selected for assignment
  useEffect(() => {
    if (selectedTicket && showTicketModal && !selectedTicket.assignedTo) {
      // Fetch contractors for this ticket's category
      fetchContractorsForCategory(selectedTicket.categoryId || undefined)
    }
  }, [selectedTicket, showTicketModal])

  // Fetch quote requests when viewing a ticket with quotes
  useEffect(() => {
    if (selectedTicket && showTicketModal &&
        (selectedTicket.status === 'AWAITING_QUOTE' || selectedTicket.status === 'QUOTE_SUBMITTED')) {
      fetchQuoteRequests(selectedTicket.id)
    }
  }, [selectedTicket, showTicketModal])

  // Replace filterTickets() + its useEffect with useMemo
  const filteredTickets = useMemo(() => {
    let result = tickets

    // Hide closed unless stat filter is completed, status filter includes CLOSED, or Closed chip active
    if (!showClosedTickets && !filters.status.includes('CLOSED') && statFilter !== 'completed' && chipFilter !== 'closed') {
      result = result.filter(t => t.status !== 'CLOSED')
    }

    // Filter chip (single-select status group)
    if (chipFilter) {
      const def = CHIP_DEFS.find(d => d.key === chipFilter)
      if (def?.statuses) result = result.filter(t => def.statuses!.includes(t.status))
    }

    // Stat card filter
    if (statFilter === 'open') result = result.filter(t => t.status === 'OPEN')
    else if (statFilter === 'in_progress') result = result.filter(t => ['IN_PROGRESS', 'ASSIGNED', 'ON_SITE', 'AWAITING_APPROVAL', 'AWAITING_QUOTE', 'AWAITING_DESCRIPTION', 'AWAITING_WORK_APPROVAL', 'QUOTE_SUBMITTED', 'PROCESSING', 'ACCEPTED'].includes(t.status))
    else if (statFilter === 'completed') result = result.filter(t => ['COMPLETED', 'CLOSED'].includes(t.status))

    // Text search
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(s) ||
        t.ticketNumber.toLowerCase().includes(s) ||
        t.user?.name?.toLowerCase().includes(s) ||
        t.user?.email?.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s)
      )
    }

    // FilterDrawer filters
    if (filters.status.length > 0) result = result.filter(t => filters.status.includes(t.status))
    if (filters.priority.length > 0) result = result.filter(t => filters.priority.includes(t.priority))
    if (filters.type.length > 0) result = result.filter(t => filters.type.includes(t.type))
    if (filters.branch.length > 0) result = result.filter(t => t.branch && filters.branch.includes(t.branch.id))
    if (filters.date) {
      const now = new Date()
      result = result.filter(t => {
        const created = new Date(t.createdAt)
        if (filters.date === 'today') { const d = new Date(); d.setHours(0,0,0,0); return created >= d }
        if (filters.date === 'week') { const d = new Date(); d.setDate(now.getDate()-7); return created >= d }
        if (filters.date === 'month') { const d = new Date(); d.setMonth(now.getMonth()-1); return created >= d }
        if (filters.date === 'custom') {
          if (filters.dateFrom && created < new Date(filters.dateFrom)) return false
          if (filters.dateTo && created > new Date(filters.dateTo + 'T23:59:59')) return false
        }
        return true
      })
    }

    return result
  }, [tickets, searchTerm, filters, showClosedTickets, statFilter, chipFilter])

  // Chip counts always reflect the full dataset.
  const chips = CHIP_DEFS.map(d => ({
    key: d.key,
    label: d.label,
    count: d.key === '' ? tickets.length : tickets.filter(t => d.statuses!.includes(t.status)).length,
  }))

  // Export the currently visible tickets as CSV.
  const handleExport = () => {
    const header = ['Ticket', 'Title', 'Branch', 'Priority', 'Status', 'Assignee', 'Created']
    const rows = filteredTickets.map(t => [
      t.ticketNumber, t.title, t.branch?.name || '', t.priority, t.status,
      t.assignedTo?.name || 'Unassigned', new Date(t.createdAt).toLocaleDateString(),
    ])
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'tickets.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

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

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/admin/assets')
      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets || [])
      } else {
        console.error('Failed to fetch assets:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches || [])
      } else {
        console.error('Failed to fetch branches:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  // Fetch contractors filtered by ticket category with detailed info
  const fetchContractorsForCategory = async (categoryId?: string) => {
    setLoadingContractors(true)
    setRecommendedContractor(null)
    try {
      const url = categoryId
        ? `/api/admin/contractors/available?categoryId=${categoryId}&autoAssign=true`
        : '/api/admin/contractors/available?autoAssign=true'

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setFilteredContractors(data.contractors || [])
        if (data.recommended) {
          setRecommendedContractor(data.recommended)
        }
      } else {
        console.error('Failed to fetch contractors for category')
        setFilteredContractors([])
      }
    } catch (error) {
      console.error('Failed to fetch contractors:', error)
      setFilteredContractors([])
    } finally {
      setLoadingContractors(false)
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

  // Quick edit menu states
  const [priorityMenuAnchor, setPriorityMenuAnchor] = useState<null | HTMLElement>(null)
  const [typeMenuAnchor, setTypeMenuAnchor] = useState<null | HTMLElement>(null)
  const [contractorMenuAnchor, setContractorMenuAnchor] = useState<null | HTMLElement>(null)
  const [quickEditTicket, setQuickEditTicket] = useState<TicketDetails | null>(null)
  const [quickAssignLoading, setQuickAssignLoading] = useState(false)
  const [quickEditLoading, setQuickEditLoading] = useState(false)

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
          status: requestQuote ? 'AWAITING_QUOTE' : 'PROCESSING',
          requestQuote: requestQuote
        })
      })

      if (response.ok) {
        toast.success(requestQuote ? 'Quote requested from contractor' : 'Ticket assigned to contractor successfully')
        setShowAssignDialog(false)
        setSelectedContractor('')
        setAssignmentNotes('')
        setRequestQuote(false)
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

  // Handle multi-contractor quote request
  const handleRequestQuotesFromMultiple = async () => {
    if (!selectedTicket || selectedContractors.length === 0) {
      toast.error('Please select at least one contractor')
      return
    }

    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/request-quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorIds: selectedContractors,
          notes: assignmentNotes
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Quote requests sent to ${selectedContractors.length} contractor(s)`)
        setShowAssignDialog(false)
        setSelectedContractors([])
        setSelectedContractor('')
        setAssignmentNotes('')
        setRequestQuote(false)
        setShowTicketModal(false)
        fetchTickets()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to request quotes: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to request quotes:', error)
      toast.error('Failed to request quotes: Network error')
    }
  }

  // Fetch quote requests for a ticket
  const fetchQuoteRequests = async (ticketId: string) => {
    setLoadingQuoteRequests(true)
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/request-quotes`)
      if (response.ok) {
        const data = await response.json()
        setQuoteRequests(data.quoteRequests || [])
      }
    } catch (error) {
      console.error('Failed to fetch quote requests:', error)
    } finally {
      setLoadingQuoteRequests(false)
    }
  }

  // Award quote to a contractor
  const handleAwardQuote = async (quoteRequestId: string) => {
    if (!selectedTicket) return

    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/quote-requests/${quoteRequestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'award' })
      })

      if (response.ok) {
        toast.success('Quote awarded successfully!')
        fetchQuoteRequests(selectedTicket.id)
        fetchTickets()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to award quote: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to award quote:', error)
      toast.error('Failed to award quote')
    }
  }

  // Reject a quote
  const handleRejectQuote = async (quoteRequestId: string, reason?: string) => {
    if (!selectedTicket) return

    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/quote-requests/${quoteRequestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason })
      })

      if (response.ok) {
        toast.success('Quote rejected')
        fetchQuoteRequests(selectedTicket.id)
      } else {
        const errorData = await response.json()
        toast.error(`Failed to reject quote: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to reject quote:', error)
      toast.error('Failed to reject quote')
    }
  }

  // Toggle contractor selection for multi-select
  const toggleContractorSelection = (contractorId: string) => {
    setSelectedContractors(prev =>
      prev.includes(contractorId)
        ? prev.filter(id => id !== contractorId)
        : [...prev, contractorId]
    )
  }

  // Handle quote approval or rejection
  const handleQuoteAction = async (action: 'approve' | 'reject') => {
    if (!selectedTicket) return

    if (action === 'reject' && !quoteRejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setProcessingQuote(true)
    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'reject' ? quoteRejectionReason : undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(action === 'approve'
          ? 'Quote approved! Job is now assigned to contractor.'
          : 'Quote rejected. Contractor will be asked to resubmit.')
        setQuoteRejectionReason('')
        setShowTicketModal(false)
        fetchTickets()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || `Failed to ${action} quote`)
      }
    } catch (error) {
      console.error(`Failed to ${action} quote:`, error)
      toast.error(`Failed to ${action} quote`)
    } finally {
      setProcessingQuote(false)
    }
  }

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    setQuickEditLoading(true)
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
    } finally {
      setQuickEditLoading(false)
      setPriorityMenuAnchor(null)
      setQuickEditTicket(null)
    }
  }

  const handleTypeChange = async (ticketId: string, newType: string) => {
    setQuickEditLoading(true)
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType })
      })

      if (response.ok) {
        toast.success('Type updated successfully')
        fetchTickets()
      } else {
        toast.error('Failed to update type')
      }
    } catch (error) {
      console.error('Failed to update type:', error)
      toast.error('Failed to update type')
    } finally {
      setQuickEditLoading(false)
      setTypeMenuAnchor(null)
      setQuickEditTicket(null)
    }
  }

  const handleAssetChange = async () => {
    if (!selectedTicket) return

    setAssetUpdateLoading(true)
    try {
      // Get the selected asset's category
      const selectedAsset = assets.find(a => a.id === selectedAssetId)
      const categoryId = selectedAsset?.categoryId || null

      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetId || null,
          categoryId: categoryId // Update category based on asset
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Asset updated successfully')
        setEditingAsset(false)
        fetchTickets()
        // Update the selected ticket with new data
        setSelectedTicket(prev => prev ? {
          ...prev,
          asset: data.ticket.asset,
          category: data.ticket.category,
          categoryId: data.ticket.category?.id
        } : null)
        // Refetch contractors for new category
        if (categoryId) {
          fetchContractorsForCategory(categoryId)
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update asset')
      }
    } catch (error) {
      console.error('Failed to update asset:', error)
      toast.error('Failed to update asset')
    } finally {
      setAssetUpdateLoading(false)
    }
  }

  const handleQuickAssign = async (ticketId: string, contractorId: string) => {
    setQuickAssignLoading(true)
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId,
          notes: '',
          status: 'PROCESSING'
        })
      })

      if (response.ok) {
        toast.success('Contractor assigned successfully')
        fetchTickets()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to assign: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to assign contractor:', error)
      toast.error('Failed to assign contractor')
    } finally {
      setQuickAssignLoading(false)
      setContractorMenuAnchor(null)
      setQuickEditTicket(null)
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

  const getStatusColor = (status: string): React.CSSProperties => {
    const colors: Record<string, React.CSSProperties> = {
      OPEN: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      AWAITING_QUOTE: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      QUOTE_SUBMITTED: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      PROCESSING: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      ACCEPTED: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      IN_PROGRESS: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      ON_SITE: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      AWAITING_DESCRIPTION: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      AWAITING_WORK_APPROVAL: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      AWAITING_APPROVAL: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      COMPLETED: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' },
      CLOSED: { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' },
      CANCELLED: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }
    }
    return colors[status] || { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }
  }

  const getPriorityColor = (priority: string): React.CSSProperties => {
    const colors: Record<string, React.CSSProperties> = {
      LOW: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' },
      MEDIUM: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      HIGH: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' },
      CRITICAL: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' },
      URGENT: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }
    }
    return colors[priority] || { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': case 'CLOSED': return <CheckCircle className="h-4 w-4 text-ds-green" />
      case 'PROCESSING': case 'ACCEPTED': case 'IN_PROGRESS': case 'ON_SITE': return <Clock className="h-4 w-4 text-ds-amber" />
      case 'CANCELLED': return <X className="h-4 w-4 text-ds-red" />
      case 'OPEN': return <AlertCircle className="h-4 w-4 text-ds-blue" />
      default: return <Ticket className="h-4 w-4 text-ds-blue" />
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading tickets...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* FilterDrawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={setFilters}
        filters={filters}
        sections={['status', 'priority', 'type', 'date', 'branch']}
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
        branches={branches}
      />

      {/* Page */}
      <div style={{ padding: '26px 32px 48px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 300, letterSpacing: '-0.03em' }}>Tickets</h1>
              <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                <span style={{ fontFamily: 'DM Mono, monospace' }}>{filteredTickets.length}</span> of {tickets.length} shown
              </p>
            </div>
          </div>

          {/* Filter chips + controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {chips.map(chip => (
              <button
                key={chip.key || 'all'}
                className={`filter-chip${chipFilter === chip.key ? ' active' : ''}`}
                onClick={() => setChipFilter(chip.key)}
              >
                {chip.label}
                <span className="chip-count">{chip.count}</span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative' }}>
              <Search size={13} strokeWidth={1.6} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search tickets…"
                style={{ height: 34, width: 220, paddingLeft: 32, paddingRight: 12, fontSize: 13, border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <FilterButton isOpen={filterDrawerOpen} activeCount={countActiveFilters(filters)} onClick={() => setFilterDrawerOpen(o => !o)} />
            <button onClick={fetchTickets} title="Refresh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34, width: 34, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', color: 'var(--text-tertiary)' }}>
              <RefreshCw size={13} strokeWidth={1.6} />
            </button>
            <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 13px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12.5, color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              <Download size={13} strokeWidth={1.6} />
              Export
            </button>
          </div>

          {/* Active advanced-filter tags */}
          <ActiveFilterTags
            filters={filters}
            statusOptions={statusOptions.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))}
            branches={branches}
            onRemove={removeFilter}
            onClearAll={clearAllFilters}
          />

          {/* Table card */}
          <div className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="ds-thead" style={{ display: 'grid', gridTemplateColumns: '88px 1fr 150px 100px 140px 150px 86px', gap: 12, padding: '11px 22px', borderBottom: '1px solid var(--border-inner)' }}>
              <span>ID</span><span>SUBJECT</span><span>BRANCH</span><span>PRIORITY</span><span>STATUS</span><span>ASSIGNEE</span><span>CREATED</span>
            </div>
            {filteredTickets.map(ticket => {
              const at = ticket.assignedTo ? avatarTint(ticket.assignedTo.name || ticket.assignedTo.email) : null
              const catColor = ticket.category?.color || TYPE_COLOR[ticket.type] || 'var(--text-muted)'
              return (
                <div
                  key={ticket.id}
                  className="ds-row"
                  onClick={() => { setSelectedTicket(ticket); setShowTicketModal(true) }}
                  style={{ display: 'grid', gridTemplateColumns: '88px 1fr 150px 100px 140px 150px 86px', gap: 12, alignItems: 'center', padding: '14px 22px', cursor: 'pointer' }}
                >
                  <MonoLabel size={11.5} spacing="0" color="var(--text-secondary)" style={{ textTransform: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.ticketNumber}</MonoLabel>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: catColor, flex: 'none' }} />
                    <span style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.title}</span>
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.branch?.name || '—'}</span>
                  <span><DSBadge variant={PRIORITY_VARIANT[ticket.priority] || 'neutral'}>{ticket.priority}</DSBadge></span>
                  <span><DSBadge variant={STATUS_VARIANT[ticket.status] || 'neutral'}>{statusLabel(ticket.status)}</DSBadge></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {ticket.assignedTo && at ? (
                      <>
                        <Avatar initials={getInitials(ticket.assignedTo.name, ticket.assignedTo.email)} size={24} tint={at.tint} color={at.color} />
                        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.assignedTo.name || ticket.assignedTo.email}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              )
            })}
            {filteredTickets.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', gap: 6 }}>
                <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>No tickets found</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Try adjusting your filters</div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--row-sep)' }}>
              <span>Showing {filteredTickets.length} of {tickets.length} tickets</span>
              <MonoLabel size={11} spacing="0" color="var(--text-muted)" style={{ textTransform: 'none' }}>‹ 1 ›</MonoLabel>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Ticket Details</span>
              {selectedTicket && (
                <div className="flex items-center space-x-2">
                  <Badge style={getStatusColor(selectedTicket.status)}>
                    {selectedTicket.status.replace('_', ' ')}
                  </Badge>
                  <Badge style={getPriorityColor(selectedTicket.priority)}>
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
                  <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    {selectedTicket.title}
                  </h3>
                  <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <p><span className="font-medium">Ticket ID:</span> {selectedTicket.ticketNumber}</p>
                    <p><span className="font-medium">Type:</span> {selectedTicket.type}</p>
                    <p><span className="font-medium">Created:</span> {new Date(selectedTicket.createdAt).toLocaleDateString()}</p>
                    <p><span className="font-medium">Reporter:</span> {selectedTicket.reporterName || selectedTicket.user.name}</p>
                  </div>
                </div>

                <div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Assigned To:</p>
                      {selectedTicket.assignedTo ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedTicket.assignedTo.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {selectedTicket.hqAssignedAt ? 'HQ Staff' : 'Contractor'}
                            </p>
                          </div>
                          {!['CANCELLED', 'CLOSED', 'COMPLETED'].includes(selectedTicket.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                              onClick={() => setShowUnassignConfirm(true)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted">Unassigned</p>
                      )}
                    </div>

                    {selectedTicket.asset && (
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Related Asset:</p>
                          {!['CANCELLED', 'CLOSED', 'COMPLETED'].includes(selectedTicket.status) && !editingAsset && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAssetId(selectedTicket.asset?.id || '')
                                setEditingAsset(true)
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Change
                            </Button>
                          )}
                        </div>
                        {!editingAsset ? (
                          <>
                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedTicket.asset.name} ({selectedTicket.asset.assetNumber})</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedTicket.asset.location}</p>
                            {selectedTicket.category && (
                              <Badge variant="outline" className="mt-1" style={{ borderColor: selectedTicket.category.color }}>
                                {selectedTicket.category.name}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <div className="space-y-2 mt-2">
                            <Select value={selectedAssetId || 'none'} onValueChange={(v) => setSelectedAssetId(v === 'none' ? '' : v)}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select an asset..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Asset</SelectItem>
                                {assets.map(asset => (
                                  <SelectItem key={asset.id} value={asset.id}>
                                    {asset.name} ({asset.assetNumber}) - {asset.category?.name || 'No Category'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleAssetChange}
                                disabled={assetUpdateLoading}
                              >
                                {assetUpdateLoading ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingAsset(false)}
                                disabled={assetUpdateLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              * Category will be updated to match the selected asset
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show add asset option if no asset is set */}
                    {!selectedTicket.asset && !['CANCELLED', 'CLOSED', 'COMPLETED'].includes(selectedTicket.status) && (
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Related Asset:</p>
                          {!editingAsset && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAssetId('')
                                setEditingAsset(true)
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                        {!editingAsset ? (
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No asset linked</p>
                        ) : (
                          <div className="space-y-2 mt-2">
                            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select an asset..." />
                              </SelectTrigger>
                              <SelectContent>
                                {assets.map(asset => (
                                  <SelectItem key={asset.id} value={asset.id}>
                                    {asset.name} ({asset.assetNumber}) - {asset.category?.name || 'No Category'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleAssetChange}
                                disabled={assetUpdateLoading || !selectedAssetId}
                              >
                                {assetUpdateLoading ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingAsset(false)}
                                disabled={assetUpdateLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              * Category will be updated to match the selected asset
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Description</h4>
                <p className="p-4 rounded-lg" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface2)' }}>{selectedTicket.description}</p>
              </div>

              {/* Attachments */}
              {selectedTicket.attachments.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Media & Attachments</h4>
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
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                  <h4 className="text-lg font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Assign Ticket</h4>

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
                    <div className="space-y-4">
                      {/* Recommended Contractor */}
                      {recommendedContractor && (
                        <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--green)' }}>
                              <Star className="h-4 w-4 fill-current text-ds-amber" />
                              Recommended Contractor
                            </span>
                            <Button
                              size="sm"
                              variant="default"
                              style={{ backgroundColor: 'var(--green)' }}
                              onClick={() => setSelectedContractor(recommendedContractor.userId)}
                            >
                              Auto-Assign
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{recommendedContractor.name}</p>
                              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <span className="font-medium cursor-help" style={{ color: 'var(--accent)' }}>
                                  {recommendedContractor.rating?.toFixed(1) || '-'}
                                </span>
                                <span>•</span>
                                <span>{recommendedContractor.totalJobs || 0} jobs</span>
                                {recommendedContractor.stats && (
                                  <>
                                    <span>•</span>
                                    <span>{recommendedContractor.stats.totalRatings} reviews</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Contractor Loading State */}
                      {loadingContractors && (
                        <div className="text-center py-4">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto text-text-muted" />
                          <p className="text-sm text-text-muted mt-1">Finding contractors for this category...</p>
                        </div>
                      )}

                      {/* Request Quote Option - Moved to top */}
                      <div className="flex items-center space-x-2 p-3 rounded-lg border" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                        <input
                          type="checkbox"
                          id="requestQuote"
                          checked={requestQuote}
                          onChange={(e) => {
                            setRequestQuote(e.target.checked)
                            if (!e.target.checked) {
                              setSelectedContractors([])
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-ds-amber focus:ring-amber-500"
                        />
                        <Label htmlFor="requestQuote" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--amber)' }}>
                          Request Quote/Estimate First (can select multiple contractors)
                        </Label>
                      </div>

                      {/* Contractor Selection */}
                      {!loadingContractors && (
                        <>
                          {requestQuote ? (
                            // Multi-select for quote requests
                            <div>
                              <Label className="mb-2 block">
                                Select Contractors for Quote Request
                                {selectedContractors.length > 0 && (
                                  <Badge variant="secondary" className="ml-2">
                                    {selectedContractors.length} selected
                                  </Badge>
                                )}
                              </Label>
                              <div className="border rounded-lg max-h-64 overflow-y-auto">
                                {filteredContractors.length === 0 ? (
                                  <p className="p-4 text-sm text-text-muted text-center">
                                    No contractors available for this category
                                  </p>
                                ) : (
                                  filteredContractors.map(contractor => (
                                    <div
                                      key={contractor.id}
                                      className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer transition-colors`}
                                      style={selectedContractors.includes(contractor.userId) ? { backgroundColor: 'var(--amber-bg)', borderLeft: '4px solid var(--amber)' } : {}}
                                      onClick={() => toggleContractorSelection(contractor.userId)}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedContractors.includes(contractor.userId)}
                                        onChange={() => {}}
                                        className="h-4 w-4 rounded border-gray-300 text-ds-amber focus:ring-amber-500"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{contractor.name}</span>
                                          <span className="font-medium" style={{ color: 'var(--accent)' }}>
                                            ★ {contractor.rating?.toFixed(1) || '-'}
                                          </span>
                                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            ({contractor.totalJobs || 0} jobs)
                                          </span>
                                        </div>
                                        {contractor.categories && contractor.categories.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {contractor.categories.slice(0, 3).map(cat => (
                                              <Badge
                                                key={cat.id}
                                                variant="outline"
                                                className="text-xs"
                                                style={{ borderColor: cat.color, color: cat.color }}
                                              >
                                                {cat.name}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                              {selectedContractors.length > 0 && (
                                <p className="text-xs mt-2" style={{ color: 'var(--amber)' }}>
                                  Quote requests will be sent to {selectedContractors.length} contractor(s). You can compare and award the job later.
                                </p>
                              )}
                            </div>
                          ) : (
                            // Single select for direct assignment
                            <>
                              <div>
                                <Label htmlFor="contractor">
                                  Select Contractor
                                  {selectedTicket?.category && (
                                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                                      (filtered by: {typeof selectedTicket.category === 'object' ? selectedTicket.category.name : selectedTicket.category})
                                    </span>
                                  )}
                                </Label>
                                <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a contractor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filteredContractors.length === 0 ? (
                                      <SelectItem value="no-contractors" disabled>
                                        No contractors available for this category
                                      </SelectItem>
                                    ) : (
                                      filteredContractors.map(contractor => (
                                        <SelectItem key={contractor.id} value={contractor.userId}>
                                          <div className="flex items-center gap-2">
                                            <span>{contractor.name}</span>
                                            <span className="font-medium" style={{ color: 'var(--ds-blue)' }}>
                                              {contractor.rating?.toFixed(1) || '-'}
                                            </span>
                                            <span className="text-xs text-text-muted">
                                              ({contractor.totalJobs || 0} jobs)
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Selected Contractor Details */}
                              {selectedContractor && (
                                <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--blue)' }}>
                                  {(() => {
                                    const contractor = filteredContractors.find(c => c.userId === selectedContractor)
                                    if (!contractor) return null
                                    return (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{contractor.name}</span>
                                          <span className="text-lg font-medium cursor-help" style={{ color: 'var(--accent)' }}>
                                            {contractor.rating?.toFixed(1) || '-'}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                          <div className="text-center p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                                            <div className="font-medium" style={{ color: 'var(--accent)' }}>{contractor.stats?.avgPunctuality || '-'}</div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Punctuality</div>
                                          </div>
                                          <div className="text-center p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                                            <div className="font-medium" style={{ color: 'var(--green)' }}>{contractor.stats?.avgCustomerService || '-'}</div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Service</div>
                                          </div>
                                          <div className="text-center p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{contractor.stats?.avgWorkmanship || '-'}</div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Workmanship</div>
                                          </div>
                                        </div>
                                        {contractor.categories && contractor.categories.length > 0 && (
                                          <div className="flex flex-wrap gap-1 pt-1">
                                            {contractor.categories.slice(0, 5).map(cat => (
                                              <Badge
                                                key={cat.id}
                                                variant="outline"
                                                className="text-xs"
                                                style={{ borderColor: cat.color, color: cat.color }}
                                              >
                                                {cat.name}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}

                      <div>
                        <Label htmlFor="notes">Assignment Notes</Label>
                        <Textarea
                          id="notes"
                          placeholder="Add instructions or notes for the contractor..."
                          value={assignmentNotes}
                          onChange={(e) => setAssignmentNotes(e.target.value)}
                        />
                      </div>

                      {requestQuote ? (
                        <Button
                          onClick={handleRequestQuotesFromMultiple}
                          disabled={selectedContractors.length === 0 || loadingContractors}
                          className="w-full bg-amber-bg hover:bg-amber-bg"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Request Quotes from {selectedContractors.length} Contractor{selectedContractors.length !== 1 ? 's' : ''}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleAssignContractor}
                          disabled={!selectedContractor || loadingContractors}
                          className="w-full"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Assign to Contractor
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
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
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--blue)' }}>
                  <h4 className="text-lg font-medium mb-3 flex items-center" style={{ color: 'var(--text-primary)' }}>
                    <UserCheck className="h-5 w-5 mr-2" style={{ color: 'var(--blue)' }} />
                    HQ Assignment - Your Ticket
                  </h4>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
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
                      style={{ backgroundColor: 'var(--green)' }}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Job Complete
                    </Button>
                  </div>
                </div>
              )}

              {/* Awaiting Quote / Quote Submitted - Show all quote requests */}
              {(selectedTicket.status === 'AWAITING_QUOTE' || selectedTicket.status === 'QUOTE_SUBMITTED') && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium flex items-center" style={{ color: 'var(--amber)' }}>
                      <FileText className="h-5 w-5 mr-2" />
                      Quote Requests
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchQuoteRequests(selectedTicket.id)}
                      disabled={loadingQuoteRequests}
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingQuoteRequests ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {loadingQuoteRequests ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-ds-amber" />
                      <p className="text-sm mt-1" style={{ color: 'var(--amber)' }}>Loading quote requests...</p>
                    </div>
                  ) : quoteRequests.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm" style={{ color: 'var(--amber)' }}>
                        {selectedTicket.assignedTo
                          ? `Waiting for ${selectedTicket.assignedTo.name || 'the contractor'} to submit a quote.`
                          : 'No quote requests found. Use the multi-select option to request quotes.'}
                      </p>
                      <p className="text-xs mt-2" style={{ color: 'var(--amber)' }}>
                        Quote requested: {selectedTicket.quoteRequestedAt && new Date(selectedTicket.quoteRequestedAt).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quoteRequests.map((qr) => (
                        <div
                          key={qr.id}
                          className="rounded-lg p-4 border"
                          style={
                            qr.isAwarded ? { backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' } :
                            qr.status === 'submitted' ? { backgroundColor: 'var(--surface)', borderColor: 'var(--blue)' } :
                            qr.status === 'rejected' ? { backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' } :
                            { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }
                          }
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span
                                style={{
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  color: 'var(--accent)',
                                  minWidth: '20px'
                                }}
                              >
                                {(qr.contractor?.name || 'C')[0].toUpperCase()}
                              </span>
                              <div>
                                <p className="font-medium">{qr.contractor?.name || 'Contractor'}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{qr.contractor?.email}</p>
                              </div>
                            </div>
                            <Badge variant={
                              qr.isAwarded ? 'default' :
                              qr.status === 'submitted' ? 'secondary' :
                              qr.status === 'rejected' ? 'destructive' :
                              'outline'
                            } style={qr.isAwarded ? { backgroundColor: 'var(--green)' } : {}}>
                              {qr.isAwarded ? '✓ Awarded' : qr.status.toUpperCase()}
                            </Badge>
                          </div>

                          {qr.status === 'submitted' && (
                            <>
                              <div className="flex justify-between items-center mt-3">
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Quoted Amount:</span>
                                <span className="text-xl font-medium" style={{ color: 'var(--blue)' }}>
                                  ${qr.quoteAmount?.toFixed(2) || 'N/A'}
                                </span>
                              </div>
                              {qr.estimatedDays && (
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Est. completion:</span>
                                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{qr.estimatedDays} day(s)</span>
                                </div>
                              )}
                              {qr.quoteDescription && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Description:</p>
                                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{qr.quoteDescription}</p>
                                </div>
                              )}
                              {qr.quoteFileUrl && (
                                <a
                                  href={qr.quoteFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm flex items-center mt-2" style={{ color: 'var(--accent)' }}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  View Quote Document
                                </a>
                              )}
                              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                Submitted: {qr.submittedAt && new Date(qr.submittedAt).toLocaleString()}
                              </p>

                              {!qr.isAwarded && qr.status === 'submitted' && (
                                <div className="flex space-x-2 mt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRejectQuote(qr.id)}
                                    className="flex-1"
                                    style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAwardQuote(qr.id)}
                                    className="flex-1"
                                    style={{ backgroundColor: 'var(--green)' }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Award Job
                                  </Button>
                                </div>
                              )}
                            </>
                          )}

                          {qr.status === 'pending' && (
                            <p className="text-sm mt-2" style={{ color: 'var(--amber)' }}>
                              <Clock className="h-4 w-4 inline mr-1" />
                              Awaiting quote submission...
                            </p>
                          )}

                          {qr.status === 'rejected' && qr.rejectionReason && (
                            <p className="text-sm mt-2" style={{ color: 'var(--red)' }}>
                              Reason: {qr.rejectionReason}
                            </p>
                          )}

                          {qr.isAwarded && (
                            <p className="text-sm mt-2 font-medium" style={{ color: 'var(--green)' }}>
                              🎉 This contractor was awarded the job
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Summary */}
                      {quoteRequests.filter(qr => qr.status === 'submitted').length > 1 && !quoteRequests.some(qr => qr.isAwarded) && (
                        <div className="border rounded-lg p-3 mt-4" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--blue)' }}>
                          <p className="text-sm" style={{ color: 'var(--blue)' }}>
                            <strong>{quoteRequests.filter(qr => qr.status === 'submitted').length}</strong> quotes received.
                            Compare and select the best contractor for this job.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Cancelled status message */}
              {selectedTicket.status === 'CANCELLED' && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' }}>
                  <h4 className="text-lg font-medium mb-2" style={{ color: 'var(--red)' }}>Ticket Cancelled</h4>
                  <p className="text-sm" style={{ color: 'var(--red)' }}>
                    This ticket has been cancelled and cannot be assigned to a contractor.
                  </p>
                  {selectedTicket.cancellationReason && (
                    <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'var(--red-bg)' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>Cancellation Reason:</p>
                      <p className="text-sm" style={{ color: 'var(--red)' }}>{selectedTicket.cancellationReason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Awaiting Description - Contractor needs to submit work description */}
              {selectedTicket.status === 'AWAITING_DESCRIPTION' && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                  <h4 className="text-lg font-medium mb-2 flex items-center" style={{ color: 'var(--amber)' }}>
                    <Clock className="h-5 w-5 mr-2" />
                    Awaiting Work Description
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--amber)' }}>
                    The user has marked this job as complete. Waiting for the contractor to submit a description of the work done.
                  </p>
                  {selectedTicket.workDescriptionRejectionReason && (
                    <div className="mt-2 p-2 border rounded" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>Previous description was rejected:</p>
                      <p className="text-sm" style={{ color: 'var(--red)' }}>{selectedTicket.workDescriptionRejectionReason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Awaiting Work Approval - User needs to approve description */}
              {selectedTicket.status === 'AWAITING_WORK_APPROVAL' && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--blue)' }}>
                  <h4 className="text-lg font-medium mb-2 flex items-center" style={{ color: 'var(--blue)' }}>
                    <FileText className="h-5 w-5 mr-2" />
                    Awaiting User Approval
                  </h4>
                  <p className="text-sm mb-3" style={{ color: 'var(--blue)' }}>
                    The contractor has submitted a work description. Waiting for user to review and approve.
                  </p>
                  {selectedTicket.workDescription && (
                    <div className="p-3 border rounded" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Work Description:</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{selectedTicket.workDescription}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Completed status message - Updated with work description info */}
              {selectedTicket.status === 'COMPLETED' && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }}>
                  <h4 className="text-lg font-medium mb-3 flex items-center" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle className="h-5 w-5 mr-2" style={{ color: 'var(--green)' }} />
                    Job Completed - Work Approved
                  </h4>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    The user has approved the work description. Waiting for user to close and rate. Contractor can now upload invoice.
                  </p>
                  {selectedTicket.workDescription && (
                    <div className="p-3 border rounded" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--green)' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Approved Work Description:</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{selectedTicket.workDescription}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Invoice Section for CLOSED tickets */}
              {selectedTicket.status === 'CLOSED' && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--blue)' }}>
                  <h4 className="text-lg font-medium mb-3 flex items-center" style={{ color: 'var(--text-primary)' }}>
                    <FileText className="h-5 w-5 mr-2" style={{ color: 'var(--blue)' }} />
                    Invoice
                  </h4>
                  {selectedTicket.invoices?.[0] ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Invoice Number</p>
                          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{selectedTicket.invoices[0].invoiceNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Amount</p>
                          <p className="text-lg font-medium flex items-center" style={{ color: 'var(--green)' }}>
                            <DollarSign className="h-5 w-5" />
                            {selectedTicket.invoices[0].amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant={
                          selectedTicket.invoices[0].status === 'PAID' ? 'success' :
                          selectedTicket.invoices[0].status === 'APPROVED' ? 'info' :
                          'warning'
                        }>
                          {selectedTicket.invoices[0].status}
                        </Badge>
                        <div className="flex items-center space-x-2">
                          {selectedTicket.invoices[0].invoiceFileUrl && (
                            <MediaHoverPreview
                              file={{ url: selectedTicket.invoices[0].invoiceFileUrl, filename: 'Invoice PDF', mimeType: 'application/pdf' }}
                              previewSize="lg"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(selectedTicket.invoices?.[0]?.invoiceFileUrl, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Invoice PDF
                              </Button>
                            </MediaHoverPreview>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/admin/invoices/summary?invoiceId=${selectedTicket.invoices?.[0]?.id}`, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Summary Doc
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
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
            <DialogTitle className="flex items-center text-ds-red">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Revoke Assignment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to revoke the assignment from{' '}
              <span className="font-medium">{selectedTicket?.assignedTo?.name}</span>?
              {selectedTicket?.hqAssignedAt && (
                <span className="block mt-1" style={{ color: 'var(--blue)' }}>
                  This is an HQ staff assignment.
                </span>
              )}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
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
  )
}
