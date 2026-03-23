'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { TicketChat } from '@/components/tickets/ticket-chat'
import { MediaViewer } from '@/components/ui/media-viewer'
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { ScrollableDataGrid } from '@/components/ui/scrollable-data-grid'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { calculateSLAInfo, getSLAChipColor } from '@/lib/sla-utils'
import { 
  Clock, 
  MapPin, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Package,
  User,
  Eye,
  RefreshCw,
  X,
  Phone,
  FileText,
  Upload,
  Receipt,
  Star,
  Shield,
  Award,
  Paperclip,
  ToggleLeft,
  Timer,
  Wrench,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { FilterDrawer, FilterButton, ActiveFilterTags, EMPTY_FILTERS, countActiveFilters } from '@/components/FilterDrawer'
import type { FilterState } from '@/components/FilterDrawer'

interface Job {
  id: string
  ticketNumber: string
  title: string
  description: string
  status: string
  priority: string
  type: string
  location?: string
  estimatedHours?: number
  hourlyRate?: number
  scheduledDate?: string
  createdAt: string
  // Work description workflow fields
  workDescriptionRequestedAt?: string
  workDescription?: string
  workDescriptionSubmittedAt?: string
  workDescriptionApproved?: boolean
  workDescriptionApprovedAt?: string
  workDescriptionRejectionReason?: string
  // Quote/Estimate workflow fields
  quoteRequested?: boolean
  quoteRequestedAt?: string
  quoteAmount?: number
  quoteDescription?: string
  quoteFileUrl?: string
  quoteSubmittedAt?: string
  quoteApproved?: boolean
  quoteApprovedAt?: string
  quoteRejectionReason?: string
  // Multi-contractor quote request
  myQuoteRequest?: {
    id: string
    status: string
    quoteAmount?: number
    quoteDescription?: string
    quoteFileUrl?: string
    estimatedDays?: number
    notes?: string
    submittedAt?: string
    requestedAt?: string
  }
  // SLA tracking fields
  assignedAt?: string
  contractorAcceptedAt?: string
  onSiteAt?: string
  completedAt?: string
  responseDeadline?: string
  resolutionDeadline?: string
  tenant: {
    name: string
  }
  user: {
    name: string
    email: string
  }
  asset?: {
    id: string
    name: string
    assetNumber: string
    location: string
    brand?: string
    model?: string
    serialNumber?: string
    status: string
    images: string[]
    category?: {
      id: string
      name: string
      color?: string
      icon?: string
    }
    repairHistory?: {
      id: string
      ticketNumber?: string
      title: string
      description?: string
      status: string
      type: string
      priority?: string
      createdAt: string
      completedAt?: string
      cost?: number
      contractorName?: string
      workDescription?: string
    }[]
  }
  attachments?: {
    id: string
    filename: string
    originalName: string
    url: string
    mimeType: string
  }[]
  invoice?: {
    id: string
    invoiceNumber: string
    amount: number
    status: string
    invoiceFileUrl?: string
  }
  branch?: {
    id: string
    name: string
  }
}

interface JobPlan {
  technicianName: string
  arrivalDate: string
  estimatedDuration: string
  contactNumber: string
  notes: string
}

interface InvoiceForm {
  invoiceNumber: string
  amount: string
  workDescription: string
  variationDescription: string
  file: File | null
}

interface ContractorCategory {
  id: string
  categoryId: string
  categoryName: string
  categoryColor?: string
  categoryIcon?: string
  isAvailable: boolean
  updatedAt: string
}

export function ContractorDashboard() {
  const { data: session } = useSession()
  const [jobs, setJobs] = useState<Job[]>([])
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [categories, setCategories] = useState<ContractorCategory[]>([])
  const [togglingCategory, setTogglingCategory] = useState<string | null>(null)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [expandedRepairId, setExpandedRepairId] = useState<string | null>(null)
  
  // Job Plan state
  const [jobPlan, setJobPlan] = useState<JobPlan>({
    technicianName: '',
    arrivalDate: '',
    estimatedDuration: '',
    contactNumber: '',
    notes: ''
  })
  const [rejectionReason, setRejectionReason] = useState('')
  const [arrivalDateConfirmed, setArrivalDateConfirmed] = useState(false)
  const [deadlineConfirmed, setDeadlineConfirmed] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>({
    invoiceNumber: '',
    amount: '',
    workDescription: '',
    variationDescription: '',
    file: null
  })
  const [uploadingInvoice, setUploadingInvoice] = useState(false)
  
  // Work description submission state
  const [showWorkDescriptionDialog, setShowWorkDescriptionDialog] = useState(false)
  const [workDescriptionText, setWorkDescriptionText] = useState('')
  const [submittingWorkDescription, setSubmittingWorkDescription] = useState(false)
  const [workDescriptionForm, setWorkDescriptionForm] = useState({
    workSummary: '',
    workArea: '',
    faultIdentified: '',
    workPerformed: '',
    materialsUsed: '',
    equipmentTested: false,
    testDescription: '',
    outstandingIssues: 'none' as 'none' | 'followup',
    followUpDetails: ''
  })
  
  // Quote submission state
  const [showQuoteDialog, setShowQuoteDialog] = useState(false)
  const [quoteForm, setQuoteForm] = useState({
    amount: '',
    description: '',
    file: null as File | null
  })
  const [submittingQuote, setSubmittingQuote] = useState(false)
  
  const [ratingStats, setRatingStats] = useState({
    totalRatings: 0,
    avgPunctuality: 0,
    avgCustomerService: 0,
    avgWorkmanship: 0,
    avgOverall: 0,
    ppeComplianceRate: 0,
    procedureComplianceRate: 0
  })

  // Auto-refresh interval (30 seconds)
  const refreshInterval = 30

  useEffect(() => {
    if (session?.user) {
      fetchContractorData()
    }
  }, [session])

  // Apply filters whenever jobs, filters, or search changes
  useEffect(() => {
    let filtered = jobs

    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      filtered = filtered.filter(j =>
        j.title.toLowerCase().includes(s) ||
        j.ticketNumber.toLowerCase().includes(s)
      )
    }

    if (filters.status.length > 0) {
      filtered = filtered.filter(j => filters.status.includes(j.status))
    }

    if (filters.priority.length > 0) {
      filtered = filtered.filter(j => filters.priority.includes(j.priority))
    }

    if (filters.date) {
      const now = new Date()
      const fd = new Date()
      switch (filters.date) {
        case 'today': fd.setHours(0, 0, 0, 0); filtered = filtered.filter(j => new Date(j.createdAt) >= fd); break
        case 'week': fd.setDate(now.getDate() - 7); filtered = filtered.filter(j => new Date(j.createdAt) >= fd); break
        case 'month': fd.setMonth(now.getMonth() - 1); filtered = filtered.filter(j => new Date(j.createdAt) >= fd); break
        case 'custom':
          if (filters.dateFrom) filtered = filtered.filter(j => new Date(j.createdAt) >= new Date(filters.dateFrom))
          if (filters.dateTo) filtered = filtered.filter(j => new Date(j.createdAt) <= new Date(filters.dateTo + 'T23:59:59'))
          break
      }
    }

    setFilteredJobs(filtered)
  }, [jobs, filters, searchTerm])

  const removeFilter = (field: keyof FilterState, value: string) => {
    if (field === 'date') {
      setFilters(f => ({ ...f, date: '', dateFrom: '', dateTo: '' }))
    } else {
      setFilters(f => ({ ...f, [field]: (f[field] as string[]).filter(v => v !== value) }))
    }
  }

  // Auto-refresh effect (background) - runs independently
  useEffect(() => {
    if (!session?.user) return
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/contractor/jobs')
        if (response.ok) {
          const jobsData = await response.json()
          setJobs(Array.isArray(jobsData) ? jobsData : (jobsData.jobs || []))
        }
      } catch (error) {
        console.error('Auto-refresh failed:', error)
      }
    }, refreshInterval * 1000)
    
    return () => clearInterval(interval)
  }, [session])

  const fetchContractorData = async () => {
    try {
      const [jobsResponse, profileResponse, categoriesResponse] = await Promise.all([
        fetch('/api/contractor/jobs'),
        fetch('/api/contractor/profile'),
        fetch('/api/contractor/categories')
      ])
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        // Handle both old format (array) and new format (object with jobs array)
        setJobs(Array.isArray(jobsData) ? jobsData : (jobsData.jobs || []))
      } else {
        toast.error('Failed to fetch jobs')
      }
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        if (profileData.ratingStats) {
          setRatingStats(profileData.ratingStats)
        }
      }
      
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch contractor data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCategoryAvailability = async (categoryId: string, currentStatus: boolean) => {
    setTogglingCategory(categoryId)
    try {
      const response = await fetch('/api/contractor/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          isAvailable: !currentStatus
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        // Update local state
        setCategories(prev => prev.map(cat => 
          cat.categoryId === categoryId 
            ? { ...cat, isAvailable: !currentStatus }
            : cat
        ))
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update availability')
      }
    } catch (error) {
      console.error('Failed to toggle category:', error)
      toast.error('Failed to update category availability')
    } finally {
      setTogglingCategory(null)
    }
  }

  const handleAcceptJob = async () => {
    if (!selectedJob) return
    
    if (!jobPlan.technicianName || !jobPlan.arrivalDate || !jobPlan.estimatedDuration) {
      toast.error('Please fill in all required fields')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`/api/contractor/jobs/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'accept',
          jobPlan
        })
      })

      if (response.ok) {
        toast.success('Job accepted successfully')
        setShowAcceptDialog(false)
        setShowJobModal(false)
        setArrivalDateConfirmed(false)
        setDeadlineConfirmed(false)
        setJobPlan({
          technicianName: '',
          arrivalDate: '',
          estimatedDuration: '',
          contactNumber: '',
          notes: ''
        })
        fetchContractorData()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to accept job')
      }
    } catch (error) {
      console.error('Failed to accept job:', error)
      toast.error('Failed to accept job')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectJob = async () => {
    if (!selectedJob) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/contractor/jobs/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject',
          rejectionReason
        })
      })

      if (response.ok) {
        toast.success('Job rejected')
        setShowRejectDialog(false)
        setShowJobModal(false)
        setRejectionReason('')
        fetchContractorData()
      } else {
        toast.error('Failed to reject job')
      }
    } catch (error) {
      console.error('Failed to reject job:', error)
      toast.error('Failed to reject job')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateStatus = async (action: string) => {
    if (!selectedJob) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/contractor/jobs/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        toast.success('Status updated successfully')
        setShowJobModal(false)
        fetchContractorData()
      } else {
        toast.error('Failed to update status')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInvoiceUpload = async () => {
    if (!selectedJob) return
    
    if (!invoiceForm.invoiceNumber || !invoiceForm.amount || !invoiceForm.file) {
      toast.error('Please fill invoice number, amount and upload an invoice PDF')
      return
    }

    setUploadingInvoice(true)
    try {
      // First upload the file
      const formData = new FormData()
      formData.append('file', invoiceForm.file)
      formData.append('ticketId', selectedJob.id)
      
      const uploadResponse = await fetch('/api/upload/invoice', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }
      
      const { fileUrl } = await uploadResponse.json()
      
      // Then create the invoice record
      const response = await fetch('/api/contractor/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedJob.id,
          invoiceNumber: invoiceForm.invoiceNumber,
          amount: parseFloat(invoiceForm.amount),
          workDescription: invoiceForm.workDescription,
          variationDescription: invoiceForm.variationDescription || undefined,
          invoiceFileUrl: fileUrl
        })
      })

      if (response.ok) {
        toast.success('Invoice uploaded successfully')
        setShowInvoiceDialog(false)
        setInvoiceForm({ invoiceNumber: '', amount: '', workDescription: '', variationDescription: '', file: null })
        fetchContractorData()
      } else {
        const data = await response.json()
        toast.error(data.message || 'Failed to submit invoice')
      }
    } catch (error) {
      console.error('Failed to upload invoice:', error)
      toast.error('Failed to upload invoice')
    } finally {
      setUploadingInvoice(false)
    }
  }

  // Handle work description submission
  const handleSubmitWorkDescription = async () => {
    if (!selectedJob) return
    
    // Validate required fields
    if (!workDescriptionForm.workSummary.trim()) {
      toast.error('Please provide a work summary')
      return
    }
    if (!workDescriptionForm.workArea) {
      toast.error('Please select the work area')
      return
    }
    if (!workDescriptionForm.faultIdentified.trim()) {
      toast.error('Please describe the fault identified')
      return
    }
    if (!workDescriptionForm.workPerformed.trim()) {
      toast.error('Please describe the work performed')
      return
    }
    if (!workDescriptionForm.materialsUsed.trim()) {
      toast.error('Please list the materials/parts used (or enter "None" if no materials were used)')
      return
    }
    if (!workDescriptionForm.equipmentTested) {
      toast.error('Please confirm that equipment was tested and verified')
      return
    }
    if (workDescriptionForm.outstandingIssues === 'followup' && !workDescriptionForm.followUpDetails.trim()) {
      toast.error('Please describe the follow-up work required')
      return
    }

    // Compile the structured form into formatted text
    const compiledDescription = compileWorkDescription()

    setSubmittingWorkDescription(true)
    try {
      const response = await fetch(`/api/tickets/${selectedJob.id}/work-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDescription: compiledDescription
        })
      })

      if (response.ok) {
        toast.success('Work description submitted successfully. Waiting for user approval.')
        setShowWorkDescriptionDialog(false)
        resetWorkDescriptionForm()
        fetchContractorData()
        // Refresh selected job
        const result = await response.json()
        setSelectedJob(result.ticket)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to submit work description')
      }
    } catch (error) {
      console.error('Failed to submit work description:', error)
      toast.error('Failed to submit work description')
    } finally {
      setSubmittingWorkDescription(false)
    }
  }

  // Compile structured work description form into formatted text
  const compileWorkDescription = () => {
    const { workSummary, workArea, faultIdentified, workPerformed, materialsUsed, equipmentTested, testDescription, outstandingIssues, followUpDetails } = workDescriptionForm
    
    let description = ''
    
    // 1. Work Summary
    description += `📋 WORK SUMMARY\n${workSummary}\n\n`
    
    // 2. Location
    description += `📍 WORK LOCATION\n${selectedJob?.location || 'On-site'} - ${workArea}\n\n`
    
    // 3. Fault Identified
    description += `⚠️ FAULT IDENTIFIED\n${faultIdentified}\n\n`
    
    // 4. Work Performed
    description += `🔧 WORK PERFORMED\n${workPerformed}\n\n`
    
    // 5. Materials Used
    if (materialsUsed.trim()) {
      description += `📦 MATERIALS/PARTS USED\n${materialsUsed}\n\n`
    }
    
    // 6. Testing
    if (equipmentTested) {
      description += `✅ TESTING & VERIFICATION\n`
      description += `• Equipment tested and verified\n`
      if (testDescription.trim()) {
        description += `Test conducted: ${testDescription}\n`
      }
      description += '\n'
    }
    
    // 7. Outstanding Issues
    description += `📌 OUTSTANDING ISSUES\n`
    if (outstandingIssues === 'none') {
      description += `No further issues identified. Work completed successfully.\n`
    } else {
      description += `Follow-up required: ${followUpDetails}\n`
    }
    
    return description.trim()
  }

  // Reset work description form
  const resetWorkDescriptionForm = () => {
    setWorkDescriptionForm({
      workSummary: '',
      workArea: '',
      faultIdentified: '',
      workPerformed: '',
      materialsUsed: '',
      equipmentTested: false,
      testDescription: '',
      outstandingIssues: 'none',
      followUpDetails: ''
    })
    setWorkDescriptionText('')
  }

  // Handle quote submission
  const handleSubmitQuote = async () => {
    if (!selectedJob) return
    
    if (!quoteForm.amount) {
      toast.error('Please enter a quote amount')
      return
    }

    setSubmittingQuote(true)
    try {
      let fileUrl = null
      
      // Upload quote file if provided
      if (quoteForm.file) {
        const formData = new FormData()
        formData.append('file', quoteForm.file)
        formData.append('ticketId', selectedJob.id)
        
        const uploadResponse = await fetch('/api/upload/invoice', {
          method: 'POST',
          body: formData
        })
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload quote file')
        }
        
        const uploadData = await uploadResponse.json()
        fileUrl = uploadData.fileUrl
      }

      const response = await fetch(`/api/contractor/jobs/${selectedJob.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteAmount: parseFloat(quoteForm.amount),
          quoteDescription: quoteForm.description,
          quoteFileUrl: fileUrl
        })
      })

      if (response.ok) {
        toast.success('Quote submitted successfully. Waiting for admin approval.')
        setShowQuoteDialog(false)
        setQuoteForm({ amount: '', description: '', file: null })
        fetchContractorData()
        const result = await response.json()
        setSelectedJob(result.ticket)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to submit quote')
      }
    } catch (error) {
      console.error('Failed to submit quote:', error)
      toast.error('Failed to submit quote')
    } finally {
      setSubmittingQuote(false)
    }
  }

  const getStatusColor = (status: string): React.CSSProperties => {
    const colors: Record<string, React.CSSProperties> = {
      AWAITING_QUOTE: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      QUOTE_SUBMITTED: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      PROCESSING: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      PENDING: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      ACCEPTED: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      IN_PROGRESS: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      ON_SITE: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      AWAITING_DESCRIPTION: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      AWAITING_WORK_APPROVAL: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      COMPLETED: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' },
      CLOSED: { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' },
    }
    return colors[status] || { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }
  }

  const getPriorityColor = (priority: string): React.CSSProperties => {
    const colors: Record<string, React.CSSProperties> = {
      LOW: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' },
      MEDIUM: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      HIGH: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      CRITICAL: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' },
      URGENT: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' },
    }
    return colors[priority] || { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': case 'CLOSED': return <CheckCircle className="h-4 w-4" style={{ color: 'var(--green)' }} />
      case 'PROCESSING': case 'PENDING': return <AlertCircle className="h-4 w-4" style={{ color: 'var(--amber)' }} />
      case 'ACCEPTED': case 'IN_PROGRESS': case 'ON_SITE': return <Clock className="h-4 w-4" style={{ color: 'var(--amber)' }} />
      default: return <FileText className="h-4 w-4" style={{ color: 'var(--accent)' }} />
    }
  }

  const getStatusChipColor = (status: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (status) {
      case 'PROCESSING': case 'PENDING': return 'warning'
      case 'ACCEPTED': return 'info'
      case 'IN_PROGRESS': return 'warning'
      case 'ON_SITE': return 'secondary'
      case 'AWAITING_DESCRIPTION': return 'warning'
      case 'AWAITING_WORK_APPROVAL': return 'info'
      case 'COMPLETED': return 'success'
      case 'CLOSED': return 'default'
      default: return 'default'
    }
  }

  const getPriorityChipColor = (priority: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (priority) {
      case 'LOW': return 'success'
      case 'MEDIUM': return 'warning'
      case 'HIGH': return 'error'
      case 'CRITICAL': case 'URGENT': return 'error'
      default: return 'default'
    }
  }

  // DataGrid column definitions
  const jobColumns: GridColDef[] = useMemo(() => [
    {
      field: 'ticket',
      headerName: 'Ticket',
      flex: 1.2,
      minWidth: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Job>) => (
        <Box sx={{ py: 1, textAlign: 'center', width: '100%' }}>
          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{params.row.title}</p>
          <p className="text-xs" style={{ color: 'var(--accent)' }}>{params.row.ticketNumber}</p>
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
      renderCell: (params: GridRenderCellParams<Job>) => (
        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          {params.row.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.3,
      minWidth: 140,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Job>) => (
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
            <p className="text-xs truncate cursor-pointer text-center" style={{ maxWidth: '100%', color: 'var(--text-secondary)' }}>
              {params.row.description || 'No description'}
            </p>
          </Tooltip>
        </Box>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      flex: 0.6,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Job>) => (
        <Chip
          label={params.row.type?.replace(/_/g, ' ')}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 500, fontSize: '0.7rem' }}
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
      renderCell: (params: GridRenderCellParams<Job>) => (
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
      renderCell: (params: GridRenderCellParams<Job>) => {
        // If this contractor has a quote request, show their specific status
        if (params.row.myQuoteRequest) {
          const quoteStatus = params.row.myQuoteRequest.status
          let label = ''
          let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default'
          
          if (quoteStatus === 'pending') {
            label = 'QUOTE PENDING'
            color = 'warning'
          } else if (quoteStatus === 'submitted') {
            label = 'QUOTE SENT'
            color = 'info'
          } else if (quoteStatus === 'awarded') {
            label = 'AWARDED'
            color = 'success'
          } else if (quoteStatus === 'rejected') {
            label = 'NOT AWARDED'
            color = 'error'
          } else {
            label = quoteStatus.toUpperCase()
          }
          
          return (
            <Chip
              label={label}
              size="small"
              color={color}
              sx={{ fontWeight: 500, fontSize: '0.7rem' }}
            />
          )
        }
        
        // Fallback to ticket status for directly assigned jobs
        return (
          <Chip
            label={params.row.status.replace(/_/g, ' ')}
            size="small"
            color={getStatusChipColor(params.row.status)}
            sx={{ fontWeight: 500, fontSize: '0.7rem' }}
          />
        )
      },
    },
    {
      field: 'sla',
      headerName: 'SLA',
      flex: 0.8,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Job>) => {
        const slaInfo = calculateSLAInfo({
          status: params.row.status,
          priority: params.row.priority,
          createdAt: params.row.createdAt,
          assignedAt: params.row.assignedAt,
          contractorAcceptedAt: params.row.contractorAcceptedAt,
          onSiteAt: params.row.onSiteAt,
          completedAt: params.row.completedAt,
          responseDeadline: params.row.responseDeadline,
          resolutionDeadline: params.row.resolutionDeadline,
        })
        const showResolution = !['OPEN', 'PROCESSING', 'ASSIGNED'].includes(params.row.status)
        const statusToUse = showResolution ? slaInfo.resolutionStatus : slaInfo.responseStatus
        return (
          <Tooltip title={`Response: ${slaInfo.responseStatus} | Resolution: ${slaInfo.resolutionStatus}`}>
            <Chip
              icon={<Timer className="h-3 w-3" />}
              label={showResolution ? slaInfo.formattedResolutionRemaining : slaInfo.formattedResponseRemaining}
              size="small"
              color={getSLAChipColor(statusToUse)}
              sx={{ fontWeight: 500, fontSize: '0.65rem' }}
            />
          </Tooltip>
        )
      },
    },
    {
      field: 'client',
      headerName: 'Client',
      flex: 0.8,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Job>) => (
        <Box sx={{ textAlign: 'center' }}>
          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {params.row.tenant?.name || 'N/A'}
          </p>
          {params.row.user && (
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{params.row.user.name}</p>
          )}
        </Box>
      ),
    },
    {
      field: 'location',
      headerName: 'Location',
      flex: 0.6,
      minWidth: 90,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Job>) => (
        params.row.location ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <MapPin className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{params.row.location}</span>
          </Box>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-</span>
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
      renderCell: (params: GridRenderCellParams<Job>) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
      renderCell: (params: GridRenderCellParams<Job>) => (
        <Tooltip title="View Details">
          <IconButton
            size="small"
            onClick={() => {
              setSelectedJob(params.row)
              setShowJobModal(true)
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading contractor dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Access Denied</h2>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>You need to be logged in as a contractor to access this page.</p>
          <Button onClick={() => window.location.href = '/auth/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  const CONTRACTOR_STATUS_OPTIONS = [
    { value: 'PROCESSING', label: 'New' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'ON_SITE', label: 'On Site' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CLOSED', label: 'Closed' },
  ]

  return (
    <div className="p-5" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={setFilters}
        filters={filters}
        sections={['status', 'priority', 'date']}
        statusOptions={CONTRACTOR_STATUS_OPTIONS}
      />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium" style={{ color: 'var(--text-primary)' }}>
              Welcome, {session.user.name}!
            </h1>
            <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Manage your assigned jobs and track your work</p>
          </div>
          <div className="flex items-center gap-3">
            <FilterButton
              isOpen={filterDrawerOpen}
              activeCount={countActiveFilters(filters)}
              onClick={() => setFilterDrawerOpen(o => !o)}
            />
            <Button onClick={fetchContractorData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Active Filter Tags */}
        <ActiveFilterTags
          filters={filters}
          statusOptions={CONTRACTOR_STATUS_OPTIONS}
          onRemove={removeFilter}
          onClearAll={() => setFilters(EMPTY_FILTERS)}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card style={{ backgroundColor: 'var(--blue-bg)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--blue)' }}>Total Jobs</CardTitle>
              <Package className="h-5 w-5" style={{ color: 'var(--blue)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium" style={{ color: 'var(--text-primary)' }}>{jobs.length}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>All assigned</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: 'var(--amber-bg)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--amber)' }}>Pending Acceptance</CardTitle>
              <AlertCircle className="h-5 w-5" style={{ color: 'var(--amber)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium" style={{ color: 'var(--text-primary)' }}>{jobs.filter(job => job.status === 'PENDING' || job.status === 'PROCESSING').length}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Needs action</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: 'var(--blue-bg)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--blue)' }}>In Progress</CardTitle>
              <Clock className="h-5 w-5" style={{ color: 'var(--blue)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium" style={{ color: 'var(--text-primary)' }}>{jobs.filter(job => job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS' || job.status === 'ON_SITE').length}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Active work</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: 'var(--green-bg)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--green)' }}>Completed</CardTitle>
              <CheckCircle className="h-5 w-5" style={{ color: 'var(--green)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium" style={{ color: 'var(--text-primary)' }}>{jobs.filter(job => job.status === 'COMPLETED').length}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Well done!</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: 'var(--amber-bg)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--amber)' }}>Overall Rating</CardTitle>
              <Star className="h-5 w-5" style={{ color: 'var(--amber)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium flex items-center" style={{ color: 'var(--text-primary)' }}>
                {ratingStats.avgOverall.toFixed(1)}
                <Star className="h-5 w-5 ml-1 fill-current" style={{ color: 'var(--amber)' }} />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{ratingStats.totalRatings} reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Details Card */}
        {ratingStats.totalRatings > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" style={{ color: 'var(--amber)' }} />
                Your Performance Metrics
              </CardTitle>
              <CardDescription>Based on {ratingStats.totalRatings} customer reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Punctuality', value: ratingStats.avgPunctuality },
                  { label: 'Customer Service', value: ratingStats.avgCustomerService },
                  { label: 'Workmanship', value: ratingStats.avgWorkmanship },
                  { label: 'Overall', value: ratingStats.avgOverall },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl font-medium" style={{ color: 'var(--accent)' }}>{value.toFixed(1)}</div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</div>
                    <div className="flex justify-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className="h-3 w-3"
                          style={{ color: star <= value ? 'var(--amber)' : 'var(--border-strong)' }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
                <div className="flex items-center justify-center p-3 rounded-lg" style={{ backgroundColor: 'var(--green-bg)' }}>
                  <Shield className="h-5 w-5 mr-2" style={{ color: 'var(--green)' }} />
                  <div>
                    <div className="font-medium" style={{ color: 'var(--green)' }}>{ratingStats.ppeComplianceRate}%</div>
                    <div className="text-xs" style={{ color: 'var(--green)' }}>PPE Compliance</div>
                  </div>
                </div>
                <div className="flex items-center justify-center p-3 rounded-lg" style={{ backgroundColor: 'var(--blue-bg)' }}>
                  <CheckCircle className="h-5 w-5 mr-2" style={{ color: 'var(--blue)' }} />
                  <div>
                    <div className="font-medium" style={{ color: 'var(--blue)' }}>{ratingStats.procedureComplianceRate}%</div>
                    <div className="text-xs" style={{ color: 'var(--blue)' }}>Procedure Compliance</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Availability */}
        {categories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ToggleLeft className="h-5 w-5 mr-2" style={{ color: 'var(--accent)' }} />
                Service Category Availability
              </CardTitle>
              <CardDescription>Toggle your availability for each service category. When unavailable, you won't be assigned to new tickets in that category.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div
                    key={category.categoryId}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    style={category.isAvailable
                      ? { backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }
                      : { backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.categoryColor || '#6b7280' }}
                      />
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{category.categoryName}</p>
                        <p className="text-xs" style={{ color: category.isAvailable ? 'var(--green)' : 'var(--text-muted)' }}>
                          {category.isAvailable ? 'Available for assignments' : 'Not accepting assignments'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={category.isAvailable}
                      onCheckedChange={() => handleToggleCategoryAvailability(category.categoryId, category.isAvailable)}
                      disabled={togglingCategory === category.categoryId}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Assigned Jobs
              {countActiveFilters(filters) > 0 && (
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                  {filteredJobs.length} of {jobs.length}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              View and manage your assigned maintenance tickets
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  {jobs.length === 0 ? 'No jobs assigned yet' : 'No jobs match your filters'}
                </h3>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {jobs.length === 0 ? 'Jobs assigned by administrators will appear here.' : 'Try adjusting your filters.'}
                </p>
                {jobs.length === 0 ? (
                  <Button onClick={fetchContractorData} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check for New Jobs
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <Box sx={{ width: '100%', p: 2 }}>
                <ScrollableDataGrid
                  rows={filteredJobs}
                  columns={jobColumns}
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

        {/* Job Detail Modal */}
        <Dialog open={showJobModal} onOpenChange={setShowJobModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Job Details</span>
                {selectedJob && (
                  <div className="flex items-center space-x-2">
                    <Badge style={getStatusColor(selectedJob.status)}>
                      {selectedJob.status.replace('_', ' ')}
                    </Badge>
                    <Badge style={getPriorityColor(selectedJob.priority)}>
                      {selectedJob.priority}
                    </Badge>
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {selectedJob && (
              <div className="space-y-6">
                {/* Job Header */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      {selectedJob.title}
                    </h3>
                    <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <p><span className="font-medium">Job ID:</span> {selectedJob.ticketNumber}</p>
                      <p><span className="font-medium">Type:</span> {selectedJob.type?.replace(/_/g, ' ')}</p>
                      <p><span className="font-medium">Assigned:</span> {new Date(selectedJob.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div>
                    <div className="space-y-3">
                      {selectedJob.tenant && (
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Client:</p>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedJob.tenant.name}</p>
                        </div>
                      )}

                      {selectedJob.user && (
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Reporter:</p>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedJob.user.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedJob.user.email}</p>
                        </div>
                      )}

                      {selectedJob.location && (
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Location:</p>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedJob.location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SLA Information */}
                {(() => {
                  const slaInfo = calculateSLAInfo({
                    status: selectedJob.status,
                    priority: selectedJob.priority,
                    createdAt: selectedJob.createdAt,
                    assignedAt: selectedJob.assignedAt,
                    contractorAcceptedAt: selectedJob.contractorAcceptedAt,
                    onSiteAt: selectedJob.onSiteAt,
                    completedAt: selectedJob.completedAt,
                    responseDeadline: selectedJob.responseDeadline,
                    resolutionDeadline: selectedJob.resolutionDeadline,
                  })
                  const isCompleted = ['COMPLETED', 'CLOSED', 'RESOLVED'].includes(selectedJob.status)
                  const currentStatus = slaInfo.resolutionStatus
                  
                  const slaStyle: React.CSSProperties = isCompleted
                    ? { backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }
                    : currentStatus === 'red'
                    ? { backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' }
                    : currentStatus === 'yellow'
                    ? { backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }
                    : { backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }

                  const slaIconColor = isCompleted ? 'var(--text-muted)'
                    : currentStatus === 'red' ? 'var(--red)'
                    : currentStatus === 'yellow' ? 'var(--amber)'
                    : 'var(--green)'

                  return (
                    <div className="p-4 rounded-lg border-2" style={slaStyle}>
                      <div className="flex items-center gap-2 mb-3">
                        <Timer className="h-5 w-5" style={{ color: slaIconColor }} />
                        <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>SLA Status</h4>
                        <Chip
                          label={slaInfo.formattedResolutionRemaining}
                          size="small"
                          color={getSLAChipColor(currentStatus)}
                          sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Response Due:</p>
                          <p className="font-medium" style={{ color: slaInfo.responseStatus === 'red' ? 'var(--red)' : slaInfo.responseStatus === 'yellow' ? 'var(--amber)' : 'var(--green)' }}>
                            {selectedJob.responseDeadline
                              ? new Date(selectedJob.responseDeadline).toLocaleString()
                              : 'Not set'
                            }
                          </p>
                          {!isCompleted && selectedJob.responseDeadline && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              {slaInfo.responseTimeRemaining}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Resolution Due:</p>
                          <p className="font-medium" style={{ color: slaInfo.resolutionStatus === 'red' ? 'var(--red)' : slaInfo.resolutionStatus === 'yellow' ? 'var(--amber)' : 'var(--green)' }}>
                            {selectedJob.resolutionDeadline
                              ? new Date(selectedJob.resolutionDeadline).toLocaleString()
                              : 'Not set'
                            }
                          </p>
                          {!isCompleted && selectedJob.resolutionDeadline && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              {slaInfo.resolutionTimeRemaining}
                            </p>
                          )}
                        </div>
                      </div>

                      {!isCompleted && currentStatus === 'red' && (
                        <div className="mt-3 p-2 rounded text-sm flex items-center gap-2" style={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}>
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">SLA breached! Immediate action required.</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Description</h4>
                  <p className="text-sm p-3 rounded-lg" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface2)' }}>
                    {selectedJob.description}
                  </p>
                </div>

                {/* Asset Info */}
                {selectedJob.asset && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <Package className="h-4 w-4" />
                      Related Asset
                    </h4>
                    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--surface2)' }}>
                      {/* Asset Header with Image */}
                      <div className="flex gap-4">
                        {/* Asset Image */}
                        {selectedJob.asset.images && selectedJob.asset.images.length > 0 ? (
                          <div className="flex-shrink-0">
                            <img
                              src={selectedJob.asset.images[0]}
                              alt={selectedJob.asset.name}
                              className="w-24 h-24 object-cover rounded-lg border shadow-sm"
                            />
                            {selectedJob.asset.images.length > 1 && (
                              <p className="text-xs text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                                +{selectedJob.asset.images.length - 1} more
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--border)' }}>
                            <Package className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                          </div>
                        )}
                        
                        {/* Asset Details */}
                        <div className="flex-1 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-base" style={{ color: 'var(--text-primary)' }}>{selectedJob.asset.name}</p>
                            {selectedJob.asset.category && (
                              <span 
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{ 
                                  backgroundColor: selectedJob.asset.category.color ? `${selectedJob.asset.category.color}20` : '#e5e7eb',
                                  color: selectedJob.asset.category.color || '#374151'
                                }}
                              >
                                {selectedJob.asset.category.name}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <p><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Asset #:</span> {selectedJob.asset.assetNumber}</p>
                            <p><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Status:</span> {selectedJob.asset.status?.replace('_', ' ') || 'N/A'}</p>
                            {selectedJob.asset.brand && (
                              <p><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Brand:</span> {selectedJob.asset.brand}</p>
                            )}
                            {selectedJob.asset.model && (
                              <p><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Model:</span> {selectedJob.asset.model}</p>
                            )}
                            {selectedJob.asset.serialNumber && (
                              <p className="col-span-2"><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Serial #:</span> {selectedJob.asset.serialNumber}</p>
                            )}
                            <p className="col-span-2 flex items-center gap-1">
                              <MapPin className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Location:</span> {selectedJob.asset.location}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Repair History */}
                      {selectedJob.asset.repairHistory && selectedJob.asset.repairHistory.length > 0 && (
                        <div className="mt-4 pt-3 border-t">
                          <h5 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <Wrench className="h-4 w-4" />
                            Repair History ({selectedJob.asset.repairHistory.length})
                          </h5>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {selectedJob.asset.repairHistory.map((repair, idx) => (
                              <div
                                key={repair.id || idx}
                                className="rounded border overflow-hidden"
                                style={{ backgroundColor: 'var(--surface)' }}
                              >
                                {/* Clickable Header */}
                                <div
                                  className="flex items-center justify-between p-2 cursor-pointer transition-colors"
                                  onClick={() => setExpandedRepairId(expandedRepairId === repair.id ? null : repair.id)}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <ChevronRight className={`h-4 w-4 transition-transform ${expandedRepairId === repair.id ? 'rotate-90' : ''}`} style={{ color: 'var(--text-muted)' }} />
                                      <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>#{repair.ticketNumber}</span>
                                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{repair.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 ml-6 mt-0.5">
                                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(repair.createdAt).toLocaleDateString()}
                                        {repair.completedAt && ` → ${new Date(repair.completedAt).toLocaleDateString()}`}
                                      </span>
                                      {repair.contractorName && (
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>• {repair.contractorName}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="px-1.5 py-0.5 rounded text-xs font-medium"
                                      style={repair.status === 'COMPLETED' || repair.status === 'CLOSED'
                                        ? { backgroundColor: 'var(--green-bg)', color: 'var(--green)' }
                                        : repair.status === 'IN_PROGRESS'
                                        ? { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }
                                        : { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }}
                                    >
                                      {repair.status?.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedRepairId === repair.id && (
                                  <div className="px-4 pb-3 pt-1 border-t text-sm space-y-3" style={{ backgroundColor: 'var(--surface2)' }}>
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Type:</span>{' '}
                                        <span style={{ color: 'var(--text-primary)' }}>{repair.type?.replace('_', ' ')}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Priority:</span>{' '}
                                        <span className="font-medium" style={{ color: repair.priority === 'CRITICAL' ? 'var(--red)' : repair.priority === 'HIGH' ? 'var(--amber)' : repair.priority === 'MEDIUM' ? 'var(--amber)' : 'var(--green)' }}>{repair.priority}</span>
                                      </div>
                                      {repair.contractorName && (
                                        <div className="col-span-2">
                                          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Assigned Contractor:</span>{' '}
                                          <span style={{ color: 'var(--text-primary)' }}>{repair.contractorName}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Original Issue Description */}
                                    {repair.description && (
                                      <div>
                                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Original Issue:</p>
                                        <p className="text-xs p-2 rounded border" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}>{repair.description}</p>
                                      </div>
                                    )}

                                    {/* Approved Work Description */}
                                    {repair.workDescription && (
                                      <div>
                                        <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--green)' }}>
                                          <CheckCircle className="h-3 w-3" />
                                          Approved Work Description:
                                        </p>
                                        <p className="text-xs p-2 rounded border whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }}>{repair.workDescription}</p>
                                      </div>
                                    )}

                                    {/* Timeline */}
                                    <div className="flex items-center gap-4 text-xs pt-1 border-t" style={{ color: 'var(--text-muted)' }}>
                                      <span>Created: {new Date(repair.createdAt).toLocaleString()}</span>
                                      {repair.completedAt && (
                                        <span>Completed: {new Date(repair.completedAt).toLocaleString()}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Attachments & Media */}
                {selectedJob.attachments && selectedJob.attachments.length > 0 && (
                  <div>
                    <MediaViewer 
                      files={selectedJob.attachments}
                      title="Attachments & Media"
                      gridCols={2}
                      thumbnailSize="md"
                    />
                  </div>
                )}

                {/* Ticket Chat */}
                {session?.user && (
                  <TicketChat 
                    ticketId={selectedJob.id}
                    currentUser={{
                      id: session.user.id,
                      name: session.user.name,
                      email: session.user.email || '',
                      role: session.user.role
                    }}
                    ticketStatus={selectedJob.status}
                    pollInterval={5000}
                  />
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  {/* Quote Submission - Admin requested quote (multi-contractor or direct) */}
                  {(selectedJob.status === 'AWAITING_QUOTE' || 
                    (selectedJob.myQuoteRequest && selectedJob.myQuoteRequest.status === 'pending')) && (
                    <div className="w-full border rounded-lg p-4" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                      <h4 className="font-medium mb-2 flex items-center" style={{ color: 'var(--amber)' }}>
                        <FileText className="h-5 w-5 mr-2" />
                        Quote/Estimate Required
                      </h4>
                      <p className="text-sm mb-3" style={{ color: 'var(--amber)' }}>
                        {selectedJob.myQuoteRequest
                          ? 'You have been invited to submit a quote for this job. Other contractors may also be quoting.'
                          : 'The admin has requested a quote for this job. Please review the details and submit your estimate.'}
                      </p>
                      {selectedJob.myQuoteRequest?.notes && (
                        <div className="rounded p-3 mb-3 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--amber)' }}>
                          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Admin Notes:</p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedJob.myQuoteRequest.notes}</p>
                        </div>
                      )}
                      {selectedJob.quoteRejectionReason && (
                        <div className="rounded p-3 mb-3 border" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>Previous quote was rejected:</p>
                          <p className="text-sm" style={{ color: 'var(--red)' }}>{selectedJob.quoteRejectionReason}</p>
                        </div>
                      )}
                      <Button
                        onClick={() => setShowQuoteDialog(true)}
                        style={{ backgroundColor: 'var(--amber)', color: '#fff' }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Submit Quote
                      </Button>
                    </div>
                  )}

                  {/* Quote Submitted - Waiting for approval (multi-contractor) */}
                  {selectedJob.myQuoteRequest && selectedJob.myQuoteRequest.status === 'submitted' && (
                    <div className="w-full border rounded-lg p-4" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--blue)' }}>
                      <h4 className="font-medium mb-2 flex items-center" style={{ color: 'var(--blue)' }}>
                        <Clock className="h-5 w-5 mr-2" />
                        Quote Submitted - Awaiting Decision
                      </h4>
                      <p className="text-sm mb-2" style={{ color: 'var(--blue)' }}>
                        Your quote has been submitted. The admin will review all quotes and award the job.
                      </p>
                      <div className="rounded p-3 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--blue)' }}>
                        <p className="text-lg font-medium" style={{ color: 'var(--blue)' }}>
                          ${selectedJob.myQuoteRequest.quoteAmount?.toFixed(2)}
                        </p>
                        {selectedJob.myQuoteRequest.quoteDescription && (
                          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{selectedJob.myQuoteRequest.quoteDescription}</p>
                        )}
                        {selectedJob.myQuoteRequest.estimatedDays && (
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            Estimated completion: {selectedJob.myQuoteRequest.estimatedDays} day(s)
                          </p>
                        )}
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                          Submitted: {selectedJob.myQuoteRequest.submittedAt && new Date(selectedJob.myQuoteRequest.submittedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quote Submitted - Single contractor flow (old) */}
                  {selectedJob.status === 'QUOTE_SUBMITTED' && !selectedJob.myQuoteRequest && (
                    <div className="w-full border rounded-lg p-4" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--blue)' }}>
                      <h4 className="font-medium mb-2 flex items-center" style={{ color: 'var(--blue)' }}>
                        <Clock className="h-5 w-5 mr-2" />
                        Quote Pending Approval
                      </h4>
                      <p className="text-sm mb-2" style={{ color: 'var(--blue)' }}>
                        Your quote has been submitted. Waiting for admin approval.
                      </p>
                      <div className="rounded p-3 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--blue)' }}>
                        <p className="text-lg font-medium" style={{ color: 'var(--blue)' }}>${selectedJob.quoteAmount?.toFixed(2)}</p>
                        {selectedJob.quoteDescription && (
                          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{selectedJob.quoteDescription}</p>
                        )}
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                          Submitted: {selectedJob.quoteSubmittedAt && new Date(selectedJob.quoteSubmittedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {(selectedJob.status === 'PENDING' || selectedJob.status === 'PROCESSING') && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectDialog(true)}
                        style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject Job
                      </Button>
                      <Button
                        onClick={() => setShowAcceptDialog(true)}
                        style={{ backgroundColor: 'var(--green)', color: '#fff' }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept Job
                      </Button>
                    </>
                  )}
                  
                  {selectedJob.status === 'ACCEPTED' && (
                    <div className="text-sm px-4 py-2 rounded-lg" style={{ color: 'var(--blue)', backgroundColor: 'var(--blue-bg)' }}>
                      Waiting for user to confirm your arrival on site
                    </div>
                  )}

                  {selectedJob.status === 'ON_SITE' && (
                    <div className="text-sm px-4 py-2 rounded-lg" style={{ color: 'var(--blue)', backgroundColor: 'var(--blue-bg)' }}>
                      On site - waiting for user to confirm job completion
                    </div>
                  )}
                  
                  {/* Work Description Required - User marked job complete */}
                  {selectedJob.status === 'AWAITING_DESCRIPTION' && (
                    <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                      <h4 className="font-medium mb-2 flex items-center" style={{ color: 'var(--amber)' }}>
                        <FileText className="h-5 w-5 mr-2" />
                        Work Description Required
                      </h4>
                      <p className="text-sm mb-3" style={{ color: 'var(--amber)' }}>
                        The user has marked this job as complete. Please provide a detailed description of the work done.
                      </p>
                      {selectedJob.workDescriptionRejectionReason && (
                        <div className="rounded p-3 mb-3 border" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>Previous description was rejected:</p>
                          <p className="text-sm" style={{ color: 'var(--red)' }}>{selectedJob.workDescriptionRejectionReason}</p>
                        </div>
                      )}
                      <Button
                        onClick={() => setShowWorkDescriptionDialog(true)}
                        style={{ backgroundColor: 'var(--amber)', color: '#fff' }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Submit Work Description
                      </Button>
                    </div>
                  )}
                  
                  {/* Awaiting User Approval */}
                  {selectedJob.status === 'AWAITING_WORK_APPROVAL' && (
                    <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--blue)' }}>
                      <h4 className="font-medium mb-2 flex items-center" style={{ color: 'var(--blue)' }}>
                        <Clock className="h-5 w-5 mr-2" />
                        Awaiting User Approval
                      </h4>
                      <p className="text-sm mb-3" style={{ color: 'var(--blue)' }}>
                        Your work description has been submitted. Waiting for the user to review and approve.
                      </p>
                      {selectedJob.workDescription && (
                        <div className="rounded p-3 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--blue)' }}>
                          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Your submitted description:</p>
                          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{selectedJob.workDescription}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedJob.status === 'COMPLETED' && (
                    <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }}>
                      <h4 className="font-medium mb-2 flex items-center" style={{ color: 'var(--green)' }}>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Work Description Approved
                      </h4>
                      <p className="text-sm mb-3" style={{ color: 'var(--green)' }}>
                        Your work has been approved! You can now upload your invoice.
                      </p>
                      {selectedJob.workDescription && (
                        <div className="rounded p-3 mb-3 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--green)' }}>
                          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Approved work description:</p>
                          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{selectedJob.workDescription}</p>
                        </div>
                      )}
                      {!selectedJob.invoice && (
                        <Button
                          onClick={() => {
                            setInvoiceForm(prev => ({ ...prev, workDescription: selectedJob.workDescription || '' }))
                            setShowInvoiceDialog(true)
                          }}
                          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Invoice
                        </Button>
                      )}
                      {selectedJob.invoice && (
                        <div className="flex items-center space-x-3">
                          <div className="text-sm flex items-center" style={{ color: 'var(--green)' }}>
                            <Receipt className="h-4 w-4 mr-2" />
                            Invoice #{selectedJob.invoice.invoiceNumber} - ${selectedJob.invoice.amount}
                          </div>
                          <Badge style={
                            selectedJob.invoice.status === 'PAID'
                              ? { backgroundColor: 'var(--green-bg)', color: 'var(--green)' }
                              : selectedJob.invoice.status === 'APPROVED'
                              ? { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }
                              : { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }
                          }>
                            {selectedJob.invoice.status}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedJob.status === 'CLOSED' && (
                    <div className="flex items-center space-x-3">
                      {selectedJob.invoice ? (
                        <div className="flex items-center space-x-3">
                          <div className="text-sm px-4 py-2 rounded-lg flex items-center" style={{ color: 'var(--green)', backgroundColor: 'var(--green-bg)' }}>
                            <Receipt className="h-4 w-4 mr-2" />
                            Invoice #{selectedJob.invoice.invoiceNumber} submitted - ${selectedJob.invoice.amount}
                          </div>
                          <Badge style={
                            selectedJob.invoice.status === 'PAID'
                              ? { backgroundColor: 'var(--green-bg)', color: 'var(--green)' }
                              : selectedJob.invoice.status === 'APPROVED'
                              ? { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }
                              : { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }
                          }>
                            {selectedJob.invoice.status}
                          </Badge>
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setInvoiceForm(prev => ({ ...prev, workDescription: selectedJob.workDescription || '' }))
                            setShowInvoiceDialog(true)
                          }}
                          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Invoice
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Accept Job Dialog with Job Plan */}
        <Dialog open={showAcceptDialog} onOpenChange={(open) => {
          setShowAcceptDialog(open)
          if (!open) {
            setDeadlineConfirmed(false)
            setArrivalDateConfirmed(false)
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Accept Job & Submit Plan</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* SLA Deadline Warning */}
              {selectedJob?.resolutionDeadline && (
                <div
                  className="p-3 rounded-lg border-2"
                  style={new Date(selectedJob.resolutionDeadline) < new Date()
                    ? { backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' }
                    : { backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle
                      className="h-5 w-5"
                      style={{ color: new Date(selectedJob.resolutionDeadline) < new Date() ? 'var(--red)' : 'var(--amber)' }}
                    />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>SLA Deadline</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    This ticket must be closed by{' '}
                    <span className="font-medium">
                      {new Date(selectedJob.resolutionDeadline).toLocaleString()}
                    </span>
                  </p>
                  {(() => {
                    const deadline = new Date(selectedJob.resolutionDeadline)
                    const now = new Date()
                    const diffMs = deadline.getTime() - now.getTime()
                    if (diffMs <= 0) {
                      return (
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--red)' }}>
                          ⚠️ SLA already breached!
                        </p>
                      )
                    }
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                    return (
                      <p className="text-sm mt-1" style={{ color: 'var(--amber)' }}>
                        Time remaining: <span className="font-medium">{diffHrs}h {diffMins}m</span>
                      </p>
                    )
                  })()}
                  
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="deadlineConfirm"
                      checked={deadlineConfirmed}
                      onChange={(e) => setDeadlineConfirmed(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <label htmlFor="deadlineConfirm" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      I confirm I can meet this deadline
                    </label>
                  </div>
                </div>
              )}
              
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Please provide the job plan details before accepting this job.
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="technicianName">Technician Name *</Label>
                  <Input
                    id="technicianName"
                    placeholder="Name of technician attending"
                    value={jobPlan.technicianName}
                    onChange={(e) => setJobPlan({ ...jobPlan, technicianName: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="arrivalDate">Arrival Date & Time *</Label>
                  {/* Deadline reminder on calendar */}
                  {selectedJob?.resolutionDeadline && (
                    <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--amber)' }}>
                      <Calendar className="h-3 w-3" />
                      Must complete by: {new Date(selectedJob.resolutionDeadline).toLocaleString()}
                    </p>
                  )}
                  <div className="flex gap-2 items-center">
                    <Input
                      id="arrivalDate"
                      type="datetime-local"
                      value={jobPlan.arrivalDate}
                      max={selectedJob?.resolutionDeadline 
                        ? new Date(selectedJob.resolutionDeadline).toISOString().slice(0, 16)
                        : undefined
                      }
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value)
                        const deadline = selectedJob?.resolutionDeadline 
                          ? new Date(selectedJob.resolutionDeadline) 
                          : null
                        
                        if (deadline && selectedDate > deadline) {
                          toast.error('Arrival date cannot be after the resolution deadline!')
                          return
                        }
                        
                        setJobPlan({ ...jobPlan, arrivalDate: e.target.value })
                        setArrivalDateConfirmed(false)
                      }}
                      style={arrivalDateConfirmed ? { borderColor: 'var(--green)', backgroundColor: 'var(--green-bg)' } : {}}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={arrivalDateConfirmed ? 'default' : 'outline'}
                      onClick={() => {
                        if (jobPlan.arrivalDate) {
                          const selectedDate = new Date(jobPlan.arrivalDate)
                          const deadline = selectedJob?.resolutionDeadline 
                            ? new Date(selectedJob.resolutionDeadline) 
                            : null
                          
                          if (deadline && selectedDate > deadline) {
                            toast.error('Arrival date cannot be after the resolution deadline!')
                            return
                          }
                          
                          setArrivalDateConfirmed(true)
                          toast.success('Arrival date confirmed!')
                        } else {
                          toast.error('Please select a date first')
                        }
                      }}
                      style={arrivalDateConfirmed ? { backgroundColor: 'var(--green)', color: '#fff' } : {}}
                    >
                      {arrivalDateConfirmed ? (
                        <><CheckCircle className="h-4 w-4 mr-1" /> Set</>
                      ) : (
                        'Set'
                      )}
                    </Button>
                  </div>
                  {arrivalDateConfirmed && jobPlan.arrivalDate && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--green)' }}>
                      <CheckCircle className="h-3 w-3" />
                      Arrival set for {new Date(jobPlan.arrivalDate).toLocaleString()}
                    </p>
                  )}
                  {/* Warning if arrival is close to deadline */}
                  {jobPlan.arrivalDate && selectedJob?.resolutionDeadline && (() => {
                    const arrival = new Date(jobPlan.arrivalDate)
                    const deadline = new Date(selectedJob.resolutionDeadline)
                    const estimatedHours = parseFloat(jobPlan.estimatedDuration) || 0
                    const estimatedCompletion = new Date(arrival.getTime() + estimatedHours * 60 * 60 * 1000)
                    
                    if (estimatedCompletion > deadline) {
                      return (
                        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--red)' }}>
                          <AlertCircle className="h-3 w-3" />
                          Warning: Estimated completion ({estimatedCompletion.toLocaleString()}) exceeds deadline!
                        </p>
                      )
                    }
                    return null
                  })()}
                </div>
                
                <div>
                  <Label htmlFor="estimatedDuration">Estimated Duration (hours) *</Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    placeholder="e.g., 4"
                    value={jobPlan.estimatedDuration}
                    onChange={(e) => setJobPlan({ ...jobPlan, estimatedDuration: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactNumber">Contact Number</Label>
                  <Input
                    id="contactNumber"
                    type="tel"
                    placeholder="Technician contact number"
                    value={jobPlan.contactNumber}
                    onChange={(e) => setJobPlan({ ...jobPlan, contactNumber: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes or requirements..."
                    value={jobPlan.notes}
                    onChange={(e) => setJobPlan({ ...jobPlan, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAcceptJob}
                disabled={actionLoading || Boolean(selectedJob?.resolutionDeadline && !deadlineConfirmed)}
                style={{ backgroundColor: 'var(--green)', color: '#fff' }}
                title={!deadlineConfirmed && selectedJob?.resolutionDeadline ? 'Please confirm you can meet the deadline' : ''}
              >
                {actionLoading ? 'Submitting...' : 'Accept & Submit Plan'}
              </Button>
            </DialogFooter>
            {!deadlineConfirmed && selectedJob?.resolutionDeadline && (
              <p className="text-xs text-center mt-2" style={{ color: 'var(--amber)' }}>
                ☝️ Please confirm you can meet the deadline to enable the Accept button
              </p>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Job Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Reject Job</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Please provide a reason for rejecting this job. The job will be unassigned and returned to the pool.
              </p>
              
              <div>
                <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Why are you rejecting this job?"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRejectJob}
                disabled={actionLoading}
                style={{ backgroundColor: 'var(--red)', color: '#fff' }}
              >
                {actionLoading ? 'Rejecting...' : 'Reject Job'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invoice Upload Dialog */}
        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Receipt className="h-5 w-5 mr-2" style={{ color: 'var(--accent)' }} />
                Upload Invoice
              </DialogTitle>
            </DialogHeader>
            
            {selectedJob && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--surface2)' }}>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedJob.title}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Ticket: {selectedJob.ticketNumber}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Client: {selectedJob.tenant.name}</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                    <Input
                      id="invoiceNumber"
                      placeholder="e.g., INV-2024-001"
                      value={invoiceForm.invoiceNumber}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                    />
                  </div>
                  
                  {/* Show Quoted Amount if available */}
                  {(selectedJob.quoteAmount || selectedJob.myQuoteRequest?.quoteAmount) && (
                    <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--blue)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: 'var(--blue)' }}>Quoted Amount:</span>
                        <span className="text-lg font-medium" style={{ color: 'var(--blue)' }}>
                          ${(selectedJob.myQuoteRequest?.quoteAmount || selectedJob.quoteAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="amount">Invoice Amount ($) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={invoiceForm.amount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    />
                    {/* Show warning if invoice exceeds quote */}
                    {invoiceForm.amount && (selectedJob.quoteAmount || selectedJob.myQuoteRequest?.quoteAmount) && 
                      parseFloat(invoiceForm.amount) > (selectedJob.myQuoteRequest?.quoteAmount || selectedJob.quoteAmount || 0) && (
                      <p className="text-xs mt-1 flex items-center" style={{ color: 'var(--amber)' }}>
                        <span className="mr-1">⚠️</span>
                        Invoice amount exceeds quoted amount. Please provide a variation description below.
                      </p>
                    )}
                  </div>

                  {/* Variation Description - only show if invoice exceeds quote */}
                  {(selectedJob.quoteAmount || selectedJob.myQuoteRequest?.quoteAmount) && 
                    invoiceForm.amount && 
                    parseFloat(invoiceForm.amount) > (selectedJob.myQuoteRequest?.quoteAmount || selectedJob.quoteAmount || 0) && (
                    <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                      <Label htmlFor="variationDescription" className="font-medium" style={{ color: 'var(--amber)' }}>
                        Variation Description *
                      </Label>
                      <p className="text-xs mt-1 mb-2" style={{ color: 'var(--amber)' }}>
                        Please explain why the final invoice amount is higher than the quoted amount.
                      </p>
                      <Textarea
                        id="variationDescription"
                        placeholder="e.g., Additional parts were required, scope of work expanded due to unforeseen issues, etc."
                        value={invoiceForm.variationDescription}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, variationDescription: e.target.value })}
                        rows={3}
                        style={{ backgroundColor: 'var(--surface)' }}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="workDescription">
                      Approved Work Description
                      <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>(Pre-filled from site manager approval)</span>
                    </Label>
                    <Textarea
                      id="workDescription"
                      placeholder="No work description available"
                      value={invoiceForm.workDescription}
                      readOnly
                      disabled
                      rows={4}
                      className="mt-1 cursor-not-allowed"
                      style={{ backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }}
                    />
                    {!invoiceForm.workDescription && (
                      <p className="text-xs mt-1" style={{ color: 'var(--amber)' }}>Note: No approved work description found for this job.</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="invoiceFile">Invoice PDF *</Label>
                    <div className="mt-1">
                      <input
                        id="invoiceFile"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.type !== 'application/pdf') {
                              toast.error('Please upload a PDF file')
                              return
                            }
                            setInvoiceForm({ ...invoiceForm, file })
                          }
                        }}
                        className="block w-full text-sm cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}
                      />
                      {invoiceForm.file && (
                        <p className="mt-2 text-sm flex items-center" style={{ color: 'var(--green)' }}>
                          <FileText className="h-4 w-4 mr-1" />
                          {invoiceForm.file.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowInvoiceDialog(false)
                setInvoiceForm({ invoiceNumber: '', amount: '', workDescription: '', variationDescription: '', file: null })
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleInvoiceUpload}
                disabled={Boolean(
                  uploadingInvoice || 
                  !invoiceForm.invoiceNumber || 
                  !invoiceForm.amount || 
                  !invoiceForm.workDescription || 
                  !invoiceForm.file ||
                  // Require variation description if invoice exceeds quote
                  (selectedJob && 
                    (selectedJob.quoteAmount || selectedJob.myQuoteRequest?.quoteAmount) && 
                    parseFloat(invoiceForm.amount) > (selectedJob.myQuoteRequest?.quoteAmount || selectedJob.quoteAmount || 0) &&
                    !invoiceForm.variationDescription.trim())
                )}
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {uploadingInvoice ? 'Uploading...' : 'Submit Invoice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Work Description Submission Dialog */}
        <Dialog open={showWorkDescriptionDialog} onOpenChange={setShowWorkDescriptionDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" style={{ color: 'var(--amber)' }} />
                Submit Work Description
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-5">
              <p className="text-sm p-3 rounded-lg border" style={{ color: 'var(--amber)', backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                Please complete all required sections below. This structured report will be reviewed by the client before the job can be closed.
              </p>

              {selectedJob?.workDescriptionRejectionReason && (
                <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>Previous submission was rejected:</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--red)' }}>{selectedJob.workDescriptionRejectionReason}</p>
                </div>
              )}
              
              {/* 1. Work Summary */}
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--surface)' }}>
                <Label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>1</span>
                  Work Summary *
                </Label>
                <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-muted)' }}>In one or two sentences, clearly state what work was done and why.</p>
                <Textarea
                  placeholder="e.g., Replaced faulty submersible pump capacitor at Pump 3 due to intermittent tripping and loss of fuel flow."
                  value={workDescriptionForm.workSummary}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, workSummary: e.target.value})}
                  rows={2}
                />
              </div>

              {/* 2. Work Area */}
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--surface)' }}>
                <Label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>2</span>
                  Exact Location of Work *
                </Label>
                <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-muted)' }}>Specify where the work was carried out.</p>
                <Input
                  placeholder="e.g., Main building rooftop, Server room B2, Parking lot entrance"
                  value={workDescriptionForm.workArea}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, workArea: e.target.value})}
                />
              </div>

              {/* 3. Fault Identified */}
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--surface)' }}>
                <Label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>3</span>
                  Fault / Issue Identified *
                </Label>
                <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-muted)' }}>Describe the actual fault found on site (not just what was reported).</p>
                <Textarea
                  placeholder="e.g., Pump motor was operational but capacitor was leaking oil and reading below required microfarad rating."
                  value={workDescriptionForm.faultIdentified}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, faultIdentified: e.target.value})}
                  rows={2}
                />
              </div>

              {/* 4. Work Performed */}
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--surface)' }}>
                <Label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>4</span>
                  Work Performed (Step-by-Step) *
                </Label>
                <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-muted)' }}>List the key actions taken. One step per line.</p>
                <Textarea
                  placeholder="1. Isolated power supply to equipment&#10;2. Removed damaged component&#10;3. Installed replacement and tested operation"
                  value={workDescriptionForm.workPerformed}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, workPerformed: e.target.value})}
                  rows={4}
                />
              </div>

              {/* 5. Materials Used */}
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--surface)' }}>
                <Label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>5</span>
                  Materials / Parts Used *
                </Label>
                <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-muted)' }}>List all materials used. Enter "None" if no materials were used.</p>
                <Textarea
                  placeholder="e.g.,&#10;Capacitor - 40µF, 450V - 1 unit&#10;Cable ties - 200mm - 10 pcs&#10;Electrical tape - 1 roll"
                  value={workDescriptionForm.materialsUsed}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, materialsUsed: e.target.value})}
                  rows={3}
                />
              </div>

              {/* 6. Testing & Verification */}
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--surface)' }}>
                <Label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>6</span>
                  Testing & Verification *
                </Label>
                <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-muted)' }}>Confirm testing was performed and describe what was tested.</p>
                <label
                  className="flex items-center gap-2 p-3 border rounded cursor-pointer transition-colors"
                  style={workDescriptionForm.equipmentTested ? { borderColor: 'var(--green)', backgroundColor: 'var(--green-bg)' } : {}}
                >
                  <input
                    type="checkbox"
                    checked={workDescriptionForm.equipmentTested}
                    onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, equipmentTested: e.target.checked})}
                    className="accent-green-600 w-4 h-4"
                  />
                  <span className="text-sm font-medium">Equipment tested and verified</span>
                </label>
                <Textarea
                  className="mt-3"
                  placeholder="Brief description of test conducted (e.g., Ran pump for 10 minutes, checked for leaks, verified pressure readings were within normal range)"
                  value={workDescriptionForm.testDescription}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, testDescription: e.target.value})}
                  rows={2}
                />
              </div>

              {/* 7. Outstanding Issues */}
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--surface)' }}>
                <Label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>7</span>
                  Outstanding Issues / Recommendations
                </Label>
                <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-muted)' }}>State if further work is required or if any risks remain.</p>
                <div className="space-y-2 mt-2">
                  <label
                    className="flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors"
                    style={workDescriptionForm.outstandingIssues === 'none' ? { borderColor: 'var(--green)', backgroundColor: 'var(--green-bg)' } : {}}
                  >
                    <input
                      type="radio"
                      name="outstandingIssues"
                      value="none"
                      checked={workDescriptionForm.outstandingIssues === 'none'}
                      onChange={() => setWorkDescriptionForm({...workDescriptionForm, outstandingIssues: 'none', followUpDetails: ''})}
                      className="accent-green-600"
                    />
                    <span className="text-sm">No further issues identified - Work completed successfully</span>
                  </label>
                  <label
                    className="flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors"
                    style={workDescriptionForm.outstandingIssues === 'followup' ? { borderColor: 'var(--amber)', backgroundColor: 'var(--amber-bg)' } : {}}
                  >
                    <input
                      type="radio"
                      name="outstandingIssues"
                      value="followup"
                      checked={workDescriptionForm.outstandingIssues === 'followup'}
                      onChange={() => setWorkDescriptionForm({...workDescriptionForm, outstandingIssues: 'followup'})}
                      className="accent-orange-600"
                    />
                    <span className="text-sm">Follow-up required</span>
                  </label>
                </div>
                {workDescriptionForm.outstandingIssues === 'followup' && (
                  <Textarea
                    className="mt-2"
                    placeholder="Describe what follow-up work is needed..."
                    value={workDescriptionForm.followUpDetails}
                    onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, followUpDetails: e.target.value})}
                    rows={2}
                  />
                )}
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => {
                setShowWorkDescriptionDialog(false)
                resetWorkDescriptionForm()
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitWorkDescription}
                disabled={submittingWorkDescription || !workDescriptionForm.workSummary.trim() || !workDescriptionForm.workArea.trim() || !workDescriptionForm.faultIdentified.trim() || !workDescriptionForm.workPerformed.trim() || !workDescriptionForm.materialsUsed.trim() || !workDescriptionForm.equipmentTested}
                style={{ backgroundColor: 'var(--amber)', color: '#fff' }}
              >
                {submittingWorkDescription ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quote Submission Dialog */}
        <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" style={{ color: 'var(--amber)' }} />
                Submit Quote/Estimate
              </DialogTitle>
            </DialogHeader>
            
            {selectedJob && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--surface2)' }}>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedJob.title}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Ticket: {selectedJob.ticketNumber}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Client: {selectedJob.tenant.name}</p>
                  {selectedJob.description && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{selectedJob.description}</p>
                  )}
                </div>

                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Please provide your quote for this job. The admin will review and approve before the job is formally assigned.
                </p>

                {selectedJob.quoteRejectionReason && (
                  <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>Previous quote was rejected:</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--red)' }}>{selectedJob.quoteRejectionReason}</p>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="quoteAmount">Quote Amount ($) *</Label>
                  <Input
                    id="quoteAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={quoteForm.amount}
                    onChange={(e) => setQuoteForm({ ...quoteForm, amount: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="quoteDescription">Quote Description / Breakdown</Label>
                  <Textarea
                    id="quoteDescription"
                    placeholder="Provide a breakdown of costs, materials needed, labor hours, etc..."
                    value={quoteForm.description}
                    onChange={(e) => setQuoteForm({ ...quoteForm, description: e.target.value })}
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="quoteFile">Supporting Document (Optional)</Label>
                  <div className="mt-1">
                    <input
                      id="quoteFile"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setQuoteForm({ ...quoteForm, file })
                        }
                      }}
                      className="block w-full text-sm cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Upload a detailed quote document if available (PDF, Word, Excel)
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowQuoteDialog(false)
                setQuoteForm({ amount: '', description: '', file: null })
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitQuote}
                disabled={submittingQuote || !quoteForm.amount}
                style={{ backgroundColor: 'var(--amber)', color: '#fff' }}
              >
                {submittingQuote ? 'Submitting...' : 'Submit Quote'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}