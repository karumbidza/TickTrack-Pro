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
import { TicketChat } from '@/components/tickets/ticket-chat'
import { MediaViewer } from '@/components/ui/media-viewer'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
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
  Paperclip
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
  tenant: {
    name: string
  }
  user: {
    name: string
    email: string
  }
  asset?: {
    name: string
    assetNumber: string
    location: string
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
  file: File | null
}

export function ContractorDashboard() {
  const { data: session } = useSession()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Job Plan state
  const [jobPlan, setJobPlan] = useState<JobPlan>({
    technicianName: '',
    arrivalDate: '',
    estimatedDuration: '',
    contactNumber: '',
    notes: ''
  })
  const [rejectionReason, setRejectionReason] = useState('')
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>({
    invoiceNumber: '',
    amount: '',
    workDescription: '',
    file: null
  })
  const [uploadingInvoice, setUploadingInvoice] = useState(false)
  
  // Work description submission state
  const [showWorkDescriptionDialog, setShowWorkDescriptionDialog] = useState(false)
  const [workDescriptionText, setWorkDescriptionText] = useState('')
  const [submittingWorkDescription, setSubmittingWorkDescription] = useState(false)
  
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
      const [jobsResponse, profileResponse] = await Promise.all([
        fetch('/api/contractor/jobs'),
        fetch('/api/contractor/profile')
      ])
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setJobs(jobsData || [])
      } else {
        toast.error('Failed to fetch jobs')
      }
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        if (profileData.ratingStats) {
          setRatingStats(profileData.ratingStats)
        }
      }
    } catch (error) {
      console.error('Failed to fetch contractor data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
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
    
    if (!invoiceForm.invoiceNumber || !invoiceForm.amount || !invoiceForm.workDescription || !invoiceForm.file) {
      toast.error('Please fill all fields including work description and upload an invoice PDF')
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
          invoiceFileUrl: fileUrl
        })
      })

      if (response.ok) {
        toast.success('Invoice uploaded successfully')
        setShowInvoiceDialog(false)
        setInvoiceForm({ invoiceNumber: '', amount: '', workDescription: '', file: null })
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
    
    if (!workDescriptionText.trim()) {
      toast.error('Please provide a description of the work done')
      return
    }

    setSubmittingWorkDescription(true)
    try {
      const response = await fetch(`/api/tickets/${selectedJob.id}/work-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDescription: workDescriptionText
        })
      })

      if (response.ok) {
        toast.success('Work description submitted successfully. Waiting for user approval.')
        setShowWorkDescriptionDialog(false)
        setWorkDescriptionText('')
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
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
      field: 'jobDetails',
      headerName: 'Job Details',
      flex: 2,
      minWidth: 300,
      renderCell: (params: GridRenderCellParams<Job>) => {
        const job = params.row
        return (
          <Box sx={{ py: 1.5, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box sx={{ flexShrink: 0, mt: 0.5 }}>
                {getStatusIcon(job.status)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <span className="text-base font-semibold text-gray-900 truncate">
                    {job.title}
                  </span>
                  <Chip 
                    label={job.type?.replace(/_/g, ' ')} 
                    size="small" 
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                </Box>
                <p className="text-sm font-medium text-blue-600">{job.ticketNumber}</p>
                <p className="text-sm text-gray-700 line-clamp-1">{job.description}</p>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                  {job.location && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </Box>
              </Box>
            </Box>
          </Box>
        )
      },
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 100,
      renderCell: (params: GridRenderCellParams<Job>) => (
        <Chip
          label={params.row.priority}
          size="small"
          color={getPriorityChipColor(params.row.priority)}
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'tenant',
      headerName: 'Client',
      width: 150,
      renderCell: (params: GridRenderCellParams<Job>) => (
        <Box>
          <p className="text-sm font-medium text-gray-900">
            {params.row.tenant?.name || 'N/A'}
          </p>
          {params.row.user && (
            <p className="text-xs text-gray-500">{params.row.user.name}</p>
          )}
        </Box>
      ),
    },
    {
      field: 'asset',
      headerName: 'Asset',
      width: 130,
      renderCell: (params: GridRenderCellParams<Job>) => {
        const job = params.row
        return job.asset ? (
          <Box>
            <p className="text-sm font-medium text-gray-900">{job.asset.name}</p>
            <p className="text-xs text-gray-500">{job.asset.assetNumber}</p>
          </Box>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams<Job>) => (
        <Chip
          label={params.row.status.replace(/_/g, ' ')}
          size="small"
          color={getStatusChipColor(params.row.status)}
          sx={{ fontWeight: 500 }}
        />
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
                <DataGrid
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
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Related Asset</h4>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      <p><span className="font-medium">Asset:</span> {selectedJob.asset.name}</p>
                      <p><span className="font-medium">Asset Number:</span> {selectedJob.asset.assetNumber}</p>
                      <p><span className="font-medium">Location:</span> {selectedJob.asset.location}</p>
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
                          onClick={() => setShowInvoiceDialog(true)}
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
                          onClick={() => setShowInvoiceDialog(true)}
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
        <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Accept Job & Submit Plan</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
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
                  <Input
                    id="arrivalDate"
                    type="datetime-local"
                    value={jobPlan.arrivalDate}
                    onChange={(e) => setJobPlan({ ...jobPlan, arrivalDate: e.target.value })}
                  />
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
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? 'Submitting...' : 'Accept & Submit Plan'}
              </Button>
            </DialogFooter>
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
                  </div>

                  <div>
                    <Label htmlFor="workDescription">
                      Work Description *
                      <span className="text-xs text-gray-500 ml-2">(Will appear in invoice summary)</span>
                    </Label>
                    <Textarea
                      id="workDescription"
                      placeholder="Describe all work performed, materials used, repairs made, etc."
                      value={invoiceForm.workDescription}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, workDescription: e.target.value })}
                      rows={4}
                      className="mt-1"
                    />
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
                setInvoiceForm({ invoiceNumber: '', amount: '', workDescription: '', file: null })
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleInvoiceUpload}
                disabled={uploadingInvoice || !invoiceForm.invoiceNumber || !invoiceForm.amount || !invoiceForm.workDescription || !invoiceForm.file}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploadingInvoice ? 'Uploading...' : 'Submit Invoice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Work Description Submission Dialog */}
        <Dialog open={showWorkDescriptionDialog} onOpenChange={setShowWorkDescriptionDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-amber-600" />
                Submit Work Description
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please provide a detailed description of the work you performed. This will be reviewed by the user before they can close the ticket.
              </p>
              
              {selectedJob?.workDescriptionRejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-700">Previous submission was rejected:</p>
                  <p className="text-sm text-red-600 mt-1">{selectedJob.workDescriptionRejectionReason}</p>
                </div>
              )}
              
              <div>
                <Label htmlFor="workDescription">Description of Work Done *</Label>
                <Textarea
                  id="workDescription"
                  placeholder="Describe in detail what work was performed, parts replaced, repairs made, etc..."
                  value={workDescriptionText}
                  onChange={(e) => setWorkDescriptionText(e.target.value)}
                  rows={6}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Be specific about what was done. This will be shown to the user for approval.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowWorkDescriptionDialog(false)
                setWorkDescriptionText('')
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitWorkDescription}
                disabled={submittingWorkDescription || !workDescriptionText.trim()}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {submittingWorkDescription ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}