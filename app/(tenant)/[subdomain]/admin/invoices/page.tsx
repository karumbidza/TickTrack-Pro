import { AdminInvoiceManagement } from '@/components/admin/invoice-management'

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>Invoice Management</h1>
        <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Review and process contractor invoices</p>
      </div>
      
      <AdminInvoiceManagement />
    </div>
  )
}