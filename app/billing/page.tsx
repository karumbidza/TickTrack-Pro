'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Loader2, CreditCard, Calendar, AlertCircle, CheckCircle, Clock, Star } from 'lucide-react'

interface Subscription {
  id: string
  plan: string
  status: string
  amount: number
  currency: string
  billingCycle: string
  currentPeriodStart: string
  currentPeriodEnd: string
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  paymentMethod: string
  description: string
  createdAt: string
  paidAt?: string
}

interface BillingData {
  tenant: {
    id: string
    name: string
    status: string
    trialEndsAt?: string
  }
  subscription?: Subscription
  recentPayments: Payment[]
}

export default function BillingPage() {
  const { data: session } = useSession()
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'ZWL'>('USD')

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      const response = await fetch('/api/subscriptions')
      if (response.ok) {
        const data = await response.json()
        setBillingData(data)
      }
    } catch (error) {
      console.error('Error fetching billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    if (!selectedPlan) return

    setUpgradeLoading(true)
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle: selectedBillingCycle,
          currency: selectedCurrency
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.paynow?.redirectUrl) {
          // Redirect to Paynow payment page
          window.location.href = data.paynow.redirectUrl
        }
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to create subscription')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('Failed to process upgrade')
    } finally {
      setUpgradeLoading(false)
    }
  }

  const plans = [
    {
      id: 'BASIC',
      name: 'Basic',
      description: 'Perfect for small teams',
      features: ['Up to 10 users', 'Basic helpdesk', 'Project management', 'Email support'],
      pricing: {
        monthly: { USD: 29, ZWL: 1160 },
        yearly: { USD: 290, ZWL: 11600 }
      }
    },
    {
      id: 'PRO',
      name: 'Pro',
      description: 'Advanced features for growing businesses',
      features: ['Up to 50 users', 'Advanced helpdesk', 'Contractor network', 'Invoice management', 'Priority support'],
      pricing: {
        monthly: { USD: 79, ZWL: 3160 },
        yearly: { USD: 790, ZWL: 31600 }
      },
      popular: true
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Full-featured solution for large organizations',
      features: ['Unlimited users', 'Enterprise features', 'White-label options', 'Dedicated support', 'Custom integrations'],
      pricing: {
        monthly: { USD: 199, ZWL: 7960 },
        yearly: { USD: 1990, ZWL: 79600 }
      }
    }
  ]

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE': return 'default'
      case 'TRIAL': return 'secondary'
      case 'GRACE': return 'warning' as any // Yellow warning
      case 'READ_ONLY': return 'destructive'
      case 'SUSPENDED': return 'destructive'
      case 'PAST_DUE': return 'destructive'
      case 'CANCELLED': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE': return { text: 'Your subscription is active', color: 'text-green-600' }
      case 'TRIAL': return { text: 'You are on a free trial', color: 'text-blue-600' }
      case 'GRACE': return { text: 'Payment overdue - grace period active', color: 'text-yellow-600' }
      case 'READ_ONLY': return { text: 'Account is read-only - payment required', color: 'text-red-600' }
      case 'SUSPENDED': return { text: 'Account suspended - contact support', color: 'text-red-600' }
      default: return { text: '', color: '' }
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isTrialExpiringSoon = (trialEndsAt?: string) => {
    if (!trialEndsAt) return false
    const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft <= 7
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!billingData) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Error loading billing data</h1>
        </div>
      </div>
    )
  }

  const { tenant, subscription, recentPayments } = billingData

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Billing & Subscription
          </h1>
          <p className="text-gray-600">
            Manage your subscription and view payment history
          </p>
        </div>

        {/* Trial Warning */}
        {tenant.status === 'TRIAL' && tenant.trialEndsAt && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-6 w-6 text-orange-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-orange-900">
                      {isTrialExpiringSoon(tenant.trialEndsAt) ? 'Trial Ending Soon!' : 'Trial Active'}
                    </h3>
                    <p className="text-orange-800">
                      Your trial ends on {formatDate(tenant.trialEndsAt)}. 
                      {isTrialExpiringSoon(tenant.trialEndsAt) && ' Upgrade now to continue using TickTrack Pro.'}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowUpgradeDialog(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grace Period Warning */}
        {subscription?.status === 'GRACE' && (
          <Card className="mb-8 border-yellow-400 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-900">Payment Overdue - Grace Period Active</h3>
                    <p className="text-yellow-800">
                      Your subscription payment is overdue. You have 7 days to make a payment before your account becomes read-only.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowUpgradeDialog(true)}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Pay Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Read-Only Warning */}
        {subscription?.status === 'READ_ONLY' && (
          <Card className="mb-8 border-red-400 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900">Account Read-Only</h3>
                    <p className="text-red-800">
                      Your account is now in read-only mode. You can view existing data but cannot create new tickets or update records. Please make a payment to restore full access.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowUpgradeDialog(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Pay Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suspended Warning */}
        {subscription?.status === 'SUSPENDED' && (
          <Card className="mb-8 border-red-600 bg-red-100">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-red-700 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Account Suspended</h3>
                  <p className="text-red-800">
                    Your account has been suspended. Please contact support at support@ticktrackpro.com to resolve this issue.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Subscription */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Subscription</span>
                  {subscription && (
                    <Badge variant={getStatusBadgeVariant(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{subscription.plan} Plan</h3>
                        <p className="text-gray-600">
                          {subscription.currency} ${subscription.amount}/{subscription.billingCycle}
                        </p>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => setShowUpgradeDialog(true)}
                      >
                        Change Plan
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-600">Current Period</p>
                        <p className="font-medium">
                          {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Next Billing Date</p>
                        <p className="font-medium">
                          {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Active Subscription
                    </h3>
                    <p className="text-gray-600 mb-4">
                      You're currently on the trial plan. Upgrade to continue using TickTrack Pro.
                    </p>
                    <Button onClick={() => setShowUpgradeDialog(true)}>
                      Choose a Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {recentPayments.length > 0 ? (
                  <Table>
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Amount</th>
                        <th className="text-left p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayments.map((payment) => (
                        <tr key={payment.id} className="border-b">
                          <td className="p-3">
                            {formatDate(payment.paidAt || payment.createdAt)}
                          </td>
                          <td className="p-3">{payment.description}</td>
                          <td className="p-3">
                            {payment.currency} ${payment.amount}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              {getPaymentStatusIcon(payment.status)}
                              <span className="capitalize">{payment.status}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4" />
                    <p>No payment history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Organization</p>
                    <p className="font-medium">{tenant.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Account Status</p>
                    <Badge variant={getStatusBadgeVariant(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </div>
                  {tenant.trialEndsAt && (
                    <div>
                      <p className="text-sm text-gray-600">Trial Ends</p>
                      <p className="font-medium">{formatDate(tenant.trialEndsAt)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Have questions about billing or need to customize your plan?
                </p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" size="sm">
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    Request Custom Quote
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upgrade Dialog */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Choose Your Plan</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Billing Options */}
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label>Billing Cycle:</label>
                  <select
                    value={selectedBillingCycle}
                    onChange={(e) => setSelectedBillingCycle(e.target.value as 'monthly' | 'yearly')}
                    className="border border-gray-300 rounded px-3 py-1"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly (Save 17%)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label>Currency:</label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value as 'USD' | 'ZWL')}
                    className="border border-gray-300 rounded px-3 py-1"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="ZWL">ZWL (Z$)</option>
                  </select>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <Card 
                    key={plan.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedPlan === plan.id 
                        ? 'ring-2 ring-blue-500 shadow-md' 
                        : 'hover:shadow-md'
                    } ${plan.popular ? 'border-purple-300' : ''}`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <CardHeader className="text-center">
                      {plan.popular && (
                        <Badge className="mb-2 bg-purple-600">
                          <Star className="w-3 h-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                      <div className="mt-4">
                        <span className="text-2xl font-bold">
                          {selectedCurrency} ${plan.pricing[selectedBillingCycle][selectedCurrency]}
                        </span>
                        <span className="text-gray-600">
                          /{selectedBillingCycle === 'yearly' ? 'year' : 'month'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpgrade}
                  disabled={!selectedPlan || upgradeLoading}
                >
                  {upgradeLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Upgrade Now'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}