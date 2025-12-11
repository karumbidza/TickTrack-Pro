import { AuthGuard } from '@/components/auth/auth-guard'
import { ContractorDashboard } from '@/components/contractor/dashboard'

export default function ContractorPage() {
  return (
    <AuthGuard allowedRoles={['CONTRACTOR']}>
      <ContractorDashboard />
    </AuthGuard>
  )
}