'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileUpload } from '@/components/ui/file-upload'
import { MediaHoverPreview } from '@/components/ui/media-viewer'
import { 
  Eye, Download, FileText, DollarSign, Check, X, AlertCircle, 
  MessageSquare, Printer, Clock, User, Building, MapPin, Star,
  CheckCircle, XCircle, Loader2, ExternalLink, CreditCard, Wallet
} from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  paidAmount: number
  balance: number
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REJECTED'
  hoursWorked: number
  hourlyRate: number
  description: string
  workDescription?: string
  notes?: string
  rejectionReason?: string
  clarificationRequest?: string
  clarificationResponse?: string
  createdAt: string
  paidDate?: string
  invoiceFileUrl?: string
  proofOfPaymentUrl?: string
  approvedAt?: string
  paymentBatchId?: string
  contractor: {
    name: string
    email: string
  }
  ticket: {
    id: string
    title: string
    ticketNumber: string
  }
  paymentBatch?: {
    id: string
    batchNumber: string
    popFileUrl: string
    popReference?: string
    paymentDate: string
    totalAmount: number
  }
}

interface InvoiceDetails {
  invoice: {
    id: string
    invoiceNumber: string
    amount: number
    hoursWorked?: number
    hourlyRate?: number
    description?: string
    workDescription?: string
    status: string
    paidAmount: number
    balance: number
    notes?: string
    invoiceFileUrl?: string
    proofOfPaymentUrl?: string
    rejectionReason?: string
    clarificationRequest?: string
    clarificationResponse?: string
    createdAt: string
    paidDate?: string
  }
  contractor: {
    name: string
    email: string
    companyName?: string
    phone?: string
    specializations?: string[]
  }
  ticket: {
    id: string
    ticketNumber: string
    title: string
    description: string
    type?: string
    priority: string
    status: string
    location?: string
    createdAt: string
    updatedAt: string
    closedAt?: string
    reporter: {
      name: string
      email: string
    }
    asset?: {
      name: string
      assetNumber: string
      location: string
    }
    attachments?: { originalName: string; url: string; mimeType: string }[]
  }
  rating?: {
    overall: number
    punctuality: number
    customerService: number
    workmanship: number
    ppeCompliant: boolean
    followedSiteProcedures: boolean
    comment?: string
  }
  tenant: {
    name: string
    domain?: string
  }
}

export function AdminInvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('pending')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    notes: '',
    proofFile: null as File | null
  })
  const [processing, setProcessing] = useState(false)
  
  // Action states
  const [rejectionReason, setRejectionReason] = useState('')
  const [clarificationRequest, setClarificationRequest] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showClarificationDialog, setShowClarificationDialog] = useState(false)
  const [actionInvoice, setActionInvoice] = useState<Invoice | null>(null)
  
  // Batch payment states
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set())
  const [showBatchPaymentDialog, setShowBatchPaymentDialog] = useState(false)
  const [batchPaymentData, setBatchPaymentData] = useState({
    popFile: null as File | null,
    popReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [batchProcessing, setBatchProcessing] = useState(false)
  
  // Payment batches for Paid view
  const [paymentBatches, setPaymentBatches] = useState<{
    id: string
    batchNumber: string
    popFileUrl: string
    popReference?: string
    paymentDate: string
    totalAmount: number
    notes?: string
    processedBy?: { name: string; email: string }
    invoices: Invoice[]
  }[]>([])
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])
  
  useEffect(() => {
    // Fetch payment batches when viewing paid tab
    if (filter === 'paid') {
      fetchPaymentBatches()
    }
  }, [filter])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/admin/invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchPaymentBatches = async () => {
    try {
      const response = await fetch('/api/admin/invoices/batch-payment')
      if (response.ok) {
        const data = await response.json()
        setPaymentBatches(data)
      }
    } catch (error) {
      console.error('Error fetching payment batches:', error)
    }
  }

  const fetchInvoiceDetails = async (invoiceId: string) => {
    setDetailsLoading(true)
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`)
      if (response.ok) {
        const data = await response.json()
        setInvoiceDetails({
          invoice: {
            id: data.id,
            invoiceNumber: data.invoiceNumber,
            amount: data.amount,
            hoursWorked: data.hoursWorked,
            hourlyRate: data.hourlyRate,
            description: data.description,
            workDescription: data.workDescription,
            status: data.status,
            paidAmount: data.paidAmount,
            balance: data.balance,
            notes: data.notes,
            invoiceFileUrl: data.invoiceFileUrl,
            proofOfPaymentUrl: data.proofOfPaymentUrl,
            rejectionReason: data.rejectionReason,
            clarificationRequest: data.clarificationRequest,
            clarificationResponse: data.clarificationResponse,
            createdAt: data.createdAt,
            paidDate: data.paidDate,
          },
          contractor: {
            name: data.contractor?.name || 'N/A',
            email: data.contractor?.email || 'N/A',
            companyName: data.contractor?.contractorProfile?.companyName,
            phone: data.contractor?.contractorProfile?.phone,
            specializations: data.contractor?.contractorProfile?.specializations,
          },
          ticket: {
            id: data.ticket?.id,
            ticketNumber: data.ticket?.ticketNumber,
            title: data.ticket?.title,
            description: data.ticket?.description,
            type: data.ticket?.type,
            priority: data.ticket?.priority,
            status: data.ticket?.status,
            location: data.ticket?.location,
            createdAt: data.ticket?.createdAt,
            updatedAt: data.ticket?.updatedAt,
            closedAt: data.ticket?.closedAt,
            reporter: {
              name: data.ticket?.user?.name || 'N/A',
              email: data.ticket?.user?.email || 'N/A',
            },
            asset: data.ticket?.asset,
            attachments: data.ticket?.attachments,
          },
          rating: undefined,
          tenant: {
            name: data.tenant?.name || 'N/A',
            domain: data.tenant?.domain,
          }
        })
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error)
      toast.error('Failed to load invoice details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleStatusUpdate = async (invoiceId: string, status: string, reason?: string) => {
    setProcessing(true)
    try {
      const body: Record<string, unknown> = { status }
      if (status === 'REJECTED' && reason) {
        body.rejectionReason = reason
      }
      
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        toast.success(`Invoice ${status.toLowerCase()} successfully`)
        await fetchInvoices()
        setShowRejectDialog(false)
        setRejectionReason('')
        setActionInvoice(null)
        
        if (showDetailModal && invoiceDetails?.invoice.id === invoiceId) {
          await fetchInvoiceDetails(invoiceId)
        }
      } else {
        toast.error('Failed to update invoice status')
      }
    } catch (error) {
      console.error('Error updating invoice status:', error)
      toast.error('Failed to update invoice status')
    } finally {
      setProcessing(false)
    }
  }

  const handleClarificationRequest = async (invoiceId: string, request: string) => {
    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clarificationRequest: request })
      })

      if (response.ok) {
        toast.success('Clarification request sent to contractor')
        await fetchInvoices()
        setShowClarificationDialog(false)
        setClarificationRequest('')
        setActionInvoice(null)
        
        if (showDetailModal && invoiceDetails?.invoice.id === invoiceId) {
          await fetchInvoiceDetails(invoiceId)
        }
      } else {
        toast.error('Failed to send clarification request')
      }
    } catch (error) {
      console.error('Error sending clarification request:', error)
      toast.error('Failed to send clarification request')
    } finally {
      setProcessing(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentData.amount) return

    setProcessing(true)
    try {
      let proofOfPaymentUrl = ''
      if (paymentData.proofFile) {
        proofOfPaymentUrl = `/uploads/payments/${Date.now()}-${paymentData.proofFile.name}`
      }

      const response = await fetch(`/api/admin/invoices/${selectedInvoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentData.amount),
          notes: paymentData.notes,
          proofOfPaymentUrl
        })
      })

      if (response.ok) {
        toast.success('Payment processed successfully')
        await fetchInvoices()
        setSelectedInvoice(null)
        setPaymentData({ amount: '', notes: '', proofFile: null })
      } else {
        toast.error('Failed to process payment')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error('Failed to process payment')
    } finally {
      setProcessing(false)
    }
  }
  
  // Batch payment handler
  const handleBatchPayment = async () => {
    if (selectedInvoiceIds.size === 0 || !batchPaymentData.popFile) {
      toast.error('Please select invoices and upload a Proof of Payment')
      return
    }
    
    setBatchProcessing(true)
    try {
      // First upload the POP file using the dedicated POP upload endpoint
      const formData = new FormData()
      formData.append('file', batchPaymentData.popFile)
      
      const uploadResponse = await fetch('/api/upload/pop', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json()
        throw new Error(uploadError.message || 'Failed to upload Proof of Payment')
      }
      
      const { url: popFileUrl } = await uploadResponse.json()
      
      // Now create the batch payment
      const response = await fetch('/api/admin/invoices/batch-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedInvoiceIds),
          popFileUrl,
          popReference: batchPaymentData.popReference,
          paymentDate: batchPaymentData.paymentDate,
          notes: batchPaymentData.notes
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        setShowBatchPaymentDialog(false)
        setSelectedInvoiceIds(new Set())
        setBatchPaymentData({
          popFile: null,
          popReference: '',
          paymentDate: new Date().toISOString().split('T')[0],
          notes: ''
        })
        await fetchInvoices()
        await fetchPaymentBatches()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to process batch payment')
      }
    } catch (error) {
      console.error('Error processing batch payment:', error)
      toast.error('Failed to process batch payment')
    } finally {
      setBatchProcessing(false)
    }
  }
  
  // Toggle invoice selection
  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId)
      } else {
        newSet.add(invoiceId)
      }
      return newSet
    })
  }
  
  // Select all approved invoices
  const selectAllApproved = () => {
    const approvedInvoices = invoices.filter(inv => inv.status === 'APPROVED')
    setSelectedInvoiceIds(new Set(approvedInvoices.map(inv => inv.id)))
  }
  
  // Deselect all
  const deselectAll = () => {
    setSelectedInvoiceIds(new Set())
  }

  const openDetailModal = async (invoice: Invoice) => {
    setShowDetailModal(true)
    await fetchInvoiceDetails(invoice.id)
  }

  const downloadSummary = async (invoiceId: string, format: 'html' | 'text' | 'pdf' = 'pdf') => {
    try {
      if (format === 'pdf') {
        // Download PDF summary
        const response = await fetch(`/api/invoices/${invoiceId}/summary-pdf`)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `Invoice-Summary-${invoiceId}.pdf`
          a.click()
          window.URL.revokeObjectURL(url)
          toast.success('Summary PDF downloaded')
        } else {
          throw new Error('Failed to generate PDF')
        }
      } else if (format === 'html') {
        window.open(`/api/admin/invoices/summary?invoiceId=${invoiceId}&format=html`, '_blank')
      } else {
        const response = await fetch(`/api/admin/invoices/summary?invoiceId=${invoiceId}&format=text`)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `invoice-summary-${invoiceId}.txt`
          a.click()
          window.URL.revokeObjectURL(url)
        }
      }
    } catch (error) {
      console.error('Error downloading summary:', error)
      toast.error('Failed to download summary')
    }
  }

  const getStatusBadgeStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'PAID': return { backgroundColor: 'var(--green-bg)', color: 'var(--green)' }
      case 'APPROVED': return { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }
      case 'PENDING': return { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }
      case 'REJECTED': return { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }
      case 'CANCELLED': return { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }
      default: return { backgroundColor: 'var(--surface2)', color: 'var(--text-primary)' }
    }
  }

  const filteredInvoices = filter === 'all' 
    ? invoices 
    : invoices.filter(invoice => invoice.status.toLowerCase() === filter)

  const totalPending = invoices.filter(inv => inv.status === 'PENDING').reduce((sum, inv) => sum + inv.amount, 0)
  const totalApproved = invoices.filter(inv => inv.status === 'APPROVED').reduce((sum, inv) => sum + inv.amount, 0)
  const totalPaid = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.paidAmount, 0)

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-ds-amber' : 'text-text-muted'}`} />
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div className="p-5" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pending Review</p>
                <p className="text-2xl font-medium" style={{ color: 'var(--amber)' }}>${totalPending.toFixed(2)}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{invoices.filter(i => i.status === 'PENDING').length} invoices</p>
              </div>
              <Clock className="h-8 w-8 text-ds-amber" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Approved</p>
                <p className="text-2xl font-medium" style={{ color: 'var(--blue)' }}>${totalApproved.toFixed(2)}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{invoices.filter(i => i.status === 'APPROVED').length} invoices</p>
              </div>
              <CheckCircle className="h-8 w-8" style={{ color: 'var(--blue)' }} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Paid</p>
                <p className="text-2xl font-medium" style={{ color: 'var(--green)' }}>${totalPaid.toFixed(2)}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{invoices.filter(i => i.status === 'PAID').length} invoices</p>
              </div>
              <DollarSign className="h-8 w-8 text-ds-green" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Invoices</p>
                <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{invoices.length}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All time</p>
              </div>
              <FileText className="h-8 w-8" style={{ color: 'var(--text-secondary)' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>
          <Clock className="h-4 w-4 mr-1" />
          Pending ({invoices.filter(i => i.status === 'PENDING').length})
        </Button>
        <Button variant={filter === 'approved' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('approved')}>
          <CheckCircle className="h-4 w-4 mr-1" />
          Approved ({invoices.filter(i => i.status === 'APPROVED').length})
        </Button>
        <Button variant={filter === 'paid' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('paid')}>
          <DollarSign className="h-4 w-4 mr-1" />
          Paid ({invoices.filter(i => i.status === 'PAID').length})
        </Button>
        <Button variant={filter === 'rejected' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('rejected')}>
          <XCircle className="h-4 w-4 mr-1" />
          Rejected ({invoices.filter(i => i.status === 'REJECTED').length})
        </Button>
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          All ({invoices.length})
        </Button>
      </div>

      {/* Batch Payment Actions for Approved Tab */}
      {filter === 'approved' && invoices.filter(i => i.status === 'APPROVED').length > 0 && (
        <Card className="border-border" style={{ backgroundColor: 'var(--blue-bg)' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Wallet className="h-6 w-6" style={{ color: 'var(--blue)' }} />
                <div>
                  <p className="font-medium" style={{ color: 'var(--blue)' }}>Batch Payment</p>
                  <p className="text-sm" style={{ color: 'var(--blue)' }}>
                    Select invoices below and process payment with a single Proof of Payment
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={selectAllApproved}>
                  Select All
                </Button>
                {selectedInvoiceIds.size > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Deselect All
                    </Button>
                    <Button 
                      className="bg-green-bg hover:bg-green-bg"
                      onClick={() => setShowBatchPaymentDialog(true)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay {selectedInvoiceIds.size} Invoice{selectedInvoiceIds.size > 1 ? 's' : ''} 
                      (${invoices.filter(i => selectedInvoiceIds.has(i.id)).reduce((sum, i) => sum + i.amount, 0).toFixed(2)})
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Paid Tab - Show Payment Batches */}
      {filter === 'paid' && paymentBatches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentBatches.map((batch) => (
                <div key={batch.id} className="border rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer"
                  style={{ backgroundColor: 'var(--surface2)' }}
                    onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--green-bg)' }}>
                        <FileText className="h-5 w-5" style={{ color: 'var(--green)' }} />
                      </div>
                      <div>
                        <p className="font-medium">{batch.batchNumber}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(batch.paymentDate).toLocaleDateString()} • {batch.invoices.length} invoice{batch.invoices.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-medium" style={{ color: 'var(--green)' }}>${batch.totalAmount.toFixed(2)}</p>
                        {batch.popReference && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ref: {batch.popReference}</p>}
                      </div>
                      <MediaHoverPreview 
                        file={{ url: batch.popFileUrl, filename: `POP-${batch.batchNumber}.pdf`, mimeType: 'application/pdf' }}
                        previewSize="lg"
                      >
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); window.open(batch.popFileUrl, '_blank') }}>
                          <FileText className="h-4 w-4 mr-1" />
                          View POP
                        </Button>
                      </MediaHoverPreview>
                    </div>
                  </div>
                  
                  {expandedBatch === batch.id && (
                    <div className="border-t p-4" style={{ backgroundColor: 'var(--surface)' }}>
                      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Invoices in this batch:</p>
                      <div className="space-y-2">
                        {batch.invoices.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }}>
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-medium">{inv.invoiceNumber}</p>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{inv.ticket?.ticketNumber} - {inv.ticket?.title}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-medium">${inv.amount.toFixed(2)}</p>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{inv.contractor?.name}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => openDetailModal(inv as Invoice)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {batch.processedBy && (
                        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                          Processed by: {batch.processedBy.name} ({batch.processedBy.email})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <thead>
              <tr className="border-b border-border" style={{ backgroundColor: 'var(--surface2)' }}>
                {filter === 'approved' && (
                  <th className="text-left p-4 font-medium w-12">
                    <Checkbox 
                      checked={selectedInvoiceIds.size === invoices.filter(i => i.status === 'APPROVED').length && selectedInvoiceIds.size > 0}
                      onCheckedChange={(checked) => checked ? selectAllApproved() : deselectAll()}
                    />
                  </th>
                )}
                <th className="text-left p-4 font-medium">Invoice</th>
                <th className="text-left p-4 font-medium">Contractor</th>
                <th className="text-left p-4 font-medium">Ticket</th>
                <th className="text-left p-4 font-medium">Hours</th>
                <th className="text-left p-4 font-medium">Amount</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Created</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border" style={selectedInvoiceIds.has(invoice.id) ? { backgroundColor: 'var(--blue-bg)' } : {}}>
                  {filter === 'approved' && (
                    <td className="p-4">
                      <Checkbox 
                        checked={selectedInvoiceIds.has(invoice.id)}
                        onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                      />
                    </td>
                  )}
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{invoice.invoiceNumber}</div>
                      {invoice.hourlyRate && <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>${invoice.hourlyRate}/hr</div>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{invoice.contractor.name}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{invoice.contractor.email}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{invoice.ticket.ticketNumber}</div>
                      <div className="text-sm max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>{invoice.ticket.title}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-medium">{invoice.hoursWorked || '-'}h</span>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium">${invoice.amount.toFixed(2)}</div>
                      {invoice.balance < invoice.amount && (
                        <div className="text-sm" style={{ color: 'var(--green)' }}>Balance: ${invoice.balance.toFixed(2)}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge style={getStatusBadgeStyle(invoice.status)}>{invoice.status}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{new Date(invoice.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      onClick={() => openDetailModal(invoice)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          
          {filteredInvoices.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No {filter === 'all' ? '' : filter} invoices found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ds-red">
              <XCircle className="h-5 w-5" />
              Reject Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              You are about to reject invoice <strong>{actionInvoice?.invoiceNumber}</strong>. Please provide a reason.
            </p>
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea id="rejectionReason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why this invoice is being rejected..." rows={4} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason(''); setActionInvoice(null) }}>Cancel</Button>
              <Button variant="destructive" onClick={() => actionInvoice && handleStatusUpdate(actionInvoice.id, 'REJECTED', rejectionReason)} disabled={processing || !rejectionReason.trim()}>
                {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rejecting...</> : 'Reject Invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clarification Dialog */}
      <Dialog open={showClarificationDialog} onOpenChange={setShowClarificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ds-amber">
              <MessageSquare className="h-5 w-5" />
              Request Clarification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Request additional information from the contractor for invoice <strong>{actionInvoice?.invoiceNumber}</strong>.
            </p>
            <div>
              <Label htmlFor="clarificationRequest">Your Question/Request *</Label>
              <Textarea id="clarificationRequest" value={clarificationRequest} onChange={(e) => setClarificationRequest(e.target.value)} placeholder="What information do you need from the contractor?" rows={4} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowClarificationDialog(false); setClarificationRequest(''); setActionInvoice(null) }}>Cancel</Button>
              <Button className="bg-amber-bg hover:bg-amber-bg" onClick={() => actionInvoice && handleClarificationRequest(actionInvoice.id, clarificationRequest)} disabled={processing || !clarificationRequest.trim()}>
                {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Payment Dialog */}
      <Dialog open={showBatchPaymentDialog} onOpenChange={setShowBatchPaymentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ds-green">
              <CreditCard className="h-5 w-5" />
              Process Batch Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="border-border" style={{ backgroundColor: 'var(--green-bg)' }}>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm" style={{ color: 'var(--green)' }}>Total Amount to Pay</p>
                  <p className="text-3xl font-medium" style={{ color: 'var(--green)' }}>
                    ${invoices.filter(i => selectedInvoiceIds.has(i.id)).reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--green)' }}>{selectedInvoiceIds.size} invoice{selectedInvoiceIds.size > 1 ? 's' : ''} selected</p>
                </div>
              </CardContent>
            </Card>
            
            <div className="max-h-40 overflow-y-auto">
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Invoices to be paid:</p>
              <div className="space-y-1">
                {invoices.filter(i => selectedInvoiceIds.has(i.id)).map(inv => (
                  <div key={inv.id} className="flex justify-between text-sm p-2 rounded" style={{ backgroundColor: 'var(--surface2)' }}>
                    <span>{inv.invoiceNumber} - {inv.contractor.name}</span>
                    <span className="font-medium">${inv.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="popFile">Proof of Payment (POP) *</Label>
              <div className="mt-2">
                <FileUpload 
                  onFileSelect={(file) => setBatchPaymentData(prev => ({ ...prev, popFile: file }))} 
                  onFileRemove={() => setBatchPaymentData(prev => ({ ...prev, popFile: null }))} 
                  selectedFile={batchPaymentData.popFile} 
                  accept=".pdf,.jpg,.jpeg,.png" 
                  maxSize={10} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="popReference">Bank Reference (Optional)</Label>
                <Input 
                  id="popReference" 
                  value={batchPaymentData.popReference} 
                  onChange={(e) => setBatchPaymentData(prev => ({ ...prev, popReference: e.target.value }))} 
                  placeholder="e.g., TRF-123456"
                />
              </div>
              <div>
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input 
                  id="paymentDate" 
                  type="date"
                  value={batchPaymentData.paymentDate} 
                  onChange={(e) => setBatchPaymentData(prev => ({ ...prev, paymentDate: e.target.value }))} 
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="batchNotes">Notes (Optional)</Label>
              <Textarea 
                id="batchNotes" 
                value={batchPaymentData.notes} 
                onChange={(e) => setBatchPaymentData(prev => ({ ...prev, notes: e.target.value }))} 
                placeholder="Any additional notes about this payment..."
                rows={2}
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowBatchPaymentDialog(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-green-bg hover:bg-green-bg" 
                onClick={handleBatchPayment}
                disabled={batchProcessing || !batchPaymentData.popFile}
              >
                {batchProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><DollarSign className="h-4 w-4 mr-2" />Confirm Payment</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
                {invoiceDetails && (
                  <Badge style={getStatusBadgeStyle(invoiceDetails.invoice.status)}>
                    {invoiceDetails.invoice.status}
                  </Badge>
                )}
              </span>
              {invoiceDetails && (
                <div className="flex gap-2">
                  {invoiceDetails.invoice.invoiceFileUrl && (
                    <MediaHoverPreview 
                      file={{ url: invoiceDetails.invoice.invoiceFileUrl, filename: `Invoice ${invoiceDetails.invoice.invoiceNumber}.pdf`, mimeType: 'application/pdf' }}
                      previewSize="lg"
                    >
                      <Button size="sm" variant="outline" onClick={() => window.open(invoiceDetails.invoice.invoiceFileUrl, '_blank')}>
                        <FileText className="h-4 w-4 mr-1" />
                        Invoice PDF
                      </Button>
                    </MediaHoverPreview>
                  )}
                  <Button size="sm" variant="default" onClick={() => downloadSummary(invoiceDetails.invoice.id, 'pdf')}>
                    <Download className="h-4 w-4 mr-1" />
                    Summary PDF
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : invoiceDetails ? (
            <ScrollArea className="h-[70vh]">
              <Tabs defaultValue="invoice" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="invoice">Invoice</TabsTrigger>
                  <TabsTrigger value="work">Work Done</TabsTrigger>
                  <TabsTrigger value="ticket">Ticket</TabsTrigger>
                  <TabsTrigger value="contractor">Contractor</TabsTrigger>
                  <TabsTrigger value="rating">Rating</TabsTrigger>
                </TabsList>
                
                <TabsContent value="invoice" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Invoice Number</CardTitle></CardHeader>
                      <CardContent><p className="text-xl font-medium">{invoiceDetails.invoice.invoiceNumber}</p></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status</CardTitle></CardHeader>
                      <CardContent><Badge className="text-lg" style={getStatusBadgeStyle(invoiceDetails.invoice.status)}>{invoiceDetails.invoice.status}</Badge></CardContent>
                    </Card>
                  </div>
                  
                  <Card className="border-border" style={{ backgroundColor: 'var(--blue-bg)' }}>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Amount</p>
                          <p className="text-2xl font-medium" style={{ color: 'var(--blue)' }}>${invoiceDetails.invoice.amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Paid</p>
                          <p className="text-2xl font-medium" style={{ color: 'var(--green)' }}>${invoiceDetails.invoice.paidAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Balance</p>
                          <p className="text-2xl font-medium" style={{ color: 'var(--amber)' }}>${invoiceDetails.invoice.balance.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {invoiceDetails.invoice.hoursWorked && (
                      <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hours Worked</p><p className="font-medium">{invoiceDetails.invoice.hoursWorked} hours</p></CardContent></Card>
                    )}
                    {invoiceDetails.invoice.hourlyRate && (
                      <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hourly Rate</p><p className="font-medium">${invoiceDetails.invoice.hourlyRate}/hr</p></CardContent></Card>
                    )}
                  </div>
                  
                  {invoiceDetails.invoice.workDescription && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Work Description</CardTitle></CardHeader>
                      <CardContent><p className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{invoiceDetails.invoice.workDescription}</p></CardContent>
                    </Card>
                  )}
                  
                  {invoiceDetails.invoice.invoiceFileUrl && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" style={{ color: 'var(--blue)' }} />
                            <span className="font-medium">Invoice Document</span>
                          </div>
                          <MediaHoverPreview 
                            file={{ url: invoiceDetails.invoice.invoiceFileUrl, filename: 'Invoice Document', mimeType: 'application/pdf' }}
                            previewSize="lg"
                          >
                            <Button size="sm" variant="outline" onClick={() => window.open(invoiceDetails.invoice.invoiceFileUrl, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-1" />View File
                            </Button>
                          </MediaHoverPreview>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {(invoiceDetails.invoice.clarificationRequest || invoiceDetails.invoice.rejectionReason) && (
                    <Card className="border-border" style={{ backgroundColor: 'var(--amber-bg)' }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--amber)' }}>
                          <AlertCircle className="h-4 w-4" />
                          {invoiceDetails.invoice.rejectionReason ? 'Rejection Reason' : 'Clarification Request'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p style={{ color: 'var(--amber)' }}>{invoiceDetails.invoice.rejectionReason || invoiceDetails.invoice.clarificationRequest}</p>
                        {invoiceDetails.invoice.clarificationResponse && (
                          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
                            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Contractor Response:</p>
                            <p style={{ color: 'var(--text-primary)' }}>{invoiceDetails.invoice.clarificationResponse}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {invoiceDetails.invoice.status === 'PENDING' && (
                    <Card className="border-border" style={{ backgroundColor: 'var(--blue-bg)' }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium" style={{ color: 'var(--blue)' }}>Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-3">
                          <Button className="flex-1 bg-green-bg hover:bg-green-bg" onClick={() => handleStatusUpdate(invoiceDetails.invoice.id, 'APPROVED')} disabled={processing}>
                            <Check className="h-4 w-4 mr-2" />Approve Invoice
                          </Button>
                          <Button variant="outline" className="flex-1 text-ds-amber border-amber-600 hover:bg-amber-bg" onClick={() => { setActionInvoice({ id: invoiceDetails.invoice.id, invoiceNumber: invoiceDetails.invoice.invoiceNumber } as Invoice); setShowClarificationDialog(true) }}>
                            <MessageSquare className="h-4 w-4 mr-2" />Request Clarification
                          </Button>
                          <Button variant="outline" className="flex-1 text-ds-red border-red-600 hover:bg-red-bg" onClick={() => { setActionInvoice({ id: invoiceDetails.invoice.id, invoiceNumber: invoiceDetails.invoice.invoiceNumber } as Invoice); setShowRejectDialog(true) }}>
                            <X className="h-4 w-4 mr-2" />Reject Invoice
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {invoiceDetails.invoice.status === 'APPROVED' && (
                    <Card className="border-border" style={{ backgroundColor: 'var(--blue-bg)' }}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-6 w-6" style={{ color: 'var(--blue)' }} />
                          <div>
                            <p className="font-medium" style={{ color: 'var(--blue)' }}>Invoice Approved</p>
                            <p className="text-sm" style={{ color: 'var(--blue)' }}>
                              This invoice is approved and awaiting payment. Use the &quot;Approved&quot; tab to process batch payments with a single Proof of Payment.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {invoiceDetails.invoice.status === 'PAID' && (
                    <Card className="border-border" style={{ backgroundColor: 'var(--green-bg)' }}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-6 w-6" style={{ color: 'var(--green)' }} />
                          <div>
                            <p className="font-medium" style={{ color: 'var(--green)' }}>Invoice Paid</p>
                            <p className="text-sm" style={{ color: 'var(--green)' }}>
                              Payment processed on {invoiceDetails.invoice.paidDate ? new Date(invoiceDetails.invoice.paidDate).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="work" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" style={{ color: 'var(--blue)' }} />
                        Work Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {invoiceDetails.invoice.workDescription ? (
                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }}>
                          <p className="whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            {invoiceDetails.invoice.workDescription}
                          </p>
                        </div>
                      ) : (
                        <p className="italic" style={{ color: 'var(--text-muted)' }}>No work description provided by contractor.</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  {invoiceDetails.invoice.description && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Brief Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p style={{ color: 'var(--text-secondary)' }}>{invoiceDetails.invoice.description}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {invoiceDetails.invoice.notes && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Additional Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p style={{ color: 'var(--text-secondary)' }}>{invoiceDetails.invoice.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card className="border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium" style={{ color: 'var(--blue)' }}>Download Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3">
                        {invoiceDetails.invoice.invoiceFileUrl && (
                          <MediaHoverPreview 
                            file={{ url: invoiceDetails.invoice.invoiceFileUrl, filename: 'Invoice PDF', mimeType: 'application/pdf' }}
                            previewSize="lg"
                          >
                            <Button variant="outline" className="flex-1" onClick={() => window.open(invoiceDetails.invoice.invoiceFileUrl, '_blank')}>
                              <FileText className="h-4 w-4 mr-2" />
                              Contractor Invoice
                            </Button>
                          </MediaHoverPreview>
                        )}
                        <Button variant="default" className="flex-1" onClick={() => downloadSummary(invoiceDetails.invoice.id, 'pdf')}>
                          <Download className="h-4 w-4 mr-2" />
                          Summary PDF
                        </Button>
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                        The Summary PDF contains complete job details for accounting records.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="ticket" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ticket Number</p><p className="font-medium text-lg">{invoiceDetails.ticket.ticketNumber}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Status</p><Badge>{invoiceDetails.ticket.status}</Badge></CardContent></Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{invoiceDetails.ticket.title}</CardTitle></CardHeader>
                    <CardContent><p style={{ color: 'var(--text-secondary)' }}>{invoiceDetails.ticket.description}</p></CardContent>
                  </Card>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Type</p><p className="font-medium">{invoiceDetails.ticket.type?.replace(/_/g, ' ') || 'N/A'}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Priority</p><Badge>{invoiceDetails.ticket.priority}</Badge></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Location</p><p className="font-medium flex items-center gap-1"><MapPin className="h-4 w-4" />{invoiceDetails.ticket.location || 'N/A'}</p></CardContent></Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><User className="h-4 w-4" />Reporter</CardTitle></CardHeader>
                    <CardContent>
                      <p className="font-medium">{invoiceDetails.ticket.reporter.name}</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{invoiceDetails.ticket.reporter.email}</p>
                    </CardContent>
                  </Card>
                  
                  {invoiceDetails.ticket.asset && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Asset Information</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Name</p><p className="font-medium">{invoiceDetails.ticket.asset.name}</p></div>
                          <div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Asset Number</p><p className="font-medium">{invoiceDetails.ticket.asset.assetNumber}</p></div>
                          <div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Location</p><p className="font-medium">{invoiceDetails.ticket.asset.location}</p></div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="contractor" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Contractor Information</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Name</p><p className="font-medium text-lg">{invoiceDetails.contractor.name}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Email</p><p className="font-medium">{invoiceDetails.contractor.email}</p></div>
                        {invoiceDetails.contractor.companyName && <div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Company</p><p className="font-medium">{invoiceDetails.contractor.companyName}</p></div>}
                        {invoiceDetails.contractor.phone && <div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Phone</p><p className="font-medium">{invoiceDetails.contractor.phone}</p></div>}
                      </div>
                      
                      {invoiceDetails.contractor.specializations && invoiceDetails.contractor.specializations.length > 0 && (
                        <div>
                          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Specializations</p>
                          <div className="flex flex-wrap gap-2">
                            {invoiceDetails.contractor.specializations.map((spec, index) => (
                              <Badge key={index} variant="outline">{spec}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="rating" className="space-y-4 mt-4">
                  {invoiceDetails.rating ? (
                    <>
                      <Card className="border-border" style={{ backgroundColor: 'var(--amber-bg)' }}>
                        <CardContent className="p-6 text-center">
                          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Overall Rating</p>
                          <div className="flex justify-center mb-2">{renderStars(invoiceDetails.rating.overall)}</div>
                          <p className="text-2xl font-medium" style={{ color: 'var(--amber)' }}>{invoiceDetails.rating.overall}/5</p>
                        </CardContent>
                      </Card>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <Card><CardContent className="p-4 text-center"><p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Punctuality</p>{renderStars(invoiceDetails.rating.punctuality)}</CardContent></Card>
                        <Card><CardContent className="p-4 text-center"><p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Customer Service</p>{renderStars(invoiceDetails.rating.customerService)}</CardContent></Card>
                        <Card><CardContent className="p-4 text-center"><p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Workmanship</p>{renderStars(invoiceDetails.rating.workmanship)}</CardContent></Card>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Card style={{ backgroundColor: invoiceDetails.rating.ppeCompliant ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                          <CardContent className="p-4 flex items-center gap-2">
                            {invoiceDetails.rating.ppeCompliant ? <CheckCircle className="h-5 w-5" style={{ color: 'var(--green)' }} /> : <XCircle className="h-5 w-5" style={{ color: 'var(--red)' }} />}
                            <span className="font-medium">PPE Compliant</span>
                          </CardContent>
                        </Card>
                        <Card style={{ backgroundColor: invoiceDetails.rating.followedSiteProcedures ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                          <CardContent className="p-4 flex items-center gap-2">
                            {invoiceDetails.rating.followedSiteProcedures ? <CheckCircle className="h-5 w-5" style={{ color: 'var(--green)' }} /> : <XCircle className="h-5 w-5" style={{ color: 'var(--red)' }} />}
                            <span className="font-medium">Followed Site Procedures</span>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {invoiceDetails.rating.comment && (
                        <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Comments</CardTitle></CardHeader>
                          <CardContent><p style={{ color: 'var(--text-secondary)' }}>{invoiceDetails.rating.comment}</p></CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                        <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No rating has been submitted for this job yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Failed to load invoice details</div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
