'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

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
  createdAt: string
  updatedAt: string
  ticket: {
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
  const { data: session } = useSession()
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
  
  // Clarification response state
  const [showClarificationDialog, setShowClarificationDialog] = useState(false)
  const [clarificationResponse, setClarificationResponse] = useState('')
  const [respondingToClarification, setRespondingToClarification] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      DRAFT: { className: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3 w-3" /> },
      PENDING: { className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      APPROVED: { className: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3" /> },
      PAID: { className: 'bg-green-100 text-green-800', icon: <DollarSign className="h-3 w-3" /> },
      OVERDUE: { className: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-3 w-3" /> },
      CANCELLED: { className: 'bg-gray-100 text-gray-500', icon: <X className="h-3 w-3" /> },
      REJECTED: { className: 'bg-red-100 text-red-800', icon: <X className="h-3 w-3" /> }
    }
    const variant = variants[status] || variants.PENDING
    return (
      <Badge className={`${variant.className} flex items-center gap-1`}>
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

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Tracker</h1>
          <p className="text-gray-600 mt-1">Manage your invoices and track payments</p>
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
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.totalInvoices}</p>
              </div>
              <FileText className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingInvoices}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">{stats.paidInvoices}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalEarnings.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">My Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
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
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                  <p className="text-gray-600 mb-4">
                    Submit invoices for your completed jobs to start tracking payments
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div 
                      key={invoice.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                            {getStatusBadge(invoice.status)}
                            {invoice.clarificationRequest && !invoice.clarificationResponse && (
                              <Badge className="bg-orange-100 text-orange-800 animate-pulse">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Response Needed
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-1">
                            {invoice.ticket.ticketNumber} - {invoice.ticket.title}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {invoice.ticket.tenant.name} • Created {new Date(invoice.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="text-right mr-4">
                          <p className="text-lg font-bold">${invoice.amount.toLocaleString()}</p>
                          {invoice.status === 'PAID' && invoice.paidDate && (
                            <p className="text-xs text-green-600">
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
                              className="bg-orange-600 hover:bg-orange-700"
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
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Track all payments received from admin</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentBatches.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payments yet</h3>
                  <p className="text-gray-600">
                    Payment batches will appear here once admin processes payments
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentBatches.map((batch) => (
                    <div 
                      key={batch.id}
                      className="border rounded-lg p-4 bg-green-50 border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={() => {
                        setSelectedBatch(batch)
                        setShowBatchDetails(true)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-mono font-bold text-lg">{batch.batchNumber}</span>
                            <Badge className="bg-green-100 text-green-800">
                              {batch.invoices.length} Invoice{batch.invoices.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(batch.paymentDate).toLocaleDateString()}
                            </span>
                            {batch.popReference && (
                              <span>Ref: {batch.popReference}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right mr-4">
                          <p className="text-2xl font-bold text-green-700">
                            ${batch.totalAmount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">Click to view details</p>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(batch.popFileUrl, '_blank')
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          POP
                        </Button>
                      </div>
                    </div>
                  ))}
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">Total Payment</p>
                    <p className="text-3xl font-bold text-green-800">
                      ${selectedBatch.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Payment Date</p>
                    <p className="font-medium">
                      {new Date(selectedBatch.paymentDate).toLocaleDateString()}
                    </p>
                    {selectedBatch.popReference && (
                      <p className="text-xs text-gray-500 mt-1">
                        Ref: {selectedBatch.popReference}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedBatch.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <p className="text-gray-800">{selectedBatch.notes}</p>
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
                      className="border rounded-lg p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {invoice.ticket.ticketNumber} - {invoice.ticket.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {invoice.ticket.tenant.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-700">
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
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div>
                  <span className="font-mono text-lg font-bold">{selectedInvoice.invoiceNumber}</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Created {new Date(selectedInvoice.createdAt).toLocaleString()}
                  </p>
                </div>
                {getStatusBadge(selectedInvoice.status)}
              </div>

              {/* Rejection Reason */}
              {selectedInvoice.status === 'REJECTED' && selectedInvoice.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Rejection Reason</h4>
                  <p className="text-red-700">{selectedInvoice.rejectionReason}</p>
                </div>
              )}

              {/* Clarification Request */}
              {selectedInvoice.clarificationRequest && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-2">Clarification Requested</h4>
                  <p className="text-orange-700 mb-3">{selectedInvoice.clarificationRequest}</p>
                  
                  {selectedInvoice.clarificationResponse ? (
                    <div className="bg-white rounded p-3 mt-2">
                      <p className="text-sm text-gray-600 mb-1">Your Response:</p>
                      <p className="text-gray-800">{selectedInvoice.clarificationResponse}</p>
                    </div>
                  ) : (
                    <Button 
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Amount</p>
                  <p className="text-2xl font-bold">${selectedInvoice.amount.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="text-2xl font-bold">{selectedInvoice.status}</p>
                </div>
              </div>

              {(selectedInvoice.hoursWorked || selectedInvoice.hourlyRate) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedInvoice.hoursWorked && (
                    <div>
                      <p className="text-sm text-gray-600">Hours Worked</p>
                      <p className="font-medium">{selectedInvoice.hoursWorked} hours</p>
                    </div>
                  )}
                  {selectedInvoice.hourlyRate && (
                    <div>
                      <p className="text-sm text-gray-600">Hourly Rate</p>
                      <p className="font-medium">${selectedInvoice.hourlyRate}/hour</p>
                    </div>
                  )}
                </div>
              )}

              {/* Work Description */}
              {selectedInvoice.workDescription && (
                <div>
                  <h4 className="font-medium mb-2">Work Description</h4>
                  <p className="text-gray-600 bg-gray-50 rounded-lg p-4">
                    {selectedInvoice.workDescription}
                  </p>
                </div>
              )}

              {/* Ticket Info */}
              <div>
                <h4 className="font-medium mb-2">Related Ticket</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-mono">{selectedInvoice.ticket.ticketNumber}</p>
                  <p className="text-gray-600">{selectedInvoice.ticket.title}</p>
                  <p className="text-sm text-gray-500">{selectedInvoice.ticket.tenant.name}</p>
                </div>
              </div>

              {/* Payment Info */}
              {selectedInvoice.status === 'PAID' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Payment Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700">Paid Amount</p>
                      <p className="font-bold text-green-800">${selectedInvoice.paidAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700">Paid Date</p>
                      <p className="font-medium text-green-800">
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
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2">Admin's Request:</h4>
              <p className="text-orange-700">{selectedInvoice?.clarificationRequest}</p>
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
    </div>
  )
}
