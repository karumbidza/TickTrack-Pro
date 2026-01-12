'use client'

/**
 * SUBSCRIPTION STATUS PROVIDER
 * =============================
 * React context that checks subscription status and shows warnings.
 * 
 * Usage: Wrap your app layout with this provider.
 * 
 * Features:
 * - Fetches subscription status on mount
 * - Shows warning banner for GRACE status
 * - Shows upgrade prompt for READ_ONLY status
 * - Blocks access for SUSPENDED status
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { AlertTriangle, XCircle, AlertCircle } from 'lucide-react'

interface SubscriptionStatus {
  level: 'full' | 'grace' | 'read_only' | 'blocked'
  message?: string
  subscription?: {
    status: string
    plan: string
    currentPeriodEnd: string | null
    gracePeriodEnd: string | null
    daysRemaining: number
  }
  loading: boolean
}

interface SubscriptionContextType extends SubscriptionStatus {
  refresh: () => Promise<void>
  canWrite: boolean
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  level: 'full',
  loading: true,
  refresh: async () => {},
  canWrite: true
})

export function useSubscription() {
  return useContext(SubscriptionContext)
}

// Paths that don't require subscription check
const EXEMPT_PATHS = [
  '/billing',
  '/settings',
  '/auth',
  '/pricing',
  '/super-admin',
  '/api'
]

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    level: 'full',
    loading: true
  })

  const fetchSubscriptionStatus = async () => {
    if (!session?.user?.tenantId) {
      setSubscriptionStatus({ level: 'full', loading: false })
      return
    }

    // Super admin bypasses all checks
    if (session.user.role === 'SUPER_ADMIN') {
      setSubscriptionStatus({ level: 'full', loading: false })
      return
    }

    try {
      const response = await fetch('/api/billing/status')
      if (response.ok) {
        const data = await response.json()
        setSubscriptionStatus({
          level: data.level,
          message: data.message,
          subscription: data.subscription,
          loading: false
        })
      } else {
        setSubscriptionStatus({ level: 'full', loading: false })
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error)
      setSubscriptionStatus({ level: 'full', loading: false })
    }
  }

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchSubscriptionStatus()
    } else if (sessionStatus === 'unauthenticated') {
      setSubscriptionStatus({ level: 'full', loading: false })
    }
  }, [sessionStatus, session?.user?.tenantId])

  // Check if current path is exempt
  const isExemptPath = EXEMPT_PATHS.some(path => pathname?.startsWith(path))

  // Redirect to billing if blocked (except on exempt paths)
  useEffect(() => {
    if (
      !subscriptionStatus.loading &&
      subscriptionStatus.level === 'blocked' &&
      !isExemptPath
    ) {
      router.push('/billing?status=blocked')
    }
  }, [subscriptionStatus.level, subscriptionStatus.loading, pathname])

  const contextValue: SubscriptionContextType = {
    ...subscriptionStatus,
    refresh: fetchSubscriptionStatus,
    canWrite: subscriptionStatus.level === 'full' || subscriptionStatus.level === 'grace'
  }

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {/* Warning banners */}
      {!subscriptionStatus.loading && !isExemptPath && (
        <>
          {/* GRACE period warning */}
          {subscriptionStatus.level === 'grace' && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    {subscriptionStatus.message || 'Payment overdue. Please renew your subscription.'}
                  </span>
                </div>
                <a 
                  href="/billing" 
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  Pay Now
                </a>
              </div>
            </div>
          )}

          {/* READ_ONLY warning */}
          {subscriptionStatus.level === 'read_only' && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-3">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-800">
                    Your subscription has expired. You can view data but cannot make changes.
                  </span>
                </div>
                <a 
                  href="/billing" 
                  className="text-sm font-medium bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Renew Now
                </a>
              </div>
            </div>
          )}

          {/* BLOCKED/SUSPENDED */}
          {subscriptionStatus.level === 'blocked' && (
            <div className="bg-gray-900 border-b border-gray-700 px-4 py-3">
              <div className="flex items-center justify-center gap-2">
                <XCircle className="h-5 w-5 text-white" />
                <span className="text-sm text-white">
                  Account suspended. Please contact support.
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {children}
    </SubscriptionContext.Provider>
  )
}

/**
 * HOC to disable form submissions in read-only mode
 */
export function withWriteAccess<P extends object>(
  Component: React.ComponentType<P>,
  fallbackMessage = 'Subscription required to perform this action'
): React.FC<P> {
  return function WriteProtectedComponent(props: P) {
    const { canWrite, level } = useSubscription()

    if (!canWrite && level === 'read_only') {
      return (
        <div className="opacity-50 pointer-events-none relative">
          <Component {...props} />
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <span className="bg-gray-800 text-white px-4 py-2 rounded text-sm">
              {fallbackMessage}
            </span>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}
