'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
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
  const { user } = useUser()
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('ENTERPRISE')
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'ZWL'>('USD')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'paynow' | 'bank_transfer'>('paynow')
  const [mobileProvider, setMobileProvider] = useState<'ecocash' | 'onemoney' | 'telecash'>('ecocash')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [paymentInstructions, setPaymentInstructions] = useState('')
  const [popFile, setPopFile] = useState<File | null>(null)
  const [uploadingPop, setUploadingPop] = useState(false)

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
    if (!selectedPlan) {
      setPaymentError('Please select a plan')
      return
    }

    setPaymentError('')
    setPaymentInstructions('')
    setUpgradeLoading(true)

    if (selectedPaymentMethod === 'paynow') {
      // Validate phone number
      if (!phoneNumber || phoneNumber.length < 9) {
        setPaymentError('Please enter a valid phone number (e.g., 0771234567)')
        setUpgradeLoading(false)
        return
      }

      try {
        const paymentResponse = await fetch('/api/billing/paynow/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: selectedPlan,
            billingCycle: selectedBillingCycle,
            currency: selectedCurrency,
            phone: phoneNumber,
            method: mobileProvider
          })
        })

        const paymentData = await paymentResponse.json()

        if (paymentResponse.ok) {
          // Mobile payment initiated - show instructions
          setPaymentInstructions(paymentData.instructions || 
            `A payment request has been sent to ${phoneNumber}. Please check your phone and enter your PIN to complete the payment.`)
          
          // Start polling for payment status
          if (paymentData.pollUrl) {
            pollPaymentStatus(paymentData.paymentId, paymentData.pollUrl)
          }
        } else {
          setPaymentError(paymentData.error || 'Failed to initiate payment')
        }
      } catch (error) {
        console.error('Paynow error:', error)
        setPaymentError('An error occurred. Please try again.')
      } finally {
        setUpgradeLoading(false)
      }
    } else {
      // Bank transfer - show POP upload
      setUpgradeLoading(false)
      // Keep dialog open for POP upload
    }
  }

  const pollPaymentStatus = async (paymentId: string, pollUrl: string) => {
    const maxAttempts = 30 // Poll for up to 5 minutes
    let attempts = 0

    const poll = async () => {
      attempts++
      try {
        const response = await fetch(`/api/billing/paynow/status?paymentId=${paymentId}`)
        const data = await response.json()

        if (data.status === 'paid' || data.status === 'success') {
          alert('Payment successful! Your subscription is now active.')
          setShowUpgradeDialog(false)
          fetchBillingData() // Refresh billing data
          return
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          setPaymentError('Payment was not completed. Please try again.')
          setPaymentInstructions('')
          return
        }

        // Continue polling if still pending
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000) // Poll every 10 seconds
        } else {
          setPaymentInstructions('Payment is still processing. Check your phone for the payment prompt, or try again.')
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    // Start polling after a short delay
    setTimeout(poll, 5000)
  }

  const handlePopUpload = async () => {
    if (!popFile || !selectedPlan) {
      setPaymentError('Please select a POP file')
      return
    }

    setPaymentError('')
    setUploadingPop(true)

    try {
      const formData = new FormData()
      formData.append('file', popFile)
      formData.append('plan', selectedPlan)
      formData.append('billingCycle', selectedBillingCycle)
      formData.append('currency', selectedCurrency)

      const response = await fetch('/api/billing/bank-transfer/submit-pop', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        setShowUpgradeDialog(false)
        setPaymentError('')
        setPopFile(null)
        // Show success message
        alert('Payment proof submitted successfully. Admin will review and activate your account soon.')
      } else {
        const error = await response.json()
        setPaymentError(error.error || 'Failed to upload payment proof')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setPaymentError('An error occurred. Please try again.')
    } finally {
      setUploadingPop(false)
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
      case 'ACTIVE': return { text: 'Your subscription is active', color: 'var(--green)' }
      case 'TRIAL': return { text: 'You are on a free trial', color: 'var(--blue)' }
      case 'GRACE': return { text: 'Payment overdue - grace period active', color: 'var(--amber)' }
      case 'READ_ONLY': return { text: 'Account is read-only - payment required', color: 'var(--red)' }
      case 'SUSPENDED': return { text: 'Account suspended - contact support', color: 'var(--red)' }
      default: return { text: '', color: '' }
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-4 w-4" style={{ color: 'var(--green)' }} />
      case 'pending':
        return <Clock className="h-4 w-4" style={{ color: 'var(--amber)' }} />
      case 'failed':
        return <AlertCircle className="h-4 w-4" style={{ color: 'var(--red)' }} />
      default:
        return <Clock className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
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
          <h1 className="text-2xl font-medium" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>Error loading billing data</h1>
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
          <h1 className="text-3xl font-medium mb-2" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>
            Billing & Subscription
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage your subscription and view payment history
          </p>
        </div>

        {/* Trial Warning */}
        {tenant.status === 'TRIAL' && tenant.trialEndsAt && (
          <Card className="mb-8 border border-border" style={{ backgroundColor: 'var(--amber-bg)' }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-6 w-6 mt-0.5" style={{ color: 'var(--amber)' }} />
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {isTrialExpiringSoon(tenant.trialEndsAt) ? 'Trial Ending Soon!' : 'Trial Active'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Your trial ends on {formatDate(tenant.trialEndsAt)}.
                      {isTrialExpiringSoon(tenant.trialEndsAt) && ' Upgrade now to continue using TickTrack Pro.'}
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowUpgradeDialog(true)}>
                  Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grace Period Warning */}
        {subscription?.status === 'GRACE' && (
          <Card className="mb-8 border border-border" style={{ backgroundColor: 'var(--amber-bg)' }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-6 w-6 mt-0.5" style={{ color: 'var(--amber)' }} />
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Payment Overdue - Grace Period Active</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Your subscription payment is overdue. You have 7 days to make a payment before your account becomes read-only.
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowUpgradeDialog(true)}>
                  Pay Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Read-Only Warning */}
        {subscription?.status === 'READ_ONLY' && (
          <Card className="mb-8 border border-border" style={{ backgroundColor: 'var(--red-bg)' }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-6 w-6 mt-0.5" style={{ color: 'var(--red)' }} />
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Account Read-Only</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Your account is now in read-only mode. You can view existing data but cannot create new tickets or update records. Please make a payment to restore full access.
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowUpgradeDialog(true)}>
                  Pay Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suspended Warning */}
        {subscription?.status === 'SUSPENDED' && (
          <Card className="mb-8 border border-border" style={{ backgroundColor: 'var(--red-bg)' }}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 mt-0.5" style={{ color: 'var(--red)' }} />
                <div>
                  <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Account Suspended</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
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
                        <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{subscription.plan} Plan</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
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
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Current Period</p>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Next Billing Date</p>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                    <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      No Active Subscription
                    </h3>
                    <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
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
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
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
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Organization</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{tenant.name}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Account Status</p>
                    <Badge variant={getStatusBadgeVariant(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </div>
                  {tenant.trialEndsAt && (
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Trial Ends</p>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(tenant.trialEndsAt)}</p>
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
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upgrade Your Plan</DialogTitle>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Select a plan and payment method to continue</p>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Payment Error Alert */}
              {paymentError && (
                <div className="border border-border rounded-lg p-4" style={{ backgroundColor: 'var(--red-bg)' }}>
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--red)' }} />
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Error</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{paymentError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Select Plan Section */}
              <div>
                <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Select Plan</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {plans.map((plan) => (
                    <label
                      key={plan.id}
                      className="border-2 rounded-lg p-4 cursor-pointer transition-all"
                      style={selectedPlan === plan.id
                        ? { borderColor: 'var(--accent)', backgroundColor: 'var(--blue-bg)' }
                        : { borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                    >
                      <div className="flex items-start">
                        <input
                          type="radio"
                          name="plan"
                          value={plan.id}
                          checked={selectedPlan === plan.id}
                          onChange={(e) => setSelectedPlan(e.target.value)}
                          className="mt-1"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{plan.name}</h4>
                            {plan.popular && (
                              <Badge className="text-xs" style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}>Popular</Badge>
                            )}
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>
                          <p className="text-lg font-medium mt-2" style={{ color: 'var(--text-primary)', fontWeight: 300 }}>
                            ${plan.pricing[selectedBillingCycle][selectedCurrency]}
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              /{selectedBillingCycle === 'yearly' ? 'year' : 'month'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Billing Cycle Section */}
              <div>
                <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Billing Cycle</h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={selectedBillingCycle === 'monthly'}
                      onChange={() => setSelectedBillingCycle('monthly')}
                      className="mr-2"
                    />
                    <span style={{ color: 'var(--text-primary)' }}>Monthly</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={selectedBillingCycle === 'yearly'}
                      onChange={() => setSelectedBillingCycle('yearly')}
                      className="mr-2"
                    />
                    <span style={{ color: 'var(--text-primary)' }}>Yearly <span className="text-sm" style={{ color: 'var(--green)' }}>-17%</span></span>
                  </label>
                  <div className="flex-1 flex items-center justify-end">
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value as 'USD' | 'ZWL')}
                      className="border border-border rounded px-3 py-1 text-sm" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="ZWL">ZWL (Z$)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Method Section */}
              <div>
                <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Payment Method</h3>
                <div className="space-y-3">
                  {/* Paynow */}
                  <label
                    className="border-2 rounded-lg p-4 cursor-pointer transition-all flex items-start"
                    style={selectedPaymentMethod === 'paynow'
                      ? { borderColor: 'var(--accent)', backgroundColor: 'var(--blue-bg)' }
                      : { borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paynow"
                      checked={selectedPaymentMethod === 'paynow'}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value as 'paynow' | 'bank_transfer')}
                      className="mt-1"
                    />
                    <div className="ml-3">
                      <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Mobile Money</h4>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>EcoCash, OneMoney, Telecash</p>
                    </div>
                  </label>

                  {/* Bank Transfer */}
                  <label
                    className="border-2 rounded-lg p-4 cursor-pointer transition-all flex items-start"
                    style={selectedPaymentMethod === 'bank_transfer'
                      ? { borderColor: 'var(--accent)', backgroundColor: 'var(--blue-bg)' }
                      : { borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={selectedPaymentMethod === 'bank_transfer'}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value as 'paynow' | 'bank_transfer')}
                      className="mt-1"
                    />
                    <div className="ml-3">
                      <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Bank Transfer</h4>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Direct bank deposit</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Mobile Money Details */}
              {selectedPaymentMethod === 'paynow' && (
                <div className="space-y-4 border border-border rounded-lg p-4" style={{ backgroundColor: 'var(--surface2)' }}>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Provider</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setMobileProvider('ecocash')}
                        className="p-3 border rounded-lg text-center transition-all"
                        style={mobileProvider === 'ecocash'
                          ? { borderColor: 'var(--green)', backgroundColor: 'var(--green-bg)' }
                          : { borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                      >
                        <p className="font-medium" style={{ color: 'var(--green)' }}>EcoCash</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileProvider('onemoney')}
                        className="p-3 border rounded-lg text-center transition-all"
                        style={mobileProvider === 'onemoney'
                          ? { borderColor: 'var(--accent)', backgroundColor: 'var(--blue-bg)' }
                          : { borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                      >
                        <p className="font-medium" style={{ color: 'var(--accent)' }}>OneMoney</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileProvider('telecash')}
                        className="p-3 border rounded-lg text-center transition-all"
                        style={mobileProvider === 'telecash'
                          ? { borderColor: 'var(--amber)', backgroundColor: 'var(--amber-bg)' }
                          : { borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                      >
                        <p className="font-medium" style={{ color: 'var(--amber)' }}>Telecash</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="0771234567"
                      className="w-full p-3 border border-border rounded-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                      maxLength={10}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Enter your {mobileProvider === 'ecocash' ? 'Econet' : mobileProvider === 'onemoney' ? 'NetOne' : 'Telecel'} number</p>
                  </div>

                  {paymentInstructions && (
                    <div className="p-4 border border-border rounded-lg" style={{ backgroundColor: 'var(--green-bg)' }}>
                      <div className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-2 mt-0.5" style={{ color: 'var(--green)' }} />
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Payment Request Sent!</p>
                          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{paymentInstructions}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bank Transfer POP Upload */}
              {selectedPaymentMethod === 'bank_transfer' && (
                <div className="border border-border rounded-lg p-4" style={{ backgroundColor: 'var(--blue-bg)' }}>
                  <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Submit Proof of Payment</h4>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Please upload a screenshot or image of your payment proof. Our admin will review and activate your account.
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPopFile(e.currentTarget.files?.[0] || null)}
                    className="block w-full border border-border rounded px-3 py-2 text-sm" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                  {popFile && (
                    <p className="text-sm mt-2" style={{ color: 'var(--green)' }}>✓ {popFile.name} selected</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUpgradeDialog(false)
                    setPaymentError('')
                    setPopFile(null)
                    setSelectedPlan('ENTERPRISE')
                    setSelectedPaymentMethod('paynow')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedPaymentMethod === 'paynow') {
                      handleUpgrade()
                    } else {
                      handlePopUpload()
                    }
                  }}
                  disabled={upgradeLoading || uploadingPop || !selectedPlan || !!paymentInstructions}
                >
                  {upgradeLoading || uploadingPop ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending payment request...
                    </>
                  ) : paymentInstructions ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Waiting for payment...
                    </>
                  ) : selectedPaymentMethod === 'paynow' ? (
                    'Pay Now'
                  ) : (
                    'Submit Payment Proof'
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