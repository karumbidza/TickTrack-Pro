'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Eye, Download, FileText, Calendar, DollarSign } from 'lucide-react'

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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredInvoices = filter === 'all' 
    ? invoices 
    : invoices.filter(invoice => invoice.status.toLowerCase() === filter)

  const totalEarnings = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.amount, 0)

  const pendingEarnings = invoices
    .filter(inv => ['PENDING', 'APPROVED'].includes(inv.status))
    .reduce((sum, inv) => sum + inv.amount, 0)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-green-600">${totalEarnings.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Earnings</p>
              <p className="text-2xl font-bold text-yellow-600">${pendingEarnings.toFixed(2)}</p>
            </div>
            <Calendar className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-blue-600">{invoices.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
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
        
        <Button onClick={onCreateInvoice}>
          Create Invoice
        </Button>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <thead>
            <tr className="border-b bg-gray-50">
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
              <tr key={invoice.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <div>
                    <div className="font-medium">{invoice.invoiceNumber}</div>
                    <div className="text-sm text-gray-600">
                      ${invoice.hourlyRate}/hr
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <div className="font-medium">{invoice.ticket.ticketNumber}</div>
                    <div className="text-sm text-gray-600 max-w-xs truncate">
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
                      <div className="text-sm text-green-600">
                        Paid: ${invoice.paidAmount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <Badge className={getStatusBadgeColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </div>
                  {invoice.paidDate && (
                    <div className="text-xs text-green-600">
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
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(invoice.invoiceFileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {invoice.proofOfPaymentUrl && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(invoice.proofOfPaymentUrl, '_blank')}
                        className="text-green-600"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        
        {filteredInvoices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
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