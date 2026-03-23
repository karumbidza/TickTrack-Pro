'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileUpload } from '@/components/ui/file-upload'
import { MediaHoverPreview } from '@/components/ui/media-viewer'
import {
  Download, FileText, DollarSign, Check, X, AlertCircle,
  MessageSquare, Star, Search, SlidersHorizontal,
  CheckCircle, XCircle, Loader2, ExternalLink, CreditCard, Wallet,
  User, Building, MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

// ── Interfaces ─────────────────────────────────────────────────────────────────

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
  contractor: { name: string; email: string }
  ticket: { id: string; title: string; ticketNumber: string }
  paymentBatch?: {
    id: string; batchNumber: string; popFileUrl: string
    popReference?: string; paymentDate: string; totalAmount: number
  }
}

interface InvoiceDetails {
  invoice: {
    id: string; invoiceNumber: string; amount: number; hoursWorked?: number
    hourlyRate?: number; description?: string; workDescription?: string
    status: string; paidAmount: number; balance: number; notes?: string
    invoiceFileUrl?: string; proofOfPaymentUrl?: string; rejectionReason?: string
    clarificationRequest?: string; clarificationResponse?: string
    createdAt: string; paidDate?: string
  }
  contractor: {
    name: string; email: string; companyName?: string
    phone?: string; specializations?: string[]
  }
  ticket: {
    id: string; ticketNumber: string; title: string; description: string
    type?: string; priority: string; status: string; location?: string
    createdAt: string; updatedAt: string; closedAt?: string
    reporter: { name: string; email: string }
    asset?: { name: string; assetNumber: string; location: string }
    attachments?: { originalName: string; url: string; mimeType: string }[]
  }
  rating?: {
    overall: number; punctuality: number; customerService: number
    workmanship: number; ppeCompliant: boolean; followedSiteProcedures: boolean
    comment?: string
  }
  tenant: { name: string; domain?: string }
}

interface InvoiceFilters {
  status: string
  amountMin: string
  amountMax: string
  contractors: string[]
  date: string
  dateFrom: string
  dateTo: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: InvoiceFilters = {
  status: '', amountMin: '', amountMax: '', contractors: [],
  date: '', dateFrom: '', dateTo: '',
}

const STATUS_PILL: Record<string, { backgroundColor: string; color: string }> = {
  PENDING:   { backgroundColor: '#fef3c7', color: '#92400e' },
  APPROVED:  { backgroundColor: '#e8f5ee', color: '#2d6a4f' },
  PAID:      { backgroundColor: '#eff6ff', color: '#1e40af' },
  REJECTED:  { backgroundColor: '#fef2f2', color: '#991b1b' },
  OVERDUE:   { backgroundColor: '#fef2f2', color: '#991b1b' },
  CANCELLED: { backgroundColor: '#f0efe9', color: '#6b6860' },
  DRAFT:     { backgroundColor: '#f0efe9', color: '#6b6860' },
}

const monoLabel = {
  fontFamily: 'DM Mono, monospace',
  fontSize: 9,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AdminInvoiceManagement() {
  // ── Data ─────────────────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [invoiceFilters, setInvoiceFilters] = useState<InvoiceFilters>(EMPTY_FILTERS)
  const [draftFilters, setDraftFilters] = useState<InvoiceFilters>(EMPTY_FILTERS)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // ── Detail modal ─────────────────────────────────────────────────────────────
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [processing, setProcessing] = useState(false)

  // ── Action dialogs ────────────────────────────────────────────────────────────
  const [rejectionReason, setRejectionReason] = useState('')
  const [clarificationRequest, setClarificationRequest] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showClarificationDialog, setShowClarificationDialog] = useState(false)
  const [actionInvoice, setActionInvoice] = useState<Invoice | null>(null)

  // ── Batch payment ─────────────────────────────────────────────────────────────
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set())
  const [showBatchPaymentDialog, setShowBatchPaymentDialog] = useState(false)
  const [batchPaymentData, setBatchPaymentData] = useState({
    popFile: null as File | null,
    popReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [paymentBatches, setPaymentBatches] = useState<{
    id: string; batchNumber: string; popFileUrl: string; popReference?: string
    paymentDate: string; totalAmount: number; notes?: string
    processedBy?: { name: string; email: string }
    invoices: Invoice[]
  }[]>([])
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)

  // ── Init filters from URL ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    const status = p.get('status') || ''
    const contractors = p.getAll('contractor')
    const date = p.get('date') || ''
    const amountMin = p.get('amountMin') || ''
    const amountMax = p.get('amountMax') || ''
    const dateFrom = p.get('dateFrom') || ''
    const dateTo = p.get('dateTo') || ''
    if (status || contractors.length || date || amountMin || amountMax) {
      setInvoiceFilters({ status, contractors, date, amountMin, amountMax, dateFrom, dateTo })
    }
  }, [])

  // ── Sync filters to URL ───────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams()
    if (invoiceFilters.status) p.set('status', invoiceFilters.status)
    invoiceFilters.contractors.forEach(c => p.append('contractor', c))
    if (invoiceFilters.date) p.set('date', invoiceFilters.date)
    if (invoiceFilters.amountMin) p.set('amountMin', invoiceFilters.amountMin)
    if (invoiceFilters.amountMax) p.set('amountMax', invoiceFilters.amountMax)
    if (invoiceFilters.dateFrom) p.set('dateFrom', invoiceFilters.dateFrom)
    if (invoiceFilters.dateTo) p.set('dateTo', invoiceFilters.dateTo)
    const qs = p.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''))
  }, [invoiceFilters])

  // ── ESC closes drawer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!filterDrawerOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterDrawerOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filterDrawerOpen])

  // ── Sync draft when drawer opens ──────────────────────────────────────────────
  useEffect(() => {
    if (filterDrawerOpen) setDraftFilters(invoiceFilters)
  }, [filterDrawerOpen])

  // ── Fetch data ────────────────────────────────────────────────────────────────
  useEffect(() => { fetchInvoices() }, [])

  useEffect(() => {
    if (invoiceFilters.status === 'paid') fetchPaymentBatches()
  }, [invoiceFilters.status])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/admin/invoices')
      if (response.ok) setInvoices(await response.json())
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentBatches = async () => {
    try {
      const response = await fetch('/api/admin/invoices/batch-payment')
      if (response.ok) setPaymentBatches(await response.json())
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
            id: data.id, invoiceNumber: data.invoiceNumber, amount: data.amount,
            hoursWorked: data.hoursWorked, hourlyRate: data.hourlyRate,
            description: data.description, workDescription: data.workDescription,
            status: data.status, paidAmount: data.paidAmount, balance: data.balance,
            notes: data.notes, invoiceFileUrl: data.invoiceFileUrl,
            proofOfPaymentUrl: data.proofOfPaymentUrl, rejectionReason: data.rejectionReason,
            clarificationRequest: data.clarificationRequest,
            clarificationResponse: data.clarificationResponse,
            createdAt: data.createdAt, paidDate: data.paidDate,
          },
          contractor: {
            name: data.contractor?.name || 'N/A', email: data.contractor?.email || 'N/A',
            companyName: data.contractor?.contractorProfile?.companyName,
            phone: data.contractor?.contractorProfile?.phone,
            specializations: data.contractor?.contractorProfile?.specializations,
          },
          ticket: {
            id: data.ticket?.id, ticketNumber: data.ticket?.ticketNumber,
            title: data.ticket?.title, description: data.ticket?.description,
            type: data.ticket?.type, priority: data.ticket?.priority,
            status: data.ticket?.status, location: data.ticket?.location,
            createdAt: data.ticket?.createdAt, updatedAt: data.ticket?.updatedAt,
            closedAt: data.ticket?.closedAt,
            reporter: { name: data.ticket?.user?.name || 'N/A', email: data.ticket?.user?.email || 'N/A' },
            asset: data.ticket?.asset, attachments: data.ticket?.attachments,
          },
          rating: undefined,
          tenant: { name: data.tenant?.name || 'N/A', domain: data.tenant?.domain },
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
      if (status === 'REJECTED' && reason) body.rejectionReason = reason
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        body: JSON.stringify({ clarificationRequest: request }),
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

  const handleBatchPayment = async () => {
    if (selectedInvoiceIds.size === 0 || !batchPaymentData.popFile) {
      toast.error('Please select invoices and upload a Proof of Payment')
      return
    }
    setBatchProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', batchPaymentData.popFile)
      const uploadResponse = await fetch('/api/upload/pop', { method: 'POST', body: formData })
      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json()
        throw new Error(uploadError.message || 'Failed to upload Proof of Payment')
      }
      const { url: popFileUrl } = await uploadResponse.json()
      const response = await fetch('/api/admin/invoices/batch-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedInvoiceIds),
          popFileUrl,
          popReference: batchPaymentData.popReference,
          paymentDate: batchPaymentData.paymentDate,
          notes: batchPaymentData.notes,
        }),
      })
      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        setShowBatchPaymentDialog(false)
        setSelectedInvoiceIds(new Set())
        setBatchPaymentData({ popFile: null, popReference: '', paymentDate: new Date().toISOString().split('T')[0], notes: '' })
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

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds(prev => {
      const next = new Set(prev)
      if (next.has(invoiceId)) next.delete(invoiceId)
      else next.add(invoiceId)
      return next
    })
  }
  const selectAllApproved = () => setSelectedInvoiceIds(new Set(invoices.filter(i => i.status === 'APPROVED').map(i => i.id)))
  const deselectAll = () => setSelectedInvoiceIds(new Set())
  const openDetailModal = async (invoice: Invoice) => { setShowDetailModal(true); await fetchInvoiceDetails(invoice.id) }

  const downloadSummary = async (invoiceId: string, format: 'html' | 'text' | 'pdf' = 'pdf') => {
    try {
      if (format === 'pdf') {
        const response = await fetch(`/api/invoices/${invoiceId}/summary-pdf`)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = `Invoice-Summary-${invoiceId}.pdf`; a.click()
          window.URL.revokeObjectURL(url)
          toast.success('Summary PDF downloaded')
        } else throw new Error('Failed to generate PDF')
      } else if (format === 'html') {
        window.open(`/api/admin/invoices/summary?invoiceId=${invoiceId}&format=html`, '_blank')
      } else {
        const response = await fetch(`/api/admin/invoices/summary?invoiceId=${invoiceId}&format=text`)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = `invoice-summary-${invoiceId}.txt`; a.click()
          window.URL.revokeObjectURL(url)
        }
      }
    } catch (error) {
      console.error('Error downloading summary:', error)
      toast.error('Failed to download summary')
    }
  }

  // ── Computed values ───────────────────────────────────────────────────────────

  const totalPending  = invoices.filter(i => i.status === 'PENDING').reduce((s, i) => s + i.amount, 0)
  const totalApproved = invoices.filter(i => i.status === 'APPROVED').reduce((s, i) => s + i.amount, 0)
  const totalPaid     = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.paidAmount, 0)

  const uniqueContractors = useMemo(() =>
    [...new Set(invoices.map(i => i.contractor.name))].sort(), [invoices])

  const filteredInvoices = useMemo(() => {
    let r = invoices
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      r = r.filter(i =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.contractor.name.toLowerCase().includes(q) ||
        i.ticket.ticketNumber.toLowerCase().includes(q) ||
        i.ticket.title.toLowerCase().includes(q)
      )
    }
    if (invoiceFilters.status) r = r.filter(i => i.status.toLowerCase() === invoiceFilters.status)
    if (invoiceFilters.amountMin) r = r.filter(i => i.amount >= parseFloat(invoiceFilters.amountMin))
    if (invoiceFilters.amountMax) r = r.filter(i => i.amount <= parseFloat(invoiceFilters.amountMax))
    if (invoiceFilters.contractors.length) r = r.filter(i => invoiceFilters.contractors.includes(i.contractor.name))
    if (invoiceFilters.date) {
      const now = new Date()
      r = r.filter(i => {
        const d = new Date(i.createdAt)
        const fd = new Date()
        switch (invoiceFilters.date) {
          case 'today':  fd.setHours(0,0,0,0); return d >= fd
          case 'week':   fd.setDate(now.getDate()-7); return d >= fd
          case 'month':  fd.setMonth(now.getMonth()-1); return d >= fd
          case 'custom':
            if (invoiceFilters.dateFrom && d < new Date(invoiceFilters.dateFrom)) return false
            if (invoiceFilters.dateTo && d > new Date(invoiceFilters.dateTo + 'T23:59:59')) return false
            return true
          default: return true
        }
      })
    }
    return r
  }, [invoices, searchTerm, invoiceFilters])

  const hasActiveFilters = !!(
    invoiceFilters.status || invoiceFilters.amountMin || invoiceFilters.amountMax ||
    invoiceFilters.contractors.length || invoiceFilters.date
  )

  const activeFilterCount = [
    invoiceFilters.status ? 1 : 0,
    (invoiceFilters.amountMin || invoiceFilters.amountMax) ? 1 : 0,
    invoiceFilters.contractors.length,
    invoiceFilters.date ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const activeTags = [
    ...(invoiceFilters.status ? [{ key: 'status', label: invoiceFilters.status.charAt(0).toUpperCase() + invoiceFilters.status.slice(1), remove: () => setInvoiceFilters(f => ({ ...f, status: '' })) }] : []),
    ...(invoiceFilters.amountMin ? [{ key: 'amountMin', label: `Min $${invoiceFilters.amountMin}`, remove: () => setInvoiceFilters(f => ({ ...f, amountMin: '' })) }] : []),
    ...(invoiceFilters.amountMax ? [{ key: 'amountMax', label: `Max $${invoiceFilters.amountMax}`, remove: () => setInvoiceFilters(f => ({ ...f, amountMax: '' })) }] : []),
    ...(invoiceFilters.date ? [{ key: 'date', label: ({ today: 'Today', week: 'This week', month: 'This month', custom: `${invoiceFilters.dateFrom || '?'} – ${invoiceFilters.dateTo || '?'}` } as Record<string,string>)[invoiceFilters.date] || invoiceFilters.date, remove: () => setInvoiceFilters(f => ({ ...f, date: '', dateFrom: '', dateTo: '' })) }] : []),
    ...invoiceFilters.contractors.map(c => ({ key: `c-${c}`, label: c, remove: () => setInvoiceFilters(f => ({ ...f, contractors: f.contractors.filter(x => x !== c) })) })),
  ]

  const getStatusBadgeStyle = (status: string) => STATUS_PILL[status] || { backgroundColor: 'var(--surface2)', color: 'var(--text-primary)' }

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-4 w-4 ${s <= rating ? 'fill-yellow-400 text-ds-amber' : 'text-text-muted'}`} />
      ))}
    </div>
  )

  // ── Shared inline styles ──────────────────────────────────────────────────────
  const actionBtn = (style?: object) => ({
    fontSize: 10, padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
    border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
    color: 'var(--text-secondary)', ...style,
  })

  const searchInput = (
    <div style={{ position: 'relative' }}>
      <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: 'var(--text-muted)' }} />
      <input
        placeholder="Search invoices..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        style={{ paddingLeft: 26, paddingRight: 8, paddingTop: 4, paddingBottom: 4, border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, backgroundColor: 'var(--surface2)', color: 'var(--text-primary)', maxWidth: 200, width: 200, outline: 'none' }}
      />
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
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Filter Drawer ────────────────────────────────────────────────────── */}
      {filterDrawerOpen && (
        <div onClick={() => setFilterDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26,25,22,0.25)', zIndex: 49 }} />
      )}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 260,
        backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 50, display: 'flex', flexDirection: 'column',
        transform: filterDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.22s ease',
      }}>
        {/* Drawer header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Filters</span>
          <button onClick={() => setFilterDrawerOpen(false)} style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 6, backgroundColor: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={12} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

          {/* Status */}
          <div>
            <p style={{ ...monoLabel, marginBottom: 8 }}>Status</p>
            {invoiceFilters.status ? (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 4 }}>Status set by card selection</p>
            ) : (
              ([
                { value: 'pending',  label: 'Pending',  pill: STATUS_PILL.PENDING },
                { value: 'approved', label: 'Approved', pill: STATUS_PILL.APPROVED },
                { value: 'paid',     label: 'Paid',     pill: STATUS_PILL.PAID },
                { value: 'rejected', label: 'Rejected', pill: STATUS_PILL.REJECTED },
              ] as { value: string; label: string; pill: { backgroundColor: string; color: string } }[]).map(({ value, label, pill }) => (
                <div key={value} onClick={() => setDraftFilters(d => ({ ...d, status: d.status === value ? '' : value }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: draftFilters.status === value ? '1.5px solid #1a1916' : '1.5px solid var(--border)', backgroundColor: draftFilters.status === value ? '#1a1916' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {draftFilters.status === value && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#f7f6f3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 99, ...pill, fontWeight: draftFilters.status === value ? 500 : 400 }}>{label}</span>
                </div>
              ))
            )}
            <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0 14px' }} />
          </div>

          {/* Amount Range */}
          <div>
            <p style={{ ...monoLabel, marginBottom: 8 }}>Amount Range (USD)</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" placeholder="Min" value={draftFilters.amountMin} onChange={e => setDraftFilters(d => ({ ...d, amountMin: e.target.value }))}
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 12, backgroundColor: 'var(--surface)', color: 'var(--text-primary)', outline: 'none' }} />
              <input type="number" placeholder="Max" value={draftFilters.amountMax} onChange={e => setDraftFilters(d => ({ ...d, amountMax: e.target.value }))}
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 12, backgroundColor: 'var(--surface)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0 14px' }} />
          </div>

          {/* Contractor */}
          {uniqueContractors.length > 0 && (
            <div>
              <p style={{ ...monoLabel, marginBottom: 8 }}>Contractor</p>
              {uniqueContractors.map(name => (
                <div key={name} onClick={() => setDraftFilters(d => ({ ...d, contractors: d.contractors.includes(name) ? d.contractors.filter(c => c !== name) : [...d.contractors, name] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: draftFilters.contractors.includes(name) ? '1.5px solid #1a1916' : '1.5px solid var(--border)', backgroundColor: draftFilters.contractors.includes(name) ? '#1a1916' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {draftFilters.contractors.includes(name) && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#f7f6f3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 12, color: draftFilters.contractors.includes(name) ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: draftFilters.contractors.includes(name) ? 500 : 400 }}>{name}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0 14px' }} />
            </div>
          )}

          {/* Date Created */}
          <div>
            <p style={{ ...monoLabel, marginBottom: 8 }}>Date Created</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {[
                { value: 'today', label: 'Today' }, { value: 'week', label: 'This week' },
                { value: 'month', label: 'This month' }, { value: 'custom', label: 'Custom' },
              ].map(({ value, label }) => (
                <button key={value} onClick={() => setDraftFilters(d => ({ ...d, date: d.date === value ? '' : value }))}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, cursor: 'pointer', border: `1px solid ${draftFilters.date === value ? '#1a1916' : 'var(--border)'}`, backgroundColor: draftFilters.date === value ? '#1a1916' : 'transparent', color: draftFilters.date === value ? '#f7f6f3' : 'var(--text-secondary)' }}>
                  {label}
                </button>
              ))}
            </div>
            {draftFilters.date === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input type="date" value={draftFilters.dateFrom} onChange={e => setDraftFilters(d => ({ ...d, dateFrom: e.target.value }))}
                  style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 12, backgroundColor: 'var(--surface)', color: 'var(--text-primary)', outline: 'none' }} />
                <input type="date" value={draftFilters.dateTo} onChange={e => setDraftFilters(d => ({ ...d, dateTo: e.target.value }))}
                  style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 12, backgroundColor: 'var(--surface)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            )}
          </div>
        </div>

        {/* Drawer footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setDraftFilters(EMPTY_FILTERS)}
            style={{ flex: 1, padding: '7px 0', fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>
            Clear all
          </button>
          <button onClick={() => { setInvoiceFilters(draftFilters); setFilterDrawerOpen(false) }}
            style={{ flex: 2, padding: '7px 0', fontSize: 12, fontWeight: 500, color: '#f7f6f3', backgroundColor: '#1a1916', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Apply Filters
          </button>
        </div>
      </div>

      {/* ── Topbar ───────────────────────────────────────────────────────────── */}
      <div style={{ height: 52, minHeight: 52, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div>
          <h1 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>Invoices</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Manage contractor invoices</p>
        </div>
        <button onClick={() => setFilterDrawerOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)', backgroundColor: filterDrawerOpen ? 'var(--surface2)' : 'var(--surface)', color: 'var(--text-secondary)' }}>
          <SlidersHorizontal size={13} />
          Filters
          {activeFilterCount > 0 && (
            <span style={{ width: 15, height: 15, borderRadius: 99, backgroundColor: '#1a1916', color: '#f7f6f3', fontSize: 9, fontFamily: 'DM Mono, monospace', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Section label */}
        <p style={{ ...monoLabel, margin: 0, fontSize: 10, letterSpacing: '0.08em' }}>Click a card to filter</p>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {([
            { key: 'pending',  label: 'Pending Review', value: `$${totalPending.toFixed(2)}`,  sub: `${invoices.filter(i => i.status === 'PENDING').length} invoices`,  color: '#92400e' },
            { key: 'approved', label: 'Approved',        value: `$${totalApproved.toFixed(2)}`, sub: `${invoices.filter(i => i.status === 'APPROVED').length} invoices`, color: '#2d6a4f' },
            { key: 'paid',     label: 'Total Paid',      value: `$${totalPaid.toFixed(2)}`,     sub: `${invoices.filter(i => i.status === 'PAID').length} invoices`,     color: '#1e40af' },
            { key: '',         label: 'Total Invoices',  value: String(invoices.length),        sub: 'all time',                                                          color: 'var(--text-primary)' },
          ] as { key: string; label: string; value: string; sub: string; color: string }[]).map(({ key, label, value, sub, color }) => {
            const isActive = key !== '' && invoiceFilters.status === key
            return (
              <div key={label} onClick={() => key && setInvoiceFilters(f => ({ ...f, status: f.status === key ? '' : key }))}
                style={{ backgroundColor: 'var(--surface)', border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 9, padding: '13px 14px', cursor: key ? 'pointer' : 'default', transition: 'border 0.15s ease', userSelect: 'none' }}>
                <p style={{ ...monoLabel, marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1, color }}>{value}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</p>
              </div>
            )
          })}
        </div>

        {/* Batch payment action bar */}
        {invoiceFilters.status === 'approved' && invoices.filter(i => i.status === 'APPROVED').length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Wallet size={15} style={{ color: '#1e40af' }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#1e40af', margin: 0 }}>Batch Payment</p>
                <p style={{ fontSize: 11, color: '#1e40af', margin: 0 }}>Select invoices below to process with a single Proof of Payment</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={selectAllApproved} style={actionBtn()}>Select All</button>
              {selectedInvoiceIds.size > 0 && (
                <>
                  <button onClick={deselectAll} style={actionBtn()}>Deselect All</button>
                  <button onClick={() => setShowBatchPaymentDialog(true)}
                    style={actionBtn({ border: '1px solid #c6e6d4', backgroundColor: '#e8f5ee', color: '#2d6a4f', fontWeight: 500 })}>
                    Pay {selectedInvoiceIds.size} Invoice{selectedInvoiceIds.size > 1 ? 's' : ''} (${invoices.filter(i => selectedInvoiceIds.has(i.id)).reduce((s, i) => s + i.amount, 0).toFixed(2)})
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Payment batches */}
        {invoiceFilters.status === 'paid' && paymentBatches.length > 0 && (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
            <p style={{ ...monoLabel, padding: '10px 14px', margin: 0, borderBottom: '1px solid var(--border)', fontSize: 9, letterSpacing: '0.08em' }}>Payment Batches</p>
            {paymentBatches.map(batch => (
              <div key={batch.id}>
                <div onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{batch.batchNumber}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{new Date(batch.paymentDate).toLocaleDateString()} · {batch.invoices.length} invoice{batch.invoices.length > 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#2d6a4f', margin: 0 }}>${batch.totalAmount.toFixed(2)}</p>
                    <MediaHoverPreview file={{ url: batch.popFileUrl, filename: `POP-${batch.batchNumber}.pdf`, mimeType: 'application/pdf' }} previewSize="lg">
                      <button onClick={e => { e.stopPropagation(); window.open(batch.popFileUrl, '_blank') }} style={actionBtn()}>View POP</button>
                    </MediaHoverPreview>
                  </div>
                </div>
                {expandedBatch === batch.id && (
                  <div style={{ backgroundColor: 'var(--surface2)', padding: '8px 14px' }}>
                    {batch.invoices.map((inv, idx) => (
                      <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < batch.invoices.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div>
                          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{inv.invoiceNumber}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{inv.ticket?.ticketNumber}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-primary)', margin: 0 }}>${inv.amount.toFixed(2)}</p>
                          <button onClick={() => openDetailModal(inv as Invoice)} style={actionBtn()}>View</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Standalone search (no active filters) */}
        {!hasActiveFilters && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{searchInput}</div>
        )}

        {/* Active filter tags bar */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px 9px 0 0', padding: '8px 14px', marginBottom: -1 }}>
            <span style={{ ...monoLabel, marginBottom: 0, fontSize: 9, letterSpacing: '0.06em', marginRight: 2 }}>Filtered:</span>
            {activeTags.map(tag => (
              <span key={tag.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 8px', fontSize: 11, color: 'var(--text-primary)' }}>
                {tag.label}
                <button onClick={tag.remove} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}>
                  <X size={10} />
                </button>
              </span>
            ))}
            <button onClick={() => setInvoiceFilters(EMPTY_FILTERS)}
              style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Clear
            </button>
            <div style={{ marginLeft: 'auto' }}>{searchInput}</div>
          </div>
        )}

        {/* Invoice table */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: hasActiveFilters ? '0 0 9px 9px' : '9px', borderTop: hasActiveFilters ? 'none' : undefined, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {invoiceFilters.status === 'approved' && (
                  <th style={{ padding: '8px 14px', width: 36 }}>
                    <Checkbox
                      checked={selectedInvoiceIds.size === invoices.filter(i => i.status === 'APPROVED').length && selectedInvoiceIds.size > 0}
                      onCheckedChange={checked => checked ? selectAllApproved() : deselectAll()}
                    />
                  </th>
                )}
                {['Invoice', 'Contractor', 'Ticket', 'Amount', 'Status', 'Created', 'Actions'].map(col => (
                  <th key={col} style={{ ...monoLabel, marginBottom: 0, padding: '8px 14px', textAlign: 'left', fontWeight: 400, fontSize: 9, letterSpacing: '0.06em' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice, idx) => (
                <tr key={invoice.id}
                  style={{ borderBottom: idx < filteredInvoices.length - 1 ? '1px solid var(--surface2)' : 'none', backgroundColor: selectedInvoiceIds.has(invoice.id) ? '#eff6ff' : undefined }}
                  onMouseEnter={e => { if (!selectedInvoiceIds.has(invoice.id)) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface2)' }}
                  onMouseLeave={e => { if (!selectedInvoiceIds.has(invoice.id)) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                >
                  {invoiceFilters.status === 'approved' && (
                    <td style={{ padding: '9px 14px' }}>
                      <Checkbox checked={selectedInvoiceIds.has(invoice.id)} onCheckedChange={() => toggleInvoiceSelection(invoice.id)} />
                    </td>
                  )}
                  <td style={{ padding: '9px 14px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-muted)' }}>{invoice.invoiceNumber}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text-primary)' }}>{invoice.contractor.name}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-muted)' }}>{invoice.ticket.ticketNumber}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-primary)' }}>${invoice.amount.toFixed(2)}</td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '2px 7px', borderRadius: 99, ...(STATUS_PILL[invoice.status] || { backgroundColor: 'var(--surface2)', color: 'var(--text-muted)' }) }}>
                      {invoice.status}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-muted)' }}>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '9px 14px' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {invoice.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleStatusUpdate(invoice.id, 'APPROVED')} style={actionBtn({ border: '1px solid #c6e6d4', backgroundColor: '#e8f5ee', color: '#2d6a4f' })}>Approve</button>
                          <button onClick={() => { setActionInvoice(invoice); setShowRejectDialog(true) }} style={actionBtn({ border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#991b1b' })}>Reject</button>
                        </>
                      )}
                      {invoice.status === 'APPROVED' && (
                        <button onClick={() => { setSelectedInvoiceIds(new Set([invoice.id])); setShowBatchPaymentDialog(true) }} style={actionBtn({ border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#1e40af' })}>Pay</button>
                      )}
                      <button onClick={() => openDetailModal(invoice)} style={actionBtn()}>View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 36 }}>
              <div style={{ width: 32, height: 32, backgroundColor: 'var(--surface2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <FileText size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>No invoices found</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Rejection Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5" style={{ color: '#991b1b' }} />
              Reject Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              You are about to reject invoice <strong>{actionInvoice?.invoiceNumber}</strong>. Please provide a reason.
            </p>
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea id="rejectionReason" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this invoice is being rejected..." rows={4} />
            </div>
            <div className="flex justify-end gap-3">
              <button style={actionBtn({ fontSize: 12, padding: '6px 14px' })} onClick={() => { setShowRejectDialog(false); setRejectionReason(''); setActionInvoice(null) }}>Cancel</button>
              <button style={{ ...actionBtn({ fontSize: 12, padding: '6px 14px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#991b1b' }), opacity: (processing || !rejectionReason.trim()) ? 0.5 : 1 }}
                onClick={() => actionInvoice && handleStatusUpdate(actionInvoice.id, 'REJECTED', rejectionReason)} disabled={processing || !rejectionReason.trim()}>
                {processing ? 'Rejecting...' : 'Reject Invoice'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Clarification Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showClarificationDialog} onOpenChange={setShowClarificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Request Clarification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Request additional information for invoice <strong>{actionInvoice?.invoiceNumber}</strong>.
            </p>
            <div>
              <Label htmlFor="clarificationRequest">Your Question/Request *</Label>
              <Textarea id="clarificationRequest" value={clarificationRequest} onChange={e => setClarificationRequest(e.target.value)} placeholder="What information do you need from the contractor?" rows={4} />
            </div>
            <div className="flex justify-end gap-3">
              <button style={actionBtn({ fontSize: 12, padding: '6px 14px' })} onClick={() => { setShowClarificationDialog(false); setClarificationRequest(''); setActionInvoice(null) }}>Cancel</button>
              <button style={{ ...actionBtn({ fontSize: 12, padding: '6px 14px', border: '1px solid #fcd34d', backgroundColor: '#fef3c7', color: '#92400e' }), opacity: (processing || !clarificationRequest.trim()) ? 0.5 : 1 }}
                onClick={() => actionInvoice && handleClarificationRequest(actionInvoice.id, clarificationRequest)} disabled={processing || !clarificationRequest.trim()}>
                {processing ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Batch Payment Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showBatchPaymentDialog} onOpenChange={setShowBatchPaymentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Process Batch Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card style={{ backgroundColor: '#e8f5ee' }}>
              <CardContent className="p-4 text-center">
                <p className="text-sm" style={{ color: '#2d6a4f' }}>Total Amount to Pay</p>
                <p className="text-3xl font-medium" style={{ color: '#2d6a4f' }}>
                  ${invoices.filter(i => selectedInvoiceIds.has(i.id)).reduce((s, i) => s + i.amount, 0).toFixed(2)}
                </p>
                <p className="text-sm mt-1" style={{ color: '#2d6a4f' }}>{selectedInvoiceIds.size} invoice{selectedInvoiceIds.size > 1 ? 's' : ''} selected</p>
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
              <Label>Proof of Payment (POP) *</Label>
              <div className="mt-2">
                <FileUpload onFileSelect={file => setBatchPaymentData(p => ({ ...p, popFile: file }))} onFileRemove={() => setBatchPaymentData(p => ({ ...p, popFile: null }))} selectedFile={batchPaymentData.popFile} accept=".pdf,.jpg,.jpeg,.png" maxSize={10} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="popReference">Bank Reference (Optional)</Label>
                <Input id="popReference" value={batchPaymentData.popReference} onChange={e => setBatchPaymentData(p => ({ ...p, popReference: e.target.value }))} placeholder="e.g., TRF-123456" />
              </div>
              <div>
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input id="paymentDate" type="date" value={batchPaymentData.paymentDate} onChange={e => setBatchPaymentData(p => ({ ...p, paymentDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="batchNotes">Notes (Optional)</Label>
              <Textarea id="batchNotes" value={batchPaymentData.notes} onChange={e => setBatchPaymentData(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes about this payment..." rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button style={actionBtn({ fontSize: 12, padding: '6px 14px' })} onClick={() => setShowBatchPaymentDialog(false)}>Cancel</button>
              <button style={{ ...actionBtn({ fontSize: 12, padding: '6px 14px', border: '1px solid #c6e6d4', backgroundColor: '#e8f5ee', color: '#2d6a4f' }), opacity: (batchProcessing || !batchPaymentData.popFile) ? 0.5 : 1 }}
                onClick={handleBatchPayment} disabled={batchProcessing || !batchPaymentData.popFile}>
                {batchProcessing ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Invoice Detail Modal ─────────────────────────────────────────────── */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
                {invoiceDetails && (
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '2px 7px', borderRadius: 99, ...getStatusBadgeStyle(invoiceDetails.invoice.status) }}>
                    {invoiceDetails.invoice.status}
                  </span>
                )}
              </span>
              {invoiceDetails && (
                <div className="flex gap-2">
                  {invoiceDetails.invoice.invoiceFileUrl && (
                    <MediaHoverPreview file={{ url: invoiceDetails.invoice.invoiceFileUrl, filename: `Invoice ${invoiceDetails.invoice.invoiceNumber}.pdf`, mimeType: 'application/pdf' }} previewSize="lg">
                      <Button size="sm" variant="outline" onClick={() => window.open(invoiceDetails.invoice.invoiceFileUrl, '_blank')}>
                        <FileText className="h-4 w-4 mr-1" />Invoice PDF
                      </Button>
                    </MediaHoverPreview>
                  )}
                  <Button size="sm" onClick={() => downloadSummary(invoiceDetails.invoice.id, 'pdf')}>
                    <Download className="h-4 w-4 mr-1" />Summary PDF
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
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Invoice Number</CardTitle></CardHeader><CardContent><p className="text-xl font-medium">{invoiceDetails.invoice.invoiceNumber}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status</CardTitle></CardHeader><CardContent><Badge style={getStatusBadgeStyle(invoiceDetails.invoice.status)}>{invoiceDetails.invoice.status}</Badge></CardContent></Card>
                  </div>
                  <Card style={{ backgroundColor: '#eff6ff' }}>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Amount</p><p className="text-2xl font-medium" style={{ color: '#1e40af' }}>${invoiceDetails.invoice.amount.toFixed(2)}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Paid</p><p className="text-2xl font-medium" style={{ color: '#2d6a4f' }}>${invoiceDetails.invoice.paidAmount.toFixed(2)}</p></div>
                        <div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Balance</p><p className="text-2xl font-medium" style={{ color: '#92400e' }}>${invoiceDetails.invoice.balance.toFixed(2)}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-2 gap-4">
                    {invoiceDetails.invoice.hoursWorked && <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hours Worked</p><p className="font-medium">{invoiceDetails.invoice.hoursWorked} hours</p></CardContent></Card>}
                    {invoiceDetails.invoice.hourlyRate && <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hourly Rate</p><p className="font-medium">${invoiceDetails.invoice.hourlyRate}/hr</p></CardContent></Card>}
                  </div>
                  {invoiceDetails.invoice.workDescription && (
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Work Description</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{invoiceDetails.invoice.workDescription}</p></CardContent></Card>
                  )}
                  {invoiceDetails.invoice.invoiceFileUrl && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" style={{ color: '#1e40af' }} />
                            <span className="font-medium">Invoice Document</span>
                          </div>
                          <MediaHoverPreview file={{ url: invoiceDetails.invoice.invoiceFileUrl, filename: 'Invoice Document', mimeType: 'application/pdf' }} previewSize="lg">
                            <Button size="sm" variant="outline" onClick={() => window.open(invoiceDetails.invoice.invoiceFileUrl, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-1" />View File
                            </Button>
                          </MediaHoverPreview>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {(invoiceDetails.invoice.clarificationRequest || invoiceDetails.invoice.rejectionReason) && (
                    <Card style={{ backgroundColor: '#fef3c7' }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: '#92400e' }}>
                          <AlertCircle className="h-4 w-4" />
                          {invoiceDetails.invoice.rejectionReason ? 'Rejection Reason' : 'Clarification Request'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p style={{ color: '#92400e' }}>{invoiceDetails.invoice.rejectionReason || invoiceDetails.invoice.clarificationRequest}</p>
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
                    <Card style={{ backgroundColor: '#eff6ff' }}>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: '#1e40af' }}>Actions</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex gap-3">
                          <Button className="flex-1" style={{ backgroundColor: '#e8f5ee', color: '#2d6a4f', border: '1px solid #c6e6d4' }} onClick={() => handleStatusUpdate(invoiceDetails.invoice.id, 'APPROVED')} disabled={processing}>
                            <Check className="h-4 w-4 mr-2" />Approve Invoice
                          </Button>
                          <Button variant="outline" className="flex-1" style={{ color: '#92400e', borderColor: '#fcd34d' }} onClick={() => { setActionInvoice({ id: invoiceDetails.invoice.id, invoiceNumber: invoiceDetails.invoice.invoiceNumber } as Invoice); setShowClarificationDialog(true) }}>
                            <MessageSquare className="h-4 w-4 mr-2" />Request Clarification
                          </Button>
                          <Button variant="outline" className="flex-1" style={{ color: '#991b1b', borderColor: '#fecaca' }} onClick={() => { setActionInvoice({ id: invoiceDetails.invoice.id, invoiceNumber: invoiceDetails.invoice.invoiceNumber } as Invoice); setShowRejectDialog(true) }}>
                            <X className="h-4 w-4 mr-2" />Reject Invoice
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {invoiceDetails.invoice.status === 'APPROVED' && (
                    <Card style={{ backgroundColor: '#eff6ff' }}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <CheckCircle className="h-6 w-6" style={{ color: '#1e40af' }} />
                        <div>
                          <p className="font-medium" style={{ color: '#1e40af' }}>Invoice Approved</p>
                          <p className="text-sm" style={{ color: '#1e40af' }}>This invoice is approved and awaiting payment. Use the &quot;Approved&quot; view to process batch payments.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {invoiceDetails.invoice.status === 'PAID' && (
                    <Card style={{ backgroundColor: '#e8f5ee' }}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <DollarSign className="h-6 w-6" style={{ color: '#2d6a4f' }} />
                        <div>
                          <p className="font-medium" style={{ color: '#2d6a4f' }}>Invoice Paid</p>
                          <p className="text-sm" style={{ color: '#2d6a4f' }}>Payment processed on {invoiceDetails.invoice.paidDate ? new Date(invoiceDetails.invoice.paidDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="work" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" style={{ color: '#1e40af' }} />Work Description</CardTitle></CardHeader>
                    <CardContent>
                      {invoiceDetails.invoice.workDescription ? (
                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }}>
                          <p className="whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>{invoiceDetails.invoice.workDescription}</p>
                        </div>
                      ) : (
                        <p className="italic" style={{ color: 'var(--text-muted)' }}>No work description provided by contractor.</p>
                      )}
                    </CardContent>
                  </Card>
                  {invoiceDetails.invoice.description && (
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Brief Description</CardTitle></CardHeader><CardContent><p style={{ color: 'var(--text-secondary)' }}>{invoiceDetails.invoice.description}</p></CardContent></Card>
                  )}
                  {invoiceDetails.invoice.notes && (
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Additional Notes</CardTitle></CardHeader><CardContent><p style={{ color: 'var(--text-secondary)' }}>{invoiceDetails.invoice.notes}</p></CardContent></Card>
                  )}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: '#1e40af' }}>Download Documents</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex gap-3">
                        {invoiceDetails.invoice.invoiceFileUrl && (
                          <MediaHoverPreview file={{ url: invoiceDetails.invoice.invoiceFileUrl, filename: 'Invoice PDF', mimeType: 'application/pdf' }} previewSize="lg">
                            <Button variant="outline" className="flex-1" onClick={() => window.open(invoiceDetails.invoice.invoiceFileUrl, '_blank')}>
                              <FileText className="h-4 w-4 mr-2" />Contractor Invoice
                            </Button>
                          </MediaHoverPreview>
                        )}
                        <Button className="flex-1" onClick={() => downloadSummary(invoiceDetails.invoice.id, 'pdf')}>
                          <Download className="h-4 w-4 mr-2" />Summary PDF
                        </Button>
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>The Summary PDF contains complete job details for accounting records.</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ticket" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ticket Number</p><p className="font-medium text-lg">{invoiceDetails.ticket.ticketNumber}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Status</p><Badge>{invoiceDetails.ticket.status}</Badge></CardContent></Card>
                  </div>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-base">{invoiceDetails.ticket.title}</CardTitle></CardHeader><CardContent><p style={{ color: 'var(--text-secondary)' }}>{invoiceDetails.ticket.description}</p></CardContent></Card>
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
                            {invoiceDetails.contractor.specializations.map((spec, i) => <Badge key={i} variant="outline">{spec}</Badge>)}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="rating" className="space-y-4 mt-4">
                  {invoiceDetails.rating ? (
                    <>
                      <Card style={{ backgroundColor: '#fef3c7' }}>
                        <CardContent className="p-6 text-center">
                          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Overall Rating</p>
                          <div className="flex justify-center mb-2">{renderStars(invoiceDetails.rating.overall)}</div>
                          <p className="text-2xl font-medium" style={{ color: '#92400e' }}>{invoiceDetails.rating.overall}/5</p>
                        </CardContent>
                      </Card>
                      <div className="grid grid-cols-3 gap-4">
                        <Card><CardContent className="p-4 text-center"><p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Punctuality</p>{renderStars(invoiceDetails.rating.punctuality)}</CardContent></Card>
                        <Card><CardContent className="p-4 text-center"><p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Customer Service</p>{renderStars(invoiceDetails.rating.customerService)}</CardContent></Card>
                        <Card><CardContent className="p-4 text-center"><p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Workmanship</p>{renderStars(invoiceDetails.rating.workmanship)}</CardContent></Card>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Card style={{ backgroundColor: invoiceDetails.rating.ppeCompliant ? '#e8f5ee' : '#fef2f2' }}>
                          <CardContent className="p-4 flex items-center gap-2">
                            {invoiceDetails.rating.ppeCompliant ? <CheckCircle className="h-5 w-5" style={{ color: '#2d6a4f' }} /> : <XCircle className="h-5 w-5" style={{ color: '#991b1b' }} />}
                            <span className="font-medium">PPE Compliant</span>
                          </CardContent>
                        </Card>
                        <Card style={{ backgroundColor: invoiceDetails.rating.followedSiteProcedures ? '#e8f5ee' : '#fef2f2' }}>
                          <CardContent className="p-4 flex items-center gap-2">
                            {invoiceDetails.rating.followedSiteProcedures ? <CheckCircle className="h-5 w-5" style={{ color: '#2d6a4f' }} /> : <XCircle className="h-5 w-5" style={{ color: '#991b1b' }} />}
                            <span className="font-medium">Followed Site Procedures</span>
                          </CardContent>
                        </Card>
                      </div>
                      {invoiceDetails.rating.comment && (
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Comments</CardTitle></CardHeader><CardContent><p style={{ color: 'var(--text-secondary)' }}>{invoiceDetails.rating.comment}</p></CardContent></Card>
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
  )
}
