'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  ArrowUpRight,
  Download,
  Users,
  Building2,
  Package,
  Zap,
  Shield,
  TrendingUp,
  Receipt,
  Wallet,
  RefreshCw,
  AlertTriangle,
  FileText,
  Banknote,
  ChevronRight,
  Crown,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface BillingData {
  subscription: {
    id: string
    plan: string
    status: string
    amount: number
    currency: string
    billingCycle: string
    currentPeriodStart: string
    currentPeriodEnd: string
    gracePeriodEnd?: string
    trialEndsAt?: string
  } | null
  tenant: {
    id: string
    name: string
    status: string
    trialEndsAt?: string
    slug: string
  }
  usage: {
    users: { current: number; limit: number }
    branches: { current: number; limit: number }
    assets: { current: number; limit: number }
  }
  payments: Array<{
    id: string
    invoiceNumber: string
    amount: number
    currency: string
    status: string
    createdAt: string
    paidAt?: string
    dueDate?: string
    description?: string
  }>
}

interface Plan {
  id: string
  name: string
  description: string
  price: { monthly: number; yearly: number }
  features: string[]
  limits: { users: number; branches: number; assets: number }
  popular?: boolean
  current?: boolean
}

export function BillingManagement() {
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'bank_transfer'>('paynow')
  const [processing, setProcessing] = useState(false)
  const [activeInnerTab, setActiveInnerTab] = useState('overview')

  const plans: Plan[] = [
    {
      id: 'BASIC',
      name: 'Basic',
      description: 'Perfect for small teams just getting started',
      price: { monthly: 29, yearly: 290 },
      features: [
        'Up to 10 users',
        'Up to 3 branches',
        'Up to 100 assets',
        'Basic helpdesk',
        'Email support',
        'Standard reports'
      ],
      limits: { users: 10, branches: 3, assets: 100 }
    },
    {
      id: 'PRO',
      name: 'Pro',
      description: 'For growing businesses that need more power',
      price: { monthly: 79, yearly: 790 },
      features: [
        'Up to 50 users',
        'Up to 10 branches',
        'Up to 500 assets',
        'Contractor network',
        'Invoice management',
        'Advanced analytics',
        'Priority support',
        'API access'
      ],
      limits: { users: 50, branches: 10, assets: 500 },
      popular: true
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Full-featured solution for large organizations',
      price: { monthly: 199, yearly: 1990 },
      features: [
        'Unlimited users',
        'Unlimited branches',
        'Unlimited assets',
        'White-label options',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantees',
        'Custom reports',
        'Audit logs'
      ],
      limits: { users: -1, branches: -1, assets: -1 }
    }
  ]

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/billing')
      if (response.ok) {
        const data = await response.json()
        setBillingData(data)
        if (data.subscription) {
          setSelectedPlan(data.subscription.plan)
        }
      }
    } catch (error) {
      console.error('Error fetching billing data:', error)
      toast.error('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle,
          paymentMethod
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.paynow?.redirectUrl) {
          window.location.href = data.paynow.redirectUrl
        } else if (data.bankDetails) {
          setShowUpgradeDialog(false)
          setShowPaymentDialog(true)
        } else {
          toast.success('Plan updated successfully')
          fetchBillingData()
          setShowUpgradeDialog(false)
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to process upgrade')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      toast.error('Failed to process upgrade')
    } finally {
      setProcessing(false)
    }
  }

  const downloadInvoice = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/invoices/${paymentId}/summary-pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${paymentId}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      toast.error('Failed to download invoice')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const getDaysRemaining = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: any; icon: any; label: string }> = {
      ACTIVE: { variant: 'default', icon: CheckCircle, label: 'Active' },
      TRIAL: { variant: 'secondary', icon: Sparkles, label: 'Trial' },
      GRACE: { variant: 'warning', icon: AlertTriangle, label: 'Grace Period' },
      READ_ONLY: { variant: 'destructive', icon: AlertCircle, label: 'Read Only' },
      SUSPENDED: { variant: 'destructive', icon: AlertCircle, label: 'Suspended' },
      EXPIRED: { variant: 'outline', icon: Clock, label: 'Expired' }
    }
    const config = configs[status] || configs.EXPIRED
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const configs: Record<string, { variant: any; label: string }> = {
      success: { variant: 'default', label: 'Paid' },
      pending: { variant: 'secondary', label: 'Pending' },
      failed: { variant: 'destructive', label: 'Failed' }
    }
    const config = configs[status] || { variant: 'outline', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    return Math.min(100, (current / limit) * 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!billingData) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Unable to load billing information</h3>
        <p className="text-gray-500 mt-1">Please try again later or contact support.</p>
        <Button onClick={fetchBillingData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const { subscription, tenant, usage, payments } = billingData
  const currentPlan = plans.find(p => p.id === subscription?.plan)
  const daysRemaining = subscription?.currentPeriodEnd 
    ? getDaysRemaining(subscription.currentPeriodEnd)
    : subscription?.trialEndsAt 
      ? getDaysRemaining(subscription.trialEndsAt)
      : 0

  return (
    <div className="space-y-6">
      {/* Status Alerts */}
      {subscription?.status === 'TRIAL' && daysRemaining <= 7 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-900">Trial Ending Soon</h4>
                <p className="text-sm text-amber-700 mt-0.5">
                  Your trial ends in {daysRemaining} days. Upgrade now to keep your data and continue using all features.
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => setShowUpgradeDialog(true)}
              >
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {subscription?.status === 'GRACE' && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900">Payment Overdue</h4>
                <p className="text-sm text-yellow-700 mt-0.5">
                  Your payment is overdue. Please pay within the grace period to maintain full access.
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-yellow-600 hover:bg-yellow-700"
                onClick={() => setShowUpgradeDialog(true)}
              >
                Pay Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {subscription?.status === 'READ_ONLY' && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900">Account Limited</h4>
                <p className="text-sm text-red-700 mt-0.5">
                  Your account is in read-only mode. You can view data but cannot create or update records.
                </p>
              </div>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => setShowUpgradeDialog(true)}
              >
                Restore Access
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inner Tabs for Billing Sections */}
      <Tabs value={activeInnerTab} onValueChange={setActiveInnerTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="overview" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5">
            <Package className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5">
            <Zap className="h-4 w-4" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <Receipt className="h-4 w-4" />
            Invoices
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Plan Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Current Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {currentPlan?.name || 'No Plan'}
                      </span>
                      {currentPlan?.id === 'ENTERPRISE' && (
                        <Crown className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {subscription?.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} billing
                    </p>
                  </div>
                  {subscription && getStatusBadge(subscription.status)}
                </div>
              </CardContent>
            </Card>

            {/* Next Billing Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Next Billing Date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {subscription?.currentPeriodEnd 
                    ? formatDate(subscription.currentPeriodEnd)
                    : tenant.trialEndsAt
                      ? formatDate(tenant.trialEndsAt)
                      : 'N/A'
                  }
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {daysRemaining} days remaining
                </p>
              </CardContent>
            </Card>

            {/* Amount Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Amount Due</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {subscription 
                    ? formatCurrency(subscription.amount, subscription.currency)
                    : '$0.00'
                  }
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  per {subscription?.billingCycle || 'month'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setShowUpgradeDialog(true)}
                >
                  <ArrowUpRight className="h-5 w-5 text-blue-600" />
                  <span>Upgrade Plan</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setActiveInnerTab('invoices')}
                >
                  <FileText className="h-5 w-5 text-green-600" />
                  <span>View Invoices</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setActiveInnerTab('usage')}
                >
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span>Check Usage</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => window.open('mailto:support@ticktrackpro.com', '_blank')}
                >
                  <Shield className="h-5 w-5 text-gray-600" />
                  <span>Get Support</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Usage Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resource Usage</CardTitle>
              <CardDescription>Current usage against your plan limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Users */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Users</span>
                  </div>
                  <span className="text-gray-600">
                    {usage.users.current} / {usage.users.limit === -1 ? '∞' : usage.users.limit}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.users.current, usage.users.limit)} 
                  className={`h-2 ${getUsageColor(getUsagePercentage(usage.users.current, usage.users.limit))}`}
                />
              </div>

              {/* Branches */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Branches</span>
                  </div>
                  <span className="text-gray-600">
                    {usage.branches.current} / {usage.branches.limit === -1 ? '∞' : usage.branches.limit}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.branches.current, usage.branches.limit)} 
                  className="h-2"
                />
              </div>

              {/* Assets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Assets</span>
                  </div>
                  <span className="text-gray-600">
                    {usage.assets.current} / {usage.assets.limit === -1 ? '∞' : usage.assets.limit}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.assets.current, usage.assets.limit)} 
                  className="h-2"
                />
              </div>
            </CardContent>
            {(getUsagePercentage(usage.users.current, usage.users.limit) >= 75 ||
              getUsagePercentage(usage.branches.current, usage.branches.limit) >= 75 ||
              getUsagePercentage(usage.assets.current, usage.assets.limit) >= 75) && (
              <CardFooter className="border-t pt-4">
                <div className="flex items-center justify-between w-full">
                  <p className="text-sm text-amber-600">
                    You're approaching your plan limits. Consider upgrading for more capacity.
                  </p>
                  <Button size="sm" onClick={() => setShowUpgradeDialog(true)}>
                    Upgrade
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="mt-6">
          <div className="mb-6 flex items-center justify-center gap-4">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'font-medium' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span 
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-7' : ''
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'font-medium' : 'text-gray-500'}`}>
              Yearly
              <Badge variant="secondary" className="ml-2">Save 17%</Badge>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.plan === plan.id
              const price = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly
              const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(plan.price.yearly / 12) : plan.price.monthly

              return (
                <Card 
                  key={plan.id}
                  className={`relative ${plan.popular ? 'border-blue-500 border-2 shadow-lg' : ''} ${
                    isCurrentPlan ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-blue-600">Most Popular</Badge>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="outline" className="bg-white">Current Plan</Badge>
                    </div>
                  )}
                  <CardHeader className="pt-8">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold">${monthlyEquivalent}</span>
                        <span className="text-gray-500 ml-1">/mo</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className="text-sm text-gray-500 mt-1">
                          Billed ${price} annually
                        </p>
                      )}
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={isCurrentPlan ? 'outline' : plan.popular ? 'default' : 'outline'}
                      disabled={isCurrentPlan}
                      onClick={() => {
                        setSelectedPlan(plan.id)
                        setShowUpgradeDialog(true)
                      }}
                    >
                      {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* USAGE TAB */}
        <TabsContent value="usage" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Users Usage */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Users
                  </CardTitle>
                  <Badge variant="outline">
                    {usage.users.limit === -1 ? 'Unlimited' : `${usage.users.limit} max`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-gray-900">{usage.users.current}</div>
                  <p className="text-sm text-gray-500 mt-1">Active users</p>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.users.current, usage.users.limit)} 
                  className="h-3 mt-4"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {usage.users.limit === -1 
                    ? 'Unlimited users available'
                    : `${usage.users.limit - usage.users.current} remaining`
                  }
                </p>
              </CardContent>
            </Card>

            {/* Branches Usage */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-500" />
                    Branches
                  </CardTitle>
                  <Badge variant="outline">
                    {usage.branches.limit === -1 ? 'Unlimited' : `${usage.branches.limit} max`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-gray-900">{usage.branches.current}</div>
                  <p className="text-sm text-gray-500 mt-1">Active branches</p>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.branches.current, usage.branches.limit)} 
                  className="h-3 mt-4"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {usage.branches.limit === -1 
                    ? 'Unlimited branches available'
                    : `${usage.branches.limit - usage.branches.current} remaining`
                  }
                </p>
              </CardContent>
            </Card>

            {/* Assets Usage */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-500" />
                    Assets
                  </CardTitle>
                  <Badge variant="outline">
                    {usage.assets.limit === -1 ? 'Unlimited' : `${usage.assets.limit} max`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-gray-900">{usage.assets.current}</div>
                  <p className="text-sm text-gray-500 mt-1">Registered assets</p>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.assets.current, usage.assets.limit)} 
                  className="h-3 mt-4"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {usage.assets.limit === -1 
                    ? 'Unlimited assets available'
                    : `${usage.assets.limit - usage.assets.current} remaining`
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Tips */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Plan Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium">Resource</th>
                      {plans.map(plan => (
                        <th key={plan.id} className="text-center py-3 font-medium">
                          {plan.name}
                          {subscription?.plan === plan.id && (
                            <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        Users
                      </td>
                      {plans.map(plan => (
                        <td key={plan.id} className="text-center py-3">
                          {plan.limits.users === -1 ? 'Unlimited' : plan.limits.users}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        Branches
                      </td>
                      {plans.map(plan => (
                        <td key={plan.id} className="text-center py-3">
                          {plan.limits.branches === -1 ? 'Unlimited' : plan.limits.branches}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        Assets
                      </td>
                      {plans.map(plan => (
                        <td key={plan.id} className="text-center py-3">
                          {plan.limits.assets === -1 ? 'Unlimited' : plan.limits.assets}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Payment History</CardTitle>
                  <CardDescription>View and download your invoices</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-medium text-gray-900">No payments yet</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Your payment history will appear here once you make your first payment.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-gray-500">Invoice</th>
                        <th className="pb-3 font-medium text-gray-500">Date</th>
                        <th className="pb-3 font-medium text-gray-500">Amount</th>
                        <th className="pb-3 font-medium text-gray-500">Status</th>
                        <th className="pb-3 font-medium text-gray-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b last:border-0">
                          <td className="py-4">
                            <div className="font-medium">{payment.invoiceNumber || payment.id.slice(0, 8)}</div>
                            <div className="text-sm text-gray-500">{payment.description}</div>
                          </td>
                          <td className="py-4">
                            <div>{formatDate(payment.createdAt)}</div>
                            {payment.dueDate && payment.status === 'pending' && (
                              <div className="text-sm text-gray-500">Due: {formatDate(payment.dueDate)}</div>
                            )}
                          </td>
                          <td className="py-4 font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </td>
                          <td className="py-4">
                            {getPaymentStatusBadge(payment.status)}
                          </td>
                          <td className="py-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => downloadInvoice(payment.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Payment Methods</CardTitle>
              <CardDescription>Available payment options for your subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Wallet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Paynow</h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Pay instantly using Ecocash, OneMoney, or Telecash
                    </p>
                  </div>
                </div>
                <div className="border rounded-lg p-4 flex items-start gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Banknote className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Bank Transfer</h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Pay via direct bank transfer (USD or ZWL)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Select a plan and payment method to continue
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Plan Selection */}
            <div className="space-y-3">
              <Label>Select Plan</Label>
              <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                {plans.map((plan) => {
                  const price = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly
                  const isCurrentPlan = subscription?.plan === plan.id

                  return (
                    <label
                      key={plan.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlan === plan.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                      } ${isCurrentPlan ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={plan.id} disabled={isCurrentPlan} />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {plan.name}
                            {plan.popular && <Badge variant="secondary">Popular</Badge>}
                            {isCurrentPlan && <Badge variant="outline">Current</Badge>}
                          </div>
                          <p className="text-sm text-gray-500">{plan.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${price}</div>
                        <div className="text-sm text-gray-500">
                          /{billingCycle === 'yearly' ? 'year' : 'month'}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </RadioGroup>
            </div>

            <Separator />

            {/* Billing Cycle */}
            <div className="space-y-3">
              <Label>Billing Cycle</Label>
              <RadioGroup 
                value={billingCycle} 
                onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}
                className="flex gap-4"
              >
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer ${
                  billingCycle === 'monthly' ? 'border-blue-500 bg-blue-50' : ''
                }`}>
                  <RadioGroupItem value="monthly" />
                  <span>Monthly</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer ${
                  billingCycle === 'yearly' ? 'border-blue-500 bg-blue-50' : ''
                }`}>
                  <RadioGroupItem value="yearly" />
                  <span>Yearly</span>
                  <Badge variant="secondary" className="ml-1">-17%</Badge>
                </label>
              </RadioGroup>
            </div>

            <Separator />

            {/* Payment Method */}
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup 
                value={paymentMethod} 
                onValueChange={(v) => setPaymentMethod(v as 'paynow' | 'bank_transfer')}
              >
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                  paymentMethod === 'paynow' ? 'border-blue-500 bg-blue-50' : ''
                }`}>
                  <RadioGroupItem value="paynow" />
                  <Wallet className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Paynow (Mobile Money)</div>
                    <div className="text-sm text-gray-500">Ecocash, OneMoney, Telecash</div>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                  paymentMethod === 'bank_transfer' ? 'border-blue-500 bg-blue-50' : ''
                }`}>
                  <RadioGroupItem value="bank_transfer" />
                  <Banknote className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">Bank Transfer</div>
                    <div className="text-sm text-gray-500">Direct bank deposit</div>
                  </div>
                </label>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade} disabled={processing || !selectedPlan}>
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Continue to Payment
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Transfer Details Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bank Transfer Details</DialogTitle>
            <DialogDescription>
              Please transfer the amount to the following bank account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Bank Name:</span>
                <span className="font-medium">CBZ Bank</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Name:</span>
                <span className="font-medium">TickTrack Pro (Pvt) Ltd</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Number:</span>
                <span className="font-medium font-mono">12345678901234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Branch:</span>
                <span className="font-medium">Harare Main</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-medium">Amount:</span>
                <span className="font-bold text-blue-600">
                  ${selectedPlan && plans.find(p => p.id === selectedPlan)?.price[billingCycle]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reference:</span>
                <span className="font-medium font-mono">{tenant.slug.toUpperCase()}-SUB</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Important</p>
                  <p>Please use the reference code when making the transfer. Your subscription will be activated within 24 hours after payment confirmation.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPaymentDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
