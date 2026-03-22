'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Loader2, 
  FileText, 
  DollarSign, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Eye,
  Download,
  CreditCard,
  Calendar,
  X,
  Send,
  RefreshCw,
  Upload,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

interface PaymentBatch {
  id: string
  batchNumber: string
  totalAmount: number
  popFileUrl: string
  popReference?: string
  paymentDate: string
  notes?: string
  invoices: Invoice[]
}

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  hoursWorked?: number
  hourlyRate?: number
  description?: string
  workDescription?: string
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REJECTED'
  invoiceFileUrl?: string
  proofOfPaymentUrl?: string
  paidDate?: string
  paidAmount: number
  balance: number
  rejectionReason?: string
  clarificationRequest?: string
  clarificationResponse?: string
  isActive?: boolean
  revisionNumber?: number
  revisionNotes?: string
  createdAt: string
  updatedAt: string
  ticket: {
    id: string
    ticketNumber: string
    title: string
    tenant: {
      name: string
    }
  }
}



interface InvoiceStats {
  totalInvoices: number
  pendingInvoices: number
  approvedInvoices: number
  paidInvoices: number
  totalEarnings: number
  pendingAmount: number
}

export default function InvoiceTrackerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedBatch, setSelectedBatch] = useState<PaymentBatch | null>(null)
  const [showBatchDetails, setShowBatchDetails] = useState(false)
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    pendingInvoices: 0,
    approvedInvoices: 0,
    paidInvoices: 0,
    totalEarnings: 0,
    pendingAmount: 0
  })
  
  // View invoice state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false)
  
  // POP collapsible state
  const [expandedPops, setExpandedPops] = useState<Set<string>>(new Set())
  
  // Clarification response state
  const [showClarificationDialog, setShowClarificationDialog] = useState(false)
  const [clarificationResponse, setClarificationResponse] = useState('')
  const [respondingToClarification, setRespondingToClarification] = useState(false)
  
  // Resubmit invoice state
  const [showResubmitDialog, setShowResubmitDialog] = useState(false)
  const [resubmitData, setResubmitData] = useState({
    invoiceNumber: '',
    amount: '',
    hoursWorked: '',
    workDescription: '',
    revisionNotes: ''
  })
  const [resubmitFile, setResubmitFile] = useState<File | null>(null)
  const [isResubmitting, setIsResubmitting] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    }
  }, [status])

  const fetchData = async () => {
    try {
      const [invoicesRes, batchesRes] = await Promise.all([
        fetch('/api/contractor/invoice-tracker/invoices'),
        fetch('/api/contractor/invoice-tracker/payment-batches')
      ])

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        setInvoices(invoicesData.invoices || [])
        setStats(invoicesData.stats || stats)
      }

      if (batchesRes.ok) {
        const batchesData = await batchesRes.json()
        setPaymentBatches(batchesData.batches || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load invoice tracker data')
    } finally {
      setLoading(false)
    }
  }

  const handleRespondToClarification = async () => {
    if (!selectedInvoice || !clarificationResponse.trim()) {
      toast.error('Please provide a response')
      return
    }

    setRespondingToClarification(true)
    try {
      const response = await fetch(`/api/contractor/invoice-tracker/invoices/${selectedInvoice.id}/clarification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: clarificationResponse })
      })

      if (response.ok) {
        toast.success('Clarification response sent!')
        setShowClarificationDialog(false)
        setClarificationResponse('')
        fetchData()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to send response')
      }
    } catch (error) {
      console.error('Clarification error:', error)
      toast.error('Failed to send clarification response')
    } finally {
      setRespondingToClarification(false)
    }
  }

  // Handle opening resubmit dialog
  const handleOpenResubmit = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setResubmitData({
      invoiceNumber: '',
      amount: invoice.amount.toString(),
      hoursWorked: invoice.hoursWorked?.toString() || '',
      workDescription: invoice.workDescription || '',
      revisionNotes: ''
    })
    setResubmitFile(null)
    setShowInvoiceDetails(false)
    setShowResubmitDialog(true)
  }

  // Handle resubmitting invoice
  const handleResubmitInvoice = async () => {
    if (!selectedInvoice) return
    
    if (!resubmitData.invoiceNumber.trim()) {
      toast.error('Please enter a new invoice number')
      return
    }
    
    if (!resubmitData.revisionNotes.trim() || resubmitData.revisionNotes.trim().length < 10) {
      toast.error('Please explain what changes were made (minimum 10 characters)')
      return
    }
    
    if (!resubmitFile) {
      toast.error('Please upload the revised invoice document')
      return
    }

    setIsResubmitting(true)
    try {
      // Upload file first
      const formData = new FormData()
      formData.append('file', resubmitFile)
      formData.append('ticketId', selectedInvoice.ticket.id)
      
      const uploadRes = await fetch('/api/upload/invoice', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadRes.ok) {
        const uploadError = await uploadRes.json()
        throw new Error(uploadError.message || 'Failed to upload invoice file')
      }
      
      const uploadData = await uploadRes.json()
      const invoiceFileUrl = uploadData.fileUrl || uploadData.url || uploadData.path

      // Create revised invoice
      const response = await fetch('/api/contractor/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedInvoice.ticket.id,
          invoiceNumber: resubmitData.invoiceNumber,
          amount: parseFloat(resubmitData.amount),
          hoursWorked: resubmitData.hoursWorked ? parseFloat(resubmitData.hoursWorked) : null,
          workDescription: resubmitData.workDescription,
          revisionNotes: resubmitData.revisionNotes,
          invoiceFileUrl
        })
      })

      if (response.ok) {
        toast.success('Invoice resubmitted successfully!')
        setShowResubmitDialog(false)
        setResubmitFile(null)
        setResubmitData({
          invoiceNumber: '',
          amount: '',
          hoursWorked: '',
          workDescription: '',
          revisionNotes: ''
        })
        fetchData()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to resubmit invoice')
      }
    } catch (error) {
      console.error('Resubmit error:', error)
      toast.error('Failed to resubmit invoice')
    } finally {
      setIsResubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; style: React.CSSProperties; icon: React.ReactNode }> = {
      DRAFT: { className: '', style: { backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }, icon: <FileText className="h-3 w-3" /> },
      PENDING: { className: '', style: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }, icon: <Clock className="h-3 w-3" /> },
      APPROVED: { className: '', style: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }, icon: <CheckCircle className="h-3 w-3" /> },
      PAID: { className: '', style: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' }, icon: <DollarSign className="h-3 w-3" /> },
      OVERDUE: { className: '', style: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }, icon: <AlertCircle className="h-3 w-3" /> },
      CANCELLED: { className: '', style: { backgroundColor: 'var(--surface2)', color: 'var(--text-muted)' }, icon: <X className="h-3 w-3" /> },
      REJECTED: { className: '', style: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }, icon: <X className="h-3 w-3" /> }
    }
    const variant = variants[status] || variants.PENDING
    return (
      <Badge className="flex items-center gap-1" style={variant.style}>
        {variant.icon}
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Don't render content if not authenticated
  if (status !== 'authenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-medium" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>Invoice Tracker</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Manage your invoices and track payments</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Invoices</p>
                <p className="text-2xl font-medium">{stats.totalInvoices}</p>
              </div>
              <FileText className="h-10 w-10 opacity-40" style={{ color: 'var(--ds-blue)' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pending</p>
                <p className="text-2xl font-medium" style={{ color: 'var(--amber)' }}>{stats.pendingInvoices}</p>
              </div>
              <Clock className="h-10 w-10 opacity-40" style={{ color: 'var(--ds-amber)' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Paid</p>
                <p className="text-2xl font-medium" style={{ color: 'var(--green)' }}>{stats.paidInvoices}</p>
              </div>
              <CheckCircle className="h-10 w-10 opacity-40" style={{ color: 'var(--green)' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Earnings</p>
                <p className="text-2xl font-medium" style={{ color: 'var(--green)' }}>
                  ${stats.totalEarnings.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-10 w-10 opacity-40" style={{ color: 'var(--green)' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">My Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments & POPs</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>My Invoices</CardTitle>
              <CardDescription>Track and manage your submitted invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No invoices yet</h3>
                  <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Submit invoices for your completed jobs to start tracking payments
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div 
                      key={invoice.id}
                      className="border rounded-lg p-4 transition-colors" style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                            {getStatusBadge(invoice.status)}
                            {invoice.clarificationRequest && !invoice.clarificationResponse && (
                              <Badge className="animate-pulse" style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Response Needed
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                            {invoice.ticket.ticketNumber} - {invoice.ticket.title}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {invoice.ticket.tenant.name} • Created {new Date(invoice.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="text-right mr-4">
                          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>${invoice.amount.toLocaleString()}</p>
                          {invoice.status === 'PAID' && invoice.paidDate && (
                            <p className="text-xs" style={{ color: 'var(--green)' }}>
                              Paid {new Date(invoice.paidDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setShowInvoiceDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          
                          {invoice.clarificationRequest && !invoice.clarificationResponse && (
                            <Button 
                              size="sm"
                              style={{ backgroundColor: 'var(--ds-amber)', color: 'var(--bg)' }}
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setShowClarificationDialog(true)
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Respond
                            </Button>
                          )}

                          {invoice.proofOfPaymentUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              asChild
                            >
                              <a href={invoice.proofOfPaymentUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-1" />
                                POP
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History & POPs</CardTitle>
              <CardDescription>View all payments received with Proof of Payment documents and associated tickets</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentBatches.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No payments yet</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Payment batches will appear here once admin processes payments
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {paymentBatches.map((batch) => {
                    const isExpanded = expandedPops.has(batch.id)
                    return (
                    <div 
                      key={batch.id}
                      className="border rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }}
                    >
                      {/* POP Header - Clickable to toggle */}
                      <div 
                        className="p-4 cursor-pointer transition-colors" style={{ backgroundColor: 'var(--green)', color: 'var(--bg)' }}
                        onClick={() => {
                          setExpandedPops(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(batch.id)) {
                              newSet.delete(batch.id)
                            } else {
                              newSet.add(batch.id)
                            }
                            return newSet
                          })
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg p-2" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                              <CreditCard className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-medium text-lg">{batch.batchNumber}</p>
                              <p className="text-sm" style={{ opacity: 0.8 }}>
                                {new Date(batch.paymentDate).toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-3xl font-medium">${batch.totalAmount.toLocaleString()}</p>
                              {batch.popReference && (
                                <p className="text-sm" style={{ opacity: 0.7 }}>Ref: {batch.popReference}</p>
                              )}
                            </div>
                            <div className="rounded-full p-1.5" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* POP Actions Bar */}
                      <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: 'var(--green-bg)' }}>
                        <div 
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => {
                            setExpandedPops(prev => {
                              const newSet = new Set(prev)
                              if (newSet.has(batch.id)) {
                                newSet.delete(batch.id)
                              } else {
                                newSet.add(batch.id)
                              }
                              return newSet
                            })
                          }}
                        >
                          <CheckCircle className="h-4 w-4" style={{ color: 'var(--green)' }} />
                          <span className="font-medium text-sm" style={{ color: 'var(--green)' }}>
                            {batch.invoices.length} Ticket{batch.invoices.length !== 1 ? 's' : ''} Paid
                          </span>
                          <span className="text-xs ml-1" style={{ color: 'var(--green)' }}>
                            {isExpanded ? '(click to collapse)' : '(click to view)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            style={{ backgroundColor: 'var(--surface)' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(batch.popFileUrl, '_blank')
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View POP
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            style={{ backgroundColor: 'var(--surface)' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              const link = document.createElement('a')
                              link.href = batch.popFileUrl
                              link.download = `POP-${batch.batchNumber}.pdf`
                              link.click()
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>

                      {/* Associated Tickets - Collapsible */}
                      {isExpanded && (
                      <div className="p-4">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <FileText className="h-4 w-4" />
                          Tickets Included in this Payment:
                        </h4>
                        <div className="grid gap-2">
                          {batch.invoices.map((invoice) => (
                            <div 
                              key={invoice.id}
                              className="rounded-lg p-3 flex items-center justify-between transition-colors" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="rounded-full p-1.5" style={{ backgroundColor: 'var(--green-bg)' }}>
                                  <CheckCircle className="h-4 w-4" style={{ color: 'var(--green)' }} />
                                </div>
                                <div>
                                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                    <span className="font-mono text-sm px-1.5 py-0.5 rounded mr-2" style={{ backgroundColor: 'var(--surface2)', color: 'var(--text-secondary)' }}>
                                      {invoice.ticket.ticketNumber}
                                    </span>
                                    {invoice.ticket.title}
                                  </p>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    Invoice: {invoice.invoiceNumber} • {invoice.ticket.tenant.name}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium" style={{ color: 'var(--green)' }}>${invoice.amount.toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {batch.notes && (
                          <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: 'var(--surface2)' }}>
                            <p className="text-xs uppercase font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Payment Notes</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{batch.notes}</p>
                          </div>
                        )}
                      </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Batch Details Dialog */}
      <Dialog open={showBatchDetails} onOpenChange={setShowBatchDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Batch {selectedBatch?.batchNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-6">
              {/* Batch Header */}
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--green)' }}>Total Payment</p>
                    <p className="text-3xl font-medium" style={{ color: 'var(--green)' }}>
                      ${selectedBatch.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Payment Date</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {new Date(selectedBatch.paymentDate).toLocaleDateString()}
                    </p>
                    {selectedBatch.popReference && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Ref: {selectedBatch.popReference}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedBatch.notes && (
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--surface2)' }}>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Notes</p>
                  <p style={{ color: 'var(--text-primary)' }}>{selectedBatch.notes}</p>
                </div>
              )}

              {/* Invoices in this batch */}
              <div>
                <h4 className="font-medium mb-3">
                  Invoices in this Payment ({selectedBatch.invoices.length})
                </h4>
                <div className="space-y-3">
                  {selectedBatch.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="border rounded-lg p-3" style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{invoice.invoiceNumber}</span>
                          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {invoice.ticket.ticketNumber} - {invoice.ticket.title}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {invoice.ticket.tenant.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium" style={{ color: 'var(--green)' }}>
                            ${invoice.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Download POP */}
              <div className="flex justify-end">
                <Button asChild>
                  <a href={selectedBatch.popFileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download Proof of Payment
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between rounded-lg p-4" style={{ backgroundColor: 'var(--surface2)' }}>
                <div>
                  <span className="font-mono text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{selectedInvoice.invoiceNumber}</span>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Created {new Date(selectedInvoice.createdAt).toLocaleString()}
                  </p>
                </div>
                {getStatusBadge(selectedInvoice.status)}
              </div>

              {/* Rejection Reason */}
              {selectedInvoice.status === 'REJECTED' && selectedInvoice.rejectionReason && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' }}>
                  <h4 className="font-medium mb-2" style={{ color: 'var(--red)' }}>Rejection Reason</h4>
                  <p className="mb-4" style={{ color: 'var(--red)' }}>{selectedInvoice.rejectionReason}</p>
                  <Button
                    style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                    onClick={() => handleOpenResubmit(selectedInvoice)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Submit Revised Invoice
                  </Button>
                </div>
              )}

              {/* Clarification Request */}
              {selectedInvoice.clarificationRequest && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--amber)' }}>
                  <h4 className="font-medium mb-2" style={{ color: 'var(--amber)' }}>Clarification Requested</h4>
                  <p className="mb-3" style={{ color: 'var(--amber)' }}>{selectedInvoice.clarificationRequest}</p>

                  {selectedInvoice.clarificationResponse ? (
                    <div className="rounded p-3 mt-2" style={{ backgroundColor: 'var(--surface)' }}>
                      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Your Response:</p>
                      <p style={{ color: 'var(--text-primary)' }}>{selectedInvoice.clarificationResponse}</p>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      style={{ backgroundColor: 'var(--amber)', color: 'white' }}
                      onClick={() => {
                        setShowInvoiceDetails(false)
                        setShowClarificationDialog(true)
                      }}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Respond to Clarification
                    </Button>
                  )}
                </div>
              )}

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--surface2)' }}>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Amount</p>
                  <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>${selectedInvoice.amount.toLocaleString()}</p>
                </div>
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--surface2)' }}>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Status</p>
                  <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{selectedInvoice.status}</p>
                </div>
              </div>

              {(selectedInvoice.hoursWorked || selectedInvoice.hourlyRate) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedInvoice.hoursWorked && (
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hours Worked</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedInvoice.hoursWorked} hours</p>
                    </div>
                  )}
                  {selectedInvoice.hourlyRate && (
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hourly Rate</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>${selectedInvoice.hourlyRate}/hour</p>
                    </div>
                  )}
                </div>
              )}

              {/* Work Description */}
              {selectedInvoice.workDescription && (
                <div>
                  <h4 className="font-medium mb-2">Work Description</h4>
                  <p className="rounded-lg p-4" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface2)' }}>
                    {selectedInvoice.workDescription}
                  </p>
                </div>
              )}

              {/* Ticket Info */}
              <div>
                <h4 className="font-medium mb-2">Related Ticket</h4>
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--surface2)' }}>
                  <p className="font-mono" style={{ color: 'var(--text-primary)' }}>{selectedInvoice.ticket.ticketNumber}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>{selectedInvoice.ticket.title}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{selectedInvoice.ticket.tenant.name}</p>
                </div>
              </div>

              {/* Payment Info */}
              {selectedInvoice.status === 'PAID' && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }}>
                  <h4 className="font-medium mb-2" style={{ color: 'var(--green)' }}>Payment Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm" style={{ color: 'var(--green)' }}>Paid Amount</p>
                      <p className="font-medium" style={{ color: 'var(--green)' }}>${selectedInvoice.paidAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: 'var(--green)' }}>Paid Date</p>
                      <p className="font-medium" style={{ color: 'var(--green)' }}>
                        {selectedInvoice.paidDate && new Date(selectedInvoice.paidDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Downloads */}
              <div className="flex gap-4">
                {selectedInvoice.invoiceFileUrl && (
                  <Button variant="outline" asChild>
                    <a href={selectedInvoice.invoiceFileUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      View Invoice Document
                    </a>
                  </Button>
                )}
                {selectedInvoice.proofOfPaymentUrl && (
                  <Button variant="outline" asChild>
                    <a href={selectedInvoice.proofOfPaymentUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download Proof of Payment
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clarification Response Dialog */}
      <Dialog open={showClarificationDialog} onOpenChange={setShowClarificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Clarification</DialogTitle>
            <DialogDescription>
              Admin has requested clarification for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Clarification Request */}
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--amber-bg)' }}>
              <h4 className="font-medium mb-2" style={{ color: 'var(--amber)' }}>Admin's Request:</h4>
              <p style={{ color: 'var(--amber)' }}>{selectedInvoice?.clarificationRequest}</p>
            </div>

            {/* Response */}
            <div>
              <Label>Your Response *</Label>
              <Textarea 
                value={clarificationResponse}
                onChange={(e) => setClarificationResponse(e.target.value)}
                placeholder="Provide additional details or clarification..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClarificationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRespondToClarification}
              disabled={respondingToClarification || !clarificationResponse.trim()}
            >
              {respondingToClarification ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Response
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resubmit Invoice Dialog */}
      <Dialog open={showResubmitDialog} onOpenChange={setShowResubmitDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Revised Invoice</DialogTitle>
            <DialogDescription>
              Submit a corrected invoice to replace the rejected one. Please explain what changes were made.
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              {/* Previous rejection reason */}
              <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--red)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>Previous Rejection:</p>
                <p className="text-sm" style={{ color: 'var(--red)' }}>{selectedInvoice.rejectionReason}</p>
              </div>

              {/* New Invoice Number */}
              <div>
                <Label>New Invoice Number *</Label>
                <Input
                  value={resubmitData.invoiceNumber}
                  onChange={(e) => setResubmitData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="INV-2024-002-REV"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Enter a new/different invoice number</p>
              </div>

              {/* Amount */}
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={resubmitData.amount}
                  onChange={(e) => setResubmitData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="500.00"
                />
              </div>

              {/* Hours Worked */}
              <div>
                <Label>Hours Worked</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={resubmitData.hoursWorked}
                  onChange={(e) => setResubmitData(prev => ({ ...prev, hoursWorked: e.target.value }))}
                  placeholder="8"
                />
              </div>

              {/* Work Description */}
              <div>
                <Label>Work Description</Label>
                <Textarea
                  value={resubmitData.workDescription}
                  onChange={(e) => setResubmitData(prev => ({ ...prev, workDescription: e.target.value }))}
                  placeholder="Describe the work completed..."
                  rows={2}
                />
              </div>

              {/* Revision Notes - Required */}
              <div>
                <Label>What Changes Were Made? *</Label>
                <Textarea
                  value={resubmitData.revisionNotes}
                  onChange={(e) => setResubmitData(prev => ({ ...prev, revisionNotes: e.target.value }))}
                  placeholder="Explain what was corrected in this revised invoice (e.g., 'Corrected calculation error, updated hourly rate from $50 to $45 as per agreement')"
                  rows={3}
                  style={{ borderColor: 'var(--accent)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Minimum 10 characters required</p>
              </div>

              {/* File Upload */}
              <div>
                <Label>Upload Revised Invoice *</Label>
                <div className="mt-1">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setResubmitFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium" style={{ color: 'var(--text-muted)' }}
                  />
                </div>
                {resubmitFile && (
                  <p className="text-sm mt-2 flex items-center" style={{ color: 'var(--green)' }}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {resubmitFile.name}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResubmitDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResubmitInvoice}
              disabled={isResubmitting || !resubmitData.invoiceNumber.trim() || !resubmitData.revisionNotes.trim() || !resubmitFile}
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {isResubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Revised Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
