'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Lock, Crown, Zap, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface FeatureGateProps {
  feature?: string
  plan?: 'BASIC' | 'PRO' | 'ENTERPRISE'
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

interface TenantLimits {
  plan: string
  status: string
  limits: {
    maxUsers: number
    maxTicketsPerMonth: number
    hasContractorNetwork: boolean
    hasInvoiceManagement: boolean
    hasAdvancedReporting: boolean
    hasApiAccess: boolean
    hasCustomWorkflows: boolean
    hasSSO: boolean
    hasPrioritySupport: boolean
    hasWhiteLabel: boolean
  }
  userUsage: { current: number, limit: number }
  ticketUsage: { current: number, limit: number }
}

export function FeatureGate({ 
  feature, 
  plan, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { data: session } = useSession()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [tenantLimits, setTenantLimits] = useState<TenantLimits | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  useEffect(() => {
    if (session?.user) {
      checkFeatureAccess()
    }
  }, [session, feature, plan])

  const checkFeatureAccess = async () => {
    try {
      const response = await fetch('/api/features/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, plan })
      })

      if (response.ok) {
        const data = await response.json()
        setHasAccess(data.hasAccess)
        setTenantLimits(data.tenantLimits)
      }
    } catch (error) {
      console.error('Error checking feature access:', error)
      setHasAccess(false)
    }
  }

  if (hasAccess === null) {
    return <div className="animate-pulse bg-gray-200 rounded h-8" />
  }

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showUpgradePrompt) {
    return null
  }

  const getRequiredPlan = () => {
    if (plan) return plan

    // Determine required plan based on feature
    switch (feature) {
      case 'hasContractorNetwork':
      case 'hasInvoiceManagement':
      case 'hasAdvancedReporting':
      case 'hasApiAccess':
      case 'hasCustomWorkflows':
        return 'PRO'
      case 'hasSSO':
      case 'hasWhiteLabel':
        return 'ENTERPRISE'
      default:
        return 'PRO'
    }
  }

  const requiredPlan = getRequiredPlan()
  const isTrialExpired = tenantLimits?.status === 'EXPIRED'

  return (
    <>
      <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="mb-4">
              {isTrialExpired ? (
                <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
              ) : requiredPlan === 'ENTERPRISE' ? (
                <Crown className="h-12 w-12 mx-auto text-purple-500" />
              ) : (
                <Zap className="h-12 w-12 mx-auto text-blue-500" />
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isTrialExpired ? 'Trial Expired' : `${requiredPlan} Feature`}
            </h3>
            
            <p className="text-gray-600 mb-4">
              {isTrialExpired 
                ? 'Your trial has expired. Upgrade to continue using TickTrack Pro.'
                : `This feature requires the ${requiredPlan} plan or higher.`
              }
            </p>

            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowUpgradeDialog(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                View Plans
              </Button>
              
              <Button 
                size="sm"
                className={
                  isTrialExpired 
                    ? 'bg-red-600 hover:bg-red-700'
                    : requiredPlan === 'ENTERPRISE'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }
                asChild
              >
                <Link href="/billing">
                  {isTrialExpired ? 'Reactivate Account' : 'Upgrade Now'}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600">
                {isTrialExpired 
                  ? 'Your trial has expired. Choose a plan to continue using TickTrack Pro.'
                  : `To access this feature, you need the ${requiredPlan} plan or higher.`
                }
              </p>
            </div>

            {/* Current Plan Info */}
            {tenantLimits && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Current Plan</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{tenantLimits.plan}</Badge>
                      <Badge variant={tenantLimits.status === 'TRIAL' ? 'default' : 'outline'}>
                        {tenantLimits.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Users</p>
                    <p className="font-medium">
                      {tenantLimits.userUsage.current}
                      {tenantLimits.userUsage.limit > 0 && `/${tenantLimits.userUsage.limit}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Plan Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['BASIC', 'PRO', 'ENTERPRISE'].map((planName) => (
                <div 
                  key={planName}
                  className={`border rounded-lg p-4 ${
                    planName === requiredPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="text-center">
                    <h5 className="font-semibold">{planName}</h5>
                    {planName === requiredPlan && (
                      <Badge className="mt-1">Required</Badge>
                    )}
                    <div className="mt-2">
                      <span className="text-lg font-bold">
                        ${planName === 'BASIC' ? '29' : planName === 'PRO' ? '79' : '199'}
                      </span>
                      <span className="text-gray-600 text-sm">/month</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                Cancel
              </Button>
              <Button asChild>
                <Link href="/billing">
                  {isTrialExpired ? 'Choose Plan' : 'Upgrade Now'}
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Usage limit component for displaying current usage
export function UsageLimitDisplay({ 
  type, 
  current, 
  limit, 
  className = '' 
}: { 
  type: 'users' | 'tickets'
  current: number
  limit: number
  className?: string 
}) {
  const percentage = limit > 0 ? (current / limit) * 100 : 0
  const isNearLimit = percentage >= 80
  const isAtLimit = current >= limit && limit > 0

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="capitalize">{type} this month</span>
        <span className={`font-medium ${isNearLimit ? 'text-orange-600' : 'text-gray-900'}`}>
          {current}{limit > 0 && `/${limit}`}
        </span>
      </div>
      
      {limit > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isAtLimit 
                ? 'bg-red-500' 
                : isNearLimit 
                ? 'bg-orange-500' 
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      )}
      
      {isAtLimit && (
        <p className="text-xs text-red-600">
          You've reached your {type} limit. 
          <Link href="/billing" className="underline ml-1">
            Upgrade to continue
          </Link>
        </p>
      )}
    </div>
  )
}

export default FeatureGate