'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MediaHoverPreview } from '@/components/ui/media-viewer'
import { Eye, Download, FileText, Calendar, DollarSign } from 'lucide-react'
import { FilterDrawer, FilterButton, ActiveFilterTags, EMPTY_FILTERS, countActiveFilters } from '@/components/FilterDrawer'
import type { FilterState } from '@/components/FilterDrawer'

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
  createdAt: string
  paidDate?: string
  invoiceFileUrl?: string
  proofOfPaymentUrl?: string
  ticket: {
    title: string
    ticketNumber: string
  }
}

interface InvoiceListProps {
  onCreateInvoice: () => void
}

export function InvoiceList({ onCreateInvoice }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [dateFilters, setDateFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/contractor/invoices')
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

  const getStatusBadgeVariant = (status: string): React.ComponentProps<typeof Badge>['variant'] => {
    switch (status) {
      case 'PAID': return 'success'
      case 'APPROVED': return 'info'
      case 'PENDING': return 'warning'
      case 'DRAFT': return 'neutral'
      case 'OVERDUE': return 'destructive'
      case 'REJECTED': return 'destructive'
      case 'CANCELLED': return 'neutral'
      default: return 'neutral'
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    if (filter !== 'all' && invoice.status.toLowerCase() !== filter) return false
    if (dateFilters.date) {
      const created = new Date(invoice.createdAt)
      const now = new Date()
      const fd = new Date()
      switch (dateFilters.date) {
        case 'today': fd.setHours(0, 0, 0, 0); if (created < fd) return false; break
        case 'week': fd.setDate(now.getDate() - 7); if (created < fd) return false; break
        case 'month': fd.setMonth(now.getMonth() - 1); if (created < fd) return false; break
        case 'custom':
          if (dateFilters.dateFrom && created < new Date(dateFilters.dateFrom)) return false
          if (dateFilters.dateTo && created > new Date(dateFilters.dateTo + 'T23:59:59')) return false
          break
      }
    }
    return true
  })

  const removeFilter = (field: keyof FilterState, value: string) => {
    if (field === 'date') setDateFilters(f => ({ ...f, date: '', dateFrom: '', dateTo: '' }))
  }

  const totalEarnings = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.amount, 0)

  const pendingEarnings = invoices
    .filter(inv => ['PENDING', 'APPROVED'].includes(inv.status))
    .reduce((sum, inv) => sum + inv.amount, 0)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={setDateFilters}
        filters={dateFilters}
        sections={['date']}
      />

      {/* Active Filter Tags */}
      <ActiveFilterTags
        filters={dateFilters}
        onRemove={removeFilter}
        onClearAll={() => setDateFilters(EMPTY_FILTERS)}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border p-4" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Earnings</p>
              <p className="text-2xl font-medium" style={{ color: 'var(--green)' }}>${totalEarnings.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8" style={{ color: 'var(--green)' }} />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pending Earnings</p>
              <p className="text-2xl font-medium" style={{ color: 'var(--amber)' }}>${pendingEarnings.toFixed(2)}</p>
            </div>
            <Calendar className="h-8 w-8" style={{ color: 'var(--amber)' }} />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Invoices</p>
              <p className="text-2xl font-medium" style={{ color: 'var(--accent)' }}>{invoices.length}</p>
            </div>
            <FileText className="h-8 w-8" style={{ color: 'var(--accent)' }} />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={filter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('paid')}
          >
            Paid
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <FilterButton
            isOpen={filterDrawerOpen}
            activeCount={countActiveFilters(dateFilters)}
            onClick={() => setFilterDrawerOpen(o => !o)}
          />
          <Button onClick={onCreateInvoice}>
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="rounded-lg border border-border overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
        <Table>
          <thead>
            <tr className="border-b border-border" style={{ backgroundColor: 'var(--surface2)' }}>
              <th className="text-left p-4 font-medium">Invoice</th>
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
              <tr key={invoice.id} className="border-b border-border hover:bg-[var(--surface2)]">
                <td className="p-4">
                  <div>
                    <div className="font-medium">{invoice.invoiceNumber}</div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      ${invoice.hourlyRate}/hr
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <div className="font-medium">{invoice.ticket.ticketNumber}</div>
                    <div className="text-sm max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {invoice.ticket.title}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="font-medium">{invoice.hoursWorked}h</span>
                </td>
                <td className="p-4">
                  <div>
                    <div className="font-medium">${invoice.amount.toFixed(2)}</div>
                    {invoice.status === 'PAID' && invoice.paidAmount > 0 && (
                      <div className="text-sm" style={{ color: 'var(--green)' }}>
                        Paid: ${invoice.paidAmount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant={getStatusBadgeVariant(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </div>
                  {invoice.paidDate && (
                    <div className="text-xs" style={{ color: 'var(--green)' }}>
                      Paid: {new Date(invoice.paidDate).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {invoice.invoiceFileUrl && (
                      <MediaHoverPreview 
                        file={{ url: invoice.invoiceFileUrl, filename: `Invoice ${invoice.invoiceNumber}`, mimeType: 'application/pdf' }}
                        previewSize="lg"
                      >
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(invoice.invoiceFileUrl, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </MediaHoverPreview>
                    )}
                    {invoice.proofOfPaymentUrl && (
                      <MediaHoverPreview 
                        file={{ url: invoice.proofOfPaymentUrl, filename: 'Proof of Payment', mimeType: 'image/jpeg' }}
                        previewSize="lg"
                      >
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(invoice.proofOfPaymentUrl, '_blank')}
                          style={{ color: 'var(--green)' }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </MediaHoverPreview>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        
        {filteredInvoices.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            {filter === 'all' 
              ? 'No invoices yet. Create your first invoice to get started.'
              : `No ${filter} invoices found.`
            }
          </div>
        )}
      </div>
    </div>
  )
}