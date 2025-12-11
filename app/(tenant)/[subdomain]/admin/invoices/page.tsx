import { AdminInvoiceManagement } from '@/components/admin/invoice-management'

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
        <p className="mt-2 text-gray-600">Review and process contractor invoices</p>
      </div>
      
      <AdminInvoiceManagement />
    </div>
  )
}