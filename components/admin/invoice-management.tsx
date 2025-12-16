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
  CheckCircle, XCircle, Loader2, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

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
  contractor: {
    name: string
    email: string
  }
  ticket: {
    id: string
    title: string
    ticketNumber: string
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

  useEffect(() => {
    fetchInvoices()
  }, [])

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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800'
      case 'APPROVED': return 'bg-blue-100 text-blue-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'CANCELLED': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
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
        <Star key={star} className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-5">
      <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">${totalPending.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{invoices.filter(i => i.status === 'PENDING').length} invoices</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-blue-600">${totalApproved.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{invoices.filter(i => i.status === 'APPROVED').length} invoices</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{invoices.filter(i => i.status === 'PAID').length} invoices</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-800">{invoices.length}</p>
                <p className="text-xs text-gray-500">All time</p>
              </div>
              <FileText className="h-8 w-8 text-gray-600" />
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

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <thead>
              <tr className="border-b bg-gray-50">
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
                <tr key={invoice.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{invoice.invoiceNumber}</div>
                      {invoice.hourlyRate && <div className="text-sm text-gray-600">${invoice.hourlyRate}/hr</div>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{invoice.contractor.name}</div>
                      <div className="text-sm text-gray-600">{invoice.contractor.email}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{invoice.ticket.ticketNumber}</div>
                      <div className="text-sm text-gray-600 max-w-xs truncate">{invoice.ticket.title}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-medium">{invoice.hoursWorked || '-'}h</span>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium">${invoice.amount.toFixed(2)}</div>
                      {invoice.balance < invoice.amount && (
                        <div className="text-sm text-green-600">Balance: ${invoice.balance.toFixed(2)}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={getStatusBadgeColor(invoice.status)}>{invoice.status}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{new Date(invoice.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="p-4">
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
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
            <div className="text-center py-12 text-gray-500">
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
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
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
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <MessageSquare className="h-5 w-5" />
              Request Clarification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Request additional information from the contractor for invoice <strong>{actionInvoice?.invoiceNumber}</strong>.
            </p>
            <div>
              <Label htmlFor="clarificationRequest">Your Question/Request *</Label>
              <Textarea id="clarificationRequest" value={clarificationRequest} onChange={(e) => setClarificationRequest(e.target.value)} placeholder="What information do you need from the contractor?" rows={4} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowClarificationDialog(false); setClarificationRequest(''); setActionInvoice(null) }}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => actionInvoice && handleClarificationRequest(actionInvoice.id, clarificationRequest)} disabled={processing || !clarificationRequest.trim()}>
                {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Request'}
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
                  <Badge className={getStatusBadgeColor(invoiceDetails.invoice.status)}>
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
                  <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={() => downloadSummary(invoiceDetails.invoice.id, 'pdf')}>
                    <Download className="h-4 w-4 mr-1" />
                    Summary PDF
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Invoice Number</CardTitle></CardHeader>
                      <CardContent><p className="text-xl font-bold">{invoiceDetails.invoice.invoiceNumber}</p></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle></CardHeader>
                      <CardContent><Badge className={`text-lg ${getStatusBadgeColor(invoiceDetails.invoice.status)}`}>{invoiceDetails.invoice.status}</Badge></CardContent>
                    </Card>
                  </div>
                  
                  <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-gray-600">Amount</p>
                          <p className="text-2xl font-bold text-blue-600">${invoiceDetails.invoice.amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Paid</p>
                          <p className="text-2xl font-bold text-green-600">${invoiceDetails.invoice.paidAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Balance</p>
                          <p className="text-2xl font-bold text-amber-600">${invoiceDetails.invoice.balance.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {invoiceDetails.invoice.hoursWorked && (
                      <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Hours Worked</p><p className="font-semibold">{invoiceDetails.invoice.hoursWorked} hours</p></CardContent></Card>
                    )}
                    {invoiceDetails.invoice.hourlyRate && (
                      <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Hourly Rate</p><p className="font-semibold">${invoiceDetails.invoice.hourlyRate}/hr</p></CardContent></Card>
                    )}
                  </div>
                  
                  {invoiceDetails.invoice.workDescription && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Work Description</CardTitle></CardHeader>
                      <CardContent><p className="text-gray-800 whitespace-pre-wrap">{invoiceDetails.invoice.workDescription}</p></CardContent>
                    </Card>
                  )}
                  
                  {invoiceDetails.invoice.invoiceFileUrl && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
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
                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {invoiceDetails.invoice.rejectionReason ? 'Rejection Reason' : 'Clarification Request'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-amber-900">{invoiceDetails.invoice.rejectionReason || invoiceDetails.invoice.clarificationRequest}</p>
                        {invoiceDetails.invoice.clarificationResponse && (
                          <div className="mt-4 p-3 bg-white rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Contractor Response:</p>
                            <p className="text-gray-800">{invoiceDetails.invoice.clarificationResponse}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {invoiceDetails.invoice.status === 'PENDING' && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-3">
                          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(invoiceDetails.invoice.id, 'APPROVED')} disabled={processing}>
                            <Check className="h-4 w-4 mr-2" />Approve Invoice
                          </Button>
                          <Button variant="outline" className="flex-1 text-amber-600 border-amber-600 hover:bg-amber-50" onClick={() => { setActionInvoice({ id: invoiceDetails.invoice.id, invoiceNumber: invoiceDetails.invoice.invoiceNumber } as Invoice); setShowClarificationDialog(true) }}>
                            <MessageSquare className="h-4 w-4 mr-2" />Request Clarification
                          </Button>
                          <Button variant="outline" className="flex-1 text-red-600 border-red-600 hover:bg-red-50" onClick={() => { setActionInvoice({ id: invoiceDetails.invoice.id, invoiceNumber: invoiceDetails.invoice.invoiceNumber } as Invoice); setShowRejectDialog(true) }}>
                            <X className="h-4 w-4 mr-2" />Reject Invoice
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {invoiceDetails.invoice.status === 'APPROVED' && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-800">Process Payment</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="modalPaymentAmount">Payment Amount</Label>
                            <Input 
                              id="modalPaymentAmount" 
                              type="number" 
                              step="0.01" 
                              value={paymentData.amount} 
                              onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))} 
                              max={invoiceDetails.invoice.balance}
                              placeholder={`Max: $${invoiceDetails.invoice.balance.toFixed(2)}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor="modalPaymentNotes">Reference/Notes</Label>
                            <Input 
                              id="modalPaymentNotes" 
                              value={paymentData.notes} 
                              onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))} 
                              placeholder="Payment reference..."
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Proof of Payment</Label>
                          <div className="mt-2">
                            <FileUpload 
                              onFileSelect={(file) => setPaymentData(prev => ({ ...prev, proofFile: file }))} 
                              onFileRemove={() => setPaymentData(prev => ({ ...prev, proofFile: null }))} 
                              selectedFile={paymentData.proofFile} 
                              accept=".pdf,.jpg,.jpeg,.png" 
                              maxSize={10} 
                            />
                          </div>
                        </div>
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700" 
                          onClick={() => { setSelectedInvoice({ id: invoiceDetails.invoice.id } as Invoice); handlePayment() }}
                          disabled={processing || !paymentData.amount}
                        >
                          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><DollarSign className="h-4 w-4 mr-2" />Mark as Paid</>}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="work" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Work Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {invoiceDetails.invoice.workDescription ? (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {invoiceDetails.invoice.workDescription}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No work description provided by contractor.</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  {invoiceDetails.invoice.description && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Brief Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700">{invoiceDetails.invoice.description}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {invoiceDetails.invoice.notes && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Additional Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700">{invoiceDetails.invoice.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-blue-800">Download Documents</CardTitle>
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
                        <Button variant="default" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => downloadSummary(invoiceDetails.invoice.id, 'pdf')}>
                          <Download className="h-4 w-4 mr-2" />
                          Summary PDF
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        The Summary PDF contains complete job details for accounting records.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="ticket" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Ticket Number</p><p className="font-semibold text-lg">{invoiceDetails.ticket.ticketNumber}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Status</p><Badge>{invoiceDetails.ticket.status}</Badge></CardContent></Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{invoiceDetails.ticket.title}</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-700">{invoiceDetails.ticket.description}</p></CardContent>
                  </Card>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Type</p><p className="font-medium">{invoiceDetails.ticket.type?.replace(/_/g, ' ') || 'N/A'}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Priority</p><Badge>{invoiceDetails.ticket.priority}</Badge></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Location</p><p className="font-medium flex items-center gap-1"><MapPin className="h-4 w-4" />{invoiceDetails.ticket.location || 'N/A'}</p></CardContent></Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2"><User className="h-4 w-4" />Reporter</CardTitle></CardHeader>
                    <CardContent>
                      <p className="font-semibold">{invoiceDetails.ticket.reporter.name}</p>
                      <p className="text-sm text-gray-600">{invoiceDetails.ticket.reporter.email}</p>
                    </CardContent>
                  </Card>
                  
                  {invoiceDetails.ticket.asset && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Asset Information</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div><p className="text-sm text-gray-600">Name</p><p className="font-medium">{invoiceDetails.ticket.asset.name}</p></div>
                          <div><p className="text-sm text-gray-600">Asset Number</p><p className="font-medium">{invoiceDetails.ticket.asset.assetNumber}</p></div>
                          <div><p className="text-sm text-gray-600">Location</p><p className="font-medium">{invoiceDetails.ticket.asset.location}</p></div>
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
                        <div><p className="text-sm text-gray-600">Name</p><p className="font-semibold text-lg">{invoiceDetails.contractor.name}</p></div>
                        <div><p className="text-sm text-gray-600">Email</p><p className="font-medium">{invoiceDetails.contractor.email}</p></div>
                        {invoiceDetails.contractor.companyName && <div><p className="text-sm text-gray-600">Company</p><p className="font-medium">{invoiceDetails.contractor.companyName}</p></div>}
                        {invoiceDetails.contractor.phone && <div><p className="text-sm text-gray-600">Phone</p><p className="font-medium">{invoiceDetails.contractor.phone}</p></div>}
                      </div>
                      
                      {invoiceDetails.contractor.specializations && invoiceDetails.contractor.specializations.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Specializations</p>
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
                      <Card className="bg-gradient-to-r from-yellow-50 to-amber-50">
                        <CardContent className="p-6 text-center">
                          <p className="text-sm text-gray-600 mb-2">Overall Rating</p>
                          <div className="flex justify-center mb-2">{renderStars(invoiceDetails.rating.overall)}</div>
                          <p className="text-2xl font-bold text-amber-600">{invoiceDetails.rating.overall}/5</p>
                        </CardContent>
                      </Card>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-600 mb-2">Punctuality</p>{renderStars(invoiceDetails.rating.punctuality)}</CardContent></Card>
                        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-600 mb-2">Customer Service</p>{renderStars(invoiceDetails.rating.customerService)}</CardContent></Card>
                        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-600 mb-2">Workmanship</p>{renderStars(invoiceDetails.rating.workmanship)}</CardContent></Card>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Card className={invoiceDetails.rating.ppeCompliant ? 'bg-green-50' : 'bg-red-50'}>
                          <CardContent className="p-4 flex items-center gap-2">
                            {invoiceDetails.rating.ppeCompliant ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                            <span className="font-medium">PPE Compliant</span>
                          </CardContent>
                        </Card>
                        <Card className={invoiceDetails.rating.followedSiteProcedures ? 'bg-green-50' : 'bg-red-50'}>
                          <CardContent className="p-4 flex items-center gap-2">
                            {invoiceDetails.rating.followedSiteProcedures ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                            <span className="font-medium">Followed Site Procedures</span>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {invoiceDetails.rating.comment && (
                        <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Comments</CardTitle></CardHeader>
                          <CardContent><p className="text-gray-700">{invoiceDetails.rating.comment}</p></CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No rating has been submitted for this job yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-gray-500">Failed to load invoice details</div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
