'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useMemo } from 'react'
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

  useEffect(() => {
    if (session?.user) {
      fetchContractorData()
    }
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      AWAITING_QUOTE: 'bg-amber-100 text-amber-800',
      QUOTE_SUBMITTED: 'bg-indigo-100 text-indigo-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
      ON_SITE: 'bg-purple-100 text-purple-800',
      AWAITING_DESCRIPTION: 'bg-amber-100 text-amber-800',
      AWAITING_WORK_APPROVAL: 'bg-indigo-100 text-indigo-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
      URGENT: 'bg-red-200 text-red-900'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': case 'CLOSED': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PROCESSING': case 'PENDING': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'ACCEPTED': case 'IN_PROGRESS': case 'ON_SITE': return <Clock className="h-4 w-4 text-orange-500" />
      default: return <FileText className="h-4 w-4 text-blue-500" />
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
          <p className="font-medium text-gray-900 text-sm truncate">{params.row.title}</p>
          <p className="text-xs text-blue-600">{params.row.ticketNumber}</p>
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
        <span className="text-xs font-mono text-gray-600">
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
            <p className="text-xs text-gray-600 truncate cursor-pointer text-center" style={{ maxWidth: '100%' }}>
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
          <p className="text-xs font-medium text-gray-900 truncate">
            {params.row.tenant?.name || 'N/A'}
          </p>
          {params.row.user && (
            <p className="text-xs text-gray-500 truncate">{params.row.user.name}</p>
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
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-700 truncate">{params.row.location}</span>
          </Box>
        ) : (
          <span className="text-xs text-gray-400">-</span>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading contractor dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You need to be logged in as a contractor to access this page.</p>
          <Button onClick={() => window.location.href = '/auth/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-5">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {session.user.name}!
            </h1>
            <p className="text-gray-600">Manage your assigned jobs and track your work</p>
          </div>
          <Button onClick={fetchContractorData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total Jobs</CardTitle>
              <Package className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.length}</div>
              <p className="text-xs text-blue-200 mt-1">All assigned</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-100">Pending Acceptance</CardTitle>
              <AlertCircle className="h-5 w-5 text-amber-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.filter(job => job.status === 'PENDING' || job.status === 'PROCESSING').length}</div>
              <p className="text-xs text-amber-200 mt-1">Needs action</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">In Progress</CardTitle>
              <Clock className="h-5 w-5 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.filter(job => job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS' || job.status === 'ON_SITE').length}</div>
              <p className="text-xs text-purple-200 mt-1">Active work</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Completed</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.filter(job => job.status === 'COMPLETED').length}</div>
              <p className="text-xs text-green-200 mt-1">Well done!</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-100">Overall Rating</CardTitle>
              <Star className="h-5 w-5 text-yellow-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center">
                {ratingStats.avgOverall.toFixed(1)}
                <Star className="h-5 w-5 ml-1 fill-current" />
              </div>
              <p className="text-xs text-yellow-100 mt-1">{ratingStats.totalRatings} reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Details Card */}
        {ratingStats.totalRatings > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-500" />
                Your Performance Metrics
              </CardTitle>
              <CardDescription>Based on {ratingStats.totalRatings} customer reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{ratingStats.avgPunctuality.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Punctuality</div>
                  <div className="flex justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${star <= ratingStats.avgPunctuality ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{ratingStats.avgCustomerService.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Customer Service</div>
                  <div className="flex justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${star <= ratingStats.avgCustomerService ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{ratingStats.avgWorkmanship.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Workmanship</div>
                  <div className="flex justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${star <= ratingStats.avgWorkmanship ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{ratingStats.avgOverall.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Overall</div>
                  <div className="flex justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${star <= ratingStats.avgOverall ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
                <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <div className="font-semibold text-green-800">{ratingStats.ppeComplianceRate}%</div>
                    <div className="text-xs text-green-600">PPE Compliance</div>
                  </div>
                </div>
                <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <div className="font-semibold text-blue-800">{ratingStats.procedureComplianceRate}%</div>
                    <div className="text-xs text-blue-600">Procedure Compliance</div>
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
                <ToggleLeft className="h-5 w-5 mr-2 text-blue-500" />
                Service Category Availability
              </CardTitle>
              <CardDescription>Toggle your availability for each service category. When unavailable, you won't be assigned to new tickets in that category.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div
                    key={category.categoryId}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      category.isAvailable 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.categoryColor || '#6b7280' }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{category.categoryName}</p>
                        <p className={`text-xs ${category.isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
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
            <CardTitle>Assigned Jobs</CardTitle>
            <CardDescription>
              View and manage your assigned maintenance tickets
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs assigned yet</h3>
                <p className="text-gray-600 mb-4">Jobs assigned by administrators will appear here.</p>
                <Button onClick={fetchContractorData} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check for New Jobs
                </Button>
              </div>
            ) : (
              <Box sx={{ width: '100%', p: 2 }}>
                <ScrollableDataGrid
                  rows={jobs}
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
                    <Badge className={getStatusColor(selectedJob.status)}>
                      {selectedJob.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(selectedJob.priority)}>
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {selectedJob.title}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Job ID:</span> {selectedJob.ticketNumber}</p>
                      <p><span className="font-medium">Type:</span> {selectedJob.type?.replace(/_/g, ' ')}</p>
                      <p><span className="font-medium">Assigned:</span> {new Date(selectedJob.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="space-y-3">
                      {selectedJob.tenant && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Client:</p>
                          <p className="text-sm text-gray-900">{selectedJob.tenant.name}</p>
                        </div>
                      )}
                      
                      {selectedJob.user && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Reporter:</p>
                          <p className="text-sm text-gray-900">{selectedJob.user.name}</p>
                          <p className="text-xs text-gray-500">{selectedJob.user.email}</p>
                        </div>
                      )}
                      
                      {selectedJob.location && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Location:</p>
                          <p className="text-sm text-gray-900">{selectedJob.location}</p>
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
                  
                  return (
                    <div className={`p-4 rounded-lg border-2 ${
                      isCompleted ? 'bg-gray-50 border-gray-200' :
                      currentStatus === 'red' ? 'bg-red-50 border-red-300' :
                      currentStatus === 'yellow' ? 'bg-yellow-50 border-yellow-300' :
                      'bg-green-50 border-green-300'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Timer className={`h-5 w-5 ${
                          isCompleted ? 'text-gray-500' :
                          currentStatus === 'red' ? 'text-red-600' :
                          currentStatus === 'yellow' ? 'text-yellow-600' :
                          'text-green-600'
                        }`} />
                        <h4 className="text-sm font-semibold text-gray-900">SLA Status</h4>
                        <Chip
                          label={slaInfo.formattedResolutionRemaining}
                          size="small"
                          color={getSLAChipColor(currentStatus)}
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 font-medium">Response Due:</p>
                          <p className={`font-semibold ${
                            slaInfo.responseStatus === 'red' ? 'text-red-600' :
                            slaInfo.responseStatus === 'yellow' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {selectedJob.responseDeadline 
                              ? new Date(selectedJob.responseDeadline).toLocaleString()
                              : 'Not set'
                            }
                          </p>
                          {!isCompleted && selectedJob.responseDeadline && (
                            <p className="text-xs text-gray-500 mt-1">
                              {slaInfo.responseTimeRemaining}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-gray-600 font-medium">Resolution Due:</p>
                          <p className={`font-semibold ${
                            slaInfo.resolutionStatus === 'red' ? 'text-red-600' :
                            slaInfo.resolutionStatus === 'yellow' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {selectedJob.resolutionDeadline 
                              ? new Date(selectedJob.resolutionDeadline).toLocaleString()
                              : 'Not set'
                            }
                          </p>
                          {!isCompleted && selectedJob.resolutionDeadline && (
                            <p className="text-xs text-gray-500 mt-1">
                              {slaInfo.resolutionTimeRemaining}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {!isCompleted && currentStatus === 'red' && (
                        <div className="mt-3 p-2 bg-red-100 rounded text-red-700 text-sm flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">SLA breached! Immediate action required.</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {selectedJob.description}
                  </p>
                </div>

                {/* Asset Info */}
                {selectedJob.asset && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Related Asset
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg border">
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
                              <p className="text-xs text-center text-gray-500 mt-1">
                                +{selectedJob.asset.images.length - 1} more
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Asset Details */}
                        <div className="flex-1 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900 text-base">{selectedJob.asset.name}</p>
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
                          <div className="grid grid-cols-2 gap-2 text-gray-600">
                            <p><span className="font-medium text-gray-700">Asset #:</span> {selectedJob.asset.assetNumber}</p>
                            <p><span className="font-medium text-gray-700">Status:</span> {selectedJob.asset.status?.replace('_', ' ') || 'N/A'}</p>
                            {selectedJob.asset.brand && (
                              <p><span className="font-medium text-gray-700">Brand:</span> {selectedJob.asset.brand}</p>
                            )}
                            {selectedJob.asset.model && (
                              <p><span className="font-medium text-gray-700">Model:</span> {selectedJob.asset.model}</p>
                            )}
                            {selectedJob.asset.serialNumber && (
                              <p className="col-span-2"><span className="font-medium text-gray-700">Serial #:</span> {selectedJob.asset.serialNumber}</p>
                            )}
                            <p className="col-span-2 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="font-medium text-gray-700">Location:</span> {selectedJob.asset.location}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Repair History */}
                      {selectedJob.asset.repairHistory && selectedJob.asset.repairHistory.length > 0 && (
                        <div className="mt-4 pt-3 border-t">
                          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Wrench className="h-4 w-4" />
                            Repair History ({selectedJob.asset.repairHistory.length})
                          </h5>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {selectedJob.asset.repairHistory.map((repair, idx) => (
                              <div 
                                key={repair.id || idx} 
                                className="bg-white rounded border overflow-hidden"
                              >
                                {/* Clickable Header */}
                                <div 
                                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                                  onClick={() => setExpandedRepairId(expandedRepairId === repair.id ? null : repair.id)}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${expandedRepairId === repair.id ? 'rotate-90' : ''}`} />
                                      <span className="font-mono text-xs text-blue-600">#{repair.ticketNumber}</span>
                                      <span className="font-medium text-gray-800 text-sm">{repair.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 ml-6 mt-0.5">
                                      <span className="text-xs text-gray-500">
                                        {new Date(repair.createdAt).toLocaleDateString()}
                                        {repair.completedAt && ` → ${new Date(repair.completedAt).toLocaleDateString()}`}
                                      </span>
                                      {repair.contractorName && (
                                        <span className="text-xs text-gray-500">• {repair.contractorName}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                      repair.status === 'COMPLETED' || repair.status === 'CLOSED' 
                                        ? 'bg-green-100 text-green-700'
                                        : repair.status === 'IN_PROGRESS' 
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {repair.status?.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Expanded Details */}
                                {expandedRepairId === repair.id && (
                                  <div className="px-4 pb-3 pt-1 bg-gray-50 border-t text-sm space-y-3">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="font-medium text-gray-600">Type:</span>{' '}
                                        <span className="text-gray-800">{repair.type?.replace('_', ' ')}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">Priority:</span>{' '}
                                        <span className={`font-medium ${
                                          repair.priority === 'CRITICAL' ? 'text-red-600' :
                                          repair.priority === 'HIGH' ? 'text-orange-600' :
                                          repair.priority === 'MEDIUM' ? 'text-yellow-600' :
                                          'text-green-600'
                                        }`}>{repair.priority}</span>
                                      </div>
                                      {repair.contractorName && (
                                        <div className="col-span-2">
                                          <span className="font-medium text-gray-600">Assigned Contractor:</span>{' '}
                                          <span className="text-gray-800">{repair.contractorName}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Original Issue Description */}
                                    {repair.description && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-600 mb-1">Original Issue:</p>
                                        <p className="text-xs text-gray-700 bg-white p-2 rounded border">{repair.description}</p>
                                      </div>
                                    )}
                                    
                                    {/* Approved Work Description */}
                                    {repair.workDescription && (
                                      <div>
                                        <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          Approved Work Description:
                                        </p>
                                        <p className="text-xs text-gray-700 bg-green-50 p-2 rounded border border-green-200 whitespace-pre-wrap">{repair.workDescription}</p>
                                      </div>
                                    )}
                                    
                                    {/* Timeline */}
                                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-1 border-t">
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
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-medium text-amber-800 mb-2 flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Quote/Estimate Required
                      </h4>
                      <p className="text-sm text-amber-700 mb-3">
                        {selectedJob.myQuoteRequest 
                          ? 'You have been invited to submit a quote for this job. Other contractors may also be quoting.'
                          : 'The admin has requested a quote for this job. Please review the details and submit your estimate.'}
                      </p>
                      {selectedJob.myQuoteRequest?.notes && (
                        <div className="bg-white border border-amber-200 rounded p-3 mb-3">
                          <p className="text-xs text-gray-500 font-medium">Admin Notes:</p>
                          <p className="text-sm text-gray-700">{selectedJob.myQuoteRequest.notes}</p>
                        </div>
                      )}
                      {selectedJob.quoteRejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                          <p className="text-sm text-red-700 font-medium">Previous quote was rejected:</p>
                          <p className="text-sm text-red-600">{selectedJob.quoteRejectionReason}</p>
                        </div>
                      )}
                      <Button 
                        onClick={() => setShowQuoteDialog(true)}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Submit Quote
                      </Button>
                    </div>
                  )}

                  {/* Quote Submitted - Waiting for approval (multi-contractor) */}
                  {selectedJob.myQuoteRequest && selectedJob.myQuoteRequest.status === 'submitted' && (
                    <div className="w-full bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="font-medium text-indigo-800 mb-2 flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Quote Submitted - Awaiting Decision
                      </h4>
                      <p className="text-sm text-indigo-700 mb-2">
                        Your quote has been submitted. The admin will review all quotes and award the job.
                      </p>
                      <div className="bg-white rounded p-3 border border-indigo-200">
                        <p className="text-lg font-bold text-indigo-800">
                          ${selectedJob.myQuoteRequest.quoteAmount?.toFixed(2)}
                        </p>
                        {selectedJob.myQuoteRequest.quoteDescription && (
                          <p className="text-sm text-gray-600 mt-1">{selectedJob.myQuoteRequest.quoteDescription}</p>
                        )}
                        {selectedJob.myQuoteRequest.estimatedDays && (
                          <p className="text-xs text-gray-500 mt-1">
                            Estimated completion: {selectedJob.myQuoteRequest.estimatedDays} day(s)
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Submitted: {selectedJob.myQuoteRequest.submittedAt && new Date(selectedJob.myQuoteRequest.submittedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quote Submitted - Single contractor flow (old) */}
                  {selectedJob.status === 'QUOTE_SUBMITTED' && !selectedJob.myQuoteRequest && (
                    <div className="w-full bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="font-medium text-indigo-800 mb-2 flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Quote Pending Approval
                      </h4>
                      <p className="text-sm text-indigo-700 mb-2">
                        Your quote has been submitted. Waiting for admin approval.
                      </p>
                      <div className="bg-white rounded p-3 border border-indigo-200">
                        <p className="text-lg font-bold text-indigo-800">${selectedJob.quoteAmount?.toFixed(2)}</p>
                        {selectedJob.quoteDescription && (
                          <p className="text-sm text-gray-600 mt-1">{selectedJob.quoteDescription}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
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
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject Job
                      </Button>
                      <Button 
                        onClick={() => setShowAcceptDialog(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept Job
                      </Button>
                    </>
                  )}
                  
                  {selectedJob.status === 'ACCEPTED' && (
                    <div className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
                      Waiting for user to confirm your arrival on site
                    </div>
                  )}
                  
                  {selectedJob.status === 'ON_SITE' && (
                    <div className="text-sm text-purple-600 bg-purple-50 px-4 py-2 rounded-lg">
                      On site - waiting for user to confirm job completion
                    </div>
                  )}
                  
                  {/* Work Description Required - User marked job complete */}
                  {selectedJob.status === 'AWAITING_DESCRIPTION' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-medium text-amber-800 mb-2 flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Work Description Required
                      </h4>
                      <p className="text-sm text-amber-700 mb-3">
                        The user has marked this job as complete. Please provide a detailed description of the work done.
                      </p>
                      {selectedJob.workDescriptionRejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                          <p className="text-sm text-red-700 font-medium">Previous description was rejected:</p>
                          <p className="text-sm text-red-600">{selectedJob.workDescriptionRejectionReason}</p>
                        </div>
                      )}
                      <Button 
                        onClick={() => setShowWorkDescriptionDialog(true)}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Submit Work Description
                      </Button>
                    </div>
                  )}
                  
                  {/* Awaiting User Approval */}
                  {selectedJob.status === 'AWAITING_WORK_APPROVAL' && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="font-medium text-indigo-800 mb-2 flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Awaiting User Approval
                      </h4>
                      <p className="text-sm text-indigo-700 mb-3">
                        Your work description has been submitted. Waiting for the user to review and approve.
                      </p>
                      {selectedJob.workDescription && (
                        <div className="bg-white border border-indigo-100 rounded p-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Your submitted description:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedJob.workDescription}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedJob.status === 'COMPLETED' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Work Description Approved
                      </h4>
                      <p className="text-sm text-green-700 mb-3">
                        Your work has been approved! You can now upload your invoice.
                      </p>
                      {selectedJob.workDescription && (
                        <div className="bg-white border border-green-100 rounded p-3 mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Approved work description:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedJob.workDescription}</p>
                        </div>
                      )}
                      {!selectedJob.invoice && (
                        <Button 
                          onClick={() => {
                            setInvoiceForm(prev => ({ ...prev, workDescription: selectedJob.workDescription || '' }))
                            setShowInvoiceDialog(true)
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Invoice
                        </Button>
                      )}
                      {selectedJob.invoice && (
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-green-600 flex items-center">
                            <Receipt className="h-4 w-4 mr-2" />
                            Invoice #{selectedJob.invoice.invoiceNumber} - ${selectedJob.invoice.amount}
                          </div>
                          <Badge className={
                            selectedJob.invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                            selectedJob.invoice.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
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
                          <div className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg flex items-center">
                            <Receipt className="h-4 w-4 mr-2" />
                            Invoice #{selectedJob.invoice.invoiceNumber} submitted - ${selectedJob.invoice.amount}
                          </div>
                          <Badge className={
                            selectedJob.invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                            selectedJob.invoice.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
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
                          className="bg-blue-600 hover:bg-blue-700"
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
                <div className={`p-3 rounded-lg border-2 ${
                  new Date(selectedJob.resolutionDeadline) < new Date() 
                    ? 'bg-red-50 border-red-300' 
                    : 'bg-amber-50 border-amber-300'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className={`h-5 w-5 ${
                      new Date(selectedJob.resolutionDeadline) < new Date()
                        ? 'text-red-600'
                        : 'text-amber-600'
                    }`} />
                    <span className="font-semibold text-gray-900">SLA Deadline</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    This ticket must be closed by{' '}
                    <span className="font-bold">
                      {new Date(selectedJob.resolutionDeadline).toLocaleString()}
                    </span>
                  </p>
                  {(() => {
                    const deadline = new Date(selectedJob.resolutionDeadline)
                    const now = new Date()
                    const diffMs = deadline.getTime() - now.getTime()
                    if (diffMs <= 0) {
                      return (
                        <p className="text-sm text-red-600 font-semibold mt-1">
                          ⚠️ SLA already breached!
                        </p>
                      )
                    }
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                    return (
                      <p className="text-sm text-amber-700 mt-1">
                        Time remaining: <span className="font-semibold">{diffHrs}h {diffMins}m</span>
                      </p>
                    )
                  })()}
                  
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="deadlineConfirm"
                      checked={deadlineConfirmed}
                      onChange={(e) => setDeadlineConfirmed(e.target.checked)}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="deadlineConfirm" className="text-sm font-medium text-gray-700">
                      I confirm I can meet this deadline
                    </label>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-600">
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
                    <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
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
                      className={arrivalDateConfirmed ? 'border-green-500 bg-green-50' : ''}
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
                      className={arrivalDateConfirmed ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {arrivalDateConfirmed ? (
                        <><CheckCircle className="h-4 w-4 mr-1" /> Set</>
                      ) : (
                        'Set'
                      )}
                    </Button>
                  </div>
                  {arrivalDateConfirmed && jobPlan.arrivalDate && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
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
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
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
                disabled={actionLoading || (selectedJob?.resolutionDeadline && !deadlineConfirmed)}
                className="bg-green-600 hover:bg-green-700"
                title={!deadlineConfirmed && selectedJob?.resolutionDeadline ? 'Please confirm you can meet the deadline' : ''}
              >
                {actionLoading ? 'Submitting...' : 'Accept & Submit Plan'}
              </Button>
            </DialogFooter>
            {!deadlineConfirmed && selectedJob?.resolutionDeadline && (
              <p className="text-xs text-amber-600 text-center mt-2">
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
              <p className="text-sm text-gray-600">
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
                className="bg-red-600 hover:bg-red-700"
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
                <Receipt className="h-5 w-5 mr-2 text-blue-600" />
                Upload Invoice
              </DialogTitle>
            </DialogHeader>
            
            {selectedJob && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="font-medium text-gray-900">{selectedJob.title}</p>
                  <p className="text-gray-600">Ticket: {selectedJob.ticketNumber}</p>
                  <p className="text-gray-600">Client: {selectedJob.tenant.name}</p>
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">Quoted Amount:</span>
                        <span className="text-lg font-bold text-blue-900">
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
                      <p className="text-xs text-amber-600 mt-1 flex items-center">
                        <span className="mr-1">⚠️</span>
                        Invoice amount exceeds quoted amount. Please provide a variation description below.
                      </p>
                    )}
                  </div>

                  {/* Variation Description - only show if invoice exceeds quote */}
                  {(selectedJob.quoteAmount || selectedJob.myQuoteRequest?.quoteAmount) && 
                    invoiceForm.amount && 
                    parseFloat(invoiceForm.amount) > (selectedJob.myQuoteRequest?.quoteAmount || selectedJob.quoteAmount || 0) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <Label htmlFor="variationDescription" className="text-amber-800 font-medium">
                        Variation Description *
                      </Label>
                      <p className="text-xs text-amber-700 mt-1 mb-2">
                        Please explain why the final invoice amount is higher than the quoted amount.
                      </p>
                      <Textarea
                        id="variationDescription"
                        placeholder="e.g., Additional parts were required, scope of work expanded due to unforeseen issues, etc."
                        value={invoiceForm.variationDescription}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, variationDescription: e.target.value })}
                        rows={3}
                        className="bg-white"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="workDescription">
                      Approved Work Description
                      <span className="text-xs text-gray-500 ml-2">(Pre-filled from site manager approval)</span>
                    </Label>
                    <Textarea
                      id="workDescription"
                      placeholder="No work description available"
                      value={invoiceForm.workDescription}
                      readOnly
                      disabled
                      rows={4}
                      className="mt-1 bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                    {!invoiceForm.workDescription && (
                      <p className="text-xs text-amber-600 mt-1">Note: No approved work description found for this job.</p>
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
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100
                          cursor-pointer"
                      />
                      {invoiceForm.file && (
                        <p className="mt-2 text-sm text-green-600 flex items-center">
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
                disabled={
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
                }
                className="bg-blue-600 hover:bg-blue-700"
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
                <FileText className="h-5 w-5 mr-2 text-amber-600" />
                Submit Work Description
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-5">
              <p className="text-sm text-gray-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Please complete all required sections below. This structured report will be reviewed by the client before the job can be closed.
              </p>
              
              {selectedJob?.workDescriptionRejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-700">Previous submission was rejected:</p>
                  <p className="text-sm text-red-600 mt-1">{selectedJob.workDescriptionRejectionReason}</p>
                </div>
              )}
              
              {/* 1. Work Summary */}
              <div className="border rounded-lg p-4 bg-white">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">1</span>
                  Work Summary *
                </Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">In one or two sentences, clearly state what work was done and why.</p>
                <Textarea
                  placeholder="e.g., Replaced faulty submersible pump capacitor at Pump 3 due to intermittent tripping and loss of fuel flow."
                  value={workDescriptionForm.workSummary}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, workSummary: e.target.value})}
                  rows={2}
                />
              </div>

              {/* 2. Work Area */}
              <div className="border rounded-lg p-4 bg-white">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">2</span>
                  Exact Location of Work *
                </Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">Specify where the work was carried out.</p>
                <Input
                  placeholder="e.g., Main building rooftop, Server room B2, Parking lot entrance"
                  value={workDescriptionForm.workArea}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, workArea: e.target.value})}
                />
              </div>

              {/* 3. Fault Identified */}
              <div className="border rounded-lg p-4 bg-white">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">3</span>
                  Fault / Issue Identified *
                </Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">Describe the actual fault found on site (not just what was reported).</p>
                <Textarea
                  placeholder="e.g., Pump motor was operational but capacitor was leaking oil and reading below required microfarad rating."
                  value={workDescriptionForm.faultIdentified}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, faultIdentified: e.target.value})}
                  rows={2}
                />
              </div>

              {/* 4. Work Performed */}
              <div className="border rounded-lg p-4 bg-white">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">4</span>
                  Work Performed (Step-by-Step) *
                </Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">List the key actions taken. One step per line.</p>
                <Textarea
                  placeholder="1. Isolated power supply to equipment&#10;2. Removed damaged component&#10;3. Installed replacement and tested operation"
                  value={workDescriptionForm.workPerformed}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, workPerformed: e.target.value})}
                  rows={4}
                />
              </div>

              {/* 5. Materials Used */}
              <div className="border rounded-lg p-4 bg-white">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">5</span>
                  Materials / Parts Used *
                </Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">List all materials used. Enter "None" if no materials were used.</p>
                <Textarea
                  placeholder="e.g.,&#10;Capacitor - 40µF, 450V - 1 unit&#10;Cable ties - 200mm - 10 pcs&#10;Electrical tape - 1 roll"
                  value={workDescriptionForm.materialsUsed}
                  onChange={(e) => setWorkDescriptionForm({...workDescriptionForm, materialsUsed: e.target.value})}
                  rows={3}
                />
              </div>

              {/* 6. Testing & Verification */}
              <div className="border rounded-lg p-4 bg-white">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">6</span>
                  Testing & Verification *
                </Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">Confirm testing was performed and describe what was tested.</p>
                <label className={`flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${workDescriptionForm.equipmentTested ? 'border-green-500 bg-green-50' : ''}`}>
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
              <div className="border rounded-lg p-4 bg-white">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">7</span>
                  Outstanding Issues / Recommendations
                </Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">State if further work is required or if any risks remain.</p>
                <div className="space-y-2 mt-2">
                  <label className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${workDescriptionForm.outstandingIssues === 'none' ? 'border-green-500 bg-green-50' : ''}`}>
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
                  <label className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${workDescriptionForm.outstandingIssues === 'followup' ? 'border-orange-500 bg-orange-50' : ''}`}>
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
                className="bg-amber-600 hover:bg-amber-700"
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
                <FileText className="h-5 w-5 mr-2 text-amber-600" />
                Submit Quote/Estimate
              </DialogTitle>
            </DialogHeader>
            
            {selectedJob && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="font-medium text-gray-900">{selectedJob.title}</p>
                  <p className="text-gray-600">Ticket: {selectedJob.ticketNumber}</p>
                  <p className="text-gray-600">Client: {selectedJob.tenant.name}</p>
                  {selectedJob.description && (
                    <p className="text-gray-500 mt-2 text-xs">{selectedJob.description}</p>
                  )}
                </div>

                <p className="text-sm text-gray-600">
                  Please provide your quote for this job. The admin will review and approve before the job is formally assigned.
                </p>
                
                {selectedJob.quoteRejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-700">Previous quote was rejected:</p>
                    <p className="text-sm text-red-600 mt-1">{selectedJob.quoteRejectionReason}</p>
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
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-medium
                        file:bg-amber-50 file:text-amber-700
                        hover:file:bg-amber-100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
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
                className="bg-amber-600 hover:bg-amber-700"
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