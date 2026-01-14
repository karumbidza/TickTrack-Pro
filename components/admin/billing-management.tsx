'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Loader2, CreditCard, Calendar, AlertCircle, CheckCircle, Clock, Star, Download } from 'lucide-react'
import { toast } from 'sonner'

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
  invoiceNumber?: string
  dueDate?: string
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

export function BillingManagement() {
  const { data: session } = useSession()
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
        if (data.subscription) {
          setSelectedPlan(data.subscription.plan)
          setSelectedCurrency(data.subscription.currency)
          setSelectedBillingCycle(data.subscription.billingCycle)
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
          toast.success('Payment request sent to your phone!')
          
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
      setUpgradeLoading(false)
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
          toast.success('Payment successful! Your subscription is now active.')
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
        toast.success('Payment proof submitted. Admin will review and activate your account soon.')
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
      case 'GRACE': return 'warning' as any
      case 'READ_ONLY': return 'destructive'
      case 'SUSPENDED': return 'destructive'
      default: return 'outline'
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'success': 'Paid',
      'pending': 'Pending',
      'failed': 'Failed'
    }
    return statusMap[status] || status
  }

  const getDaysRemaining = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
          <Loader2 className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const { subscription, tenant, recentPayments } = billingData
  const currentPlan = plans.find(p => p.id === subscription?.plan)
  const daysRemaining = subscription?.currentPeriodEnd 
    ? getDaysRemaining(subscription.currentPeriodEnd)
    : tenant.trialEndsAt 
      ? getDaysRemaining(tenant.trialEndsAt)
      : 0

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      {subscription && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Current Plan</p>
                  <h3 className="text-2xl font-bold">{currentPlan?.name || 'Basic'}</h3>
                </div>
                <Badge variant={getStatusBadgeVariant(subscription.status)}>
                  {subscription.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 mb-2">Next Billing Date</p>
              <h3 className="text-2xl font-bold">{formatDate(subscription.currentPeriodEnd)}</h3>
              <p className="text-sm text-gray-600 mt-1">{daysRemaining} days remaining</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 mb-2">Amount Due</p>
              <h3 className="text-2xl font-bold">{formatCurrency(subscription.amount, subscription.currency)}</h3>
              <p className="text-sm text-gray-600 mt-1">per {subscription.billingCycle}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trial Ending Warning */}
      {subscription?.status === 'TRIAL' && daysRemaining <= 7 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-amber-900">Trial Ending Soon</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Your trial ends in {daysRemaining} days. Upgrade now to keep your data.
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

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600">No payments yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium">Invoice</th>
                    <th className="text-left py-3 font-medium">Date</th>
                    <th className="text-left py-3 font-medium">Amount</th>
                    <th className="text-left py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3">{payment.invoiceNumber || payment.id.slice(0, 8)}</td>
                      <td className="py-3">{formatDate(payment.createdAt)}</td>
                      <td className="py-3">{formatCurrency(payment.amount, payment.currency)}</td>
                      <td className="py-3">
                        <Badge variant={payment.status === 'success' ? 'default' : payment.status === 'pending' ? 'secondary' : 'destructive'}>
                          {getPaymentStatusBadge(payment.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Select a plan and payment method to continue with your subscription upgrade
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Plan Selection */}
            <div>
              <label className="text-sm font-medium mb-3 block">Select Plan</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const price = selectedBillingCycle === 'yearly' 
                    ? plan.pricing.yearly[selectedCurrency as 'USD' | 'ZWL']
                    : plan.pricing.monthly[selectedCurrency as 'USD' | 'ZWL']
                  const isSelected = selectedPlan === plan.id
                  const isCurrent = subscription?.plan === plan.id

                  return (
                    <div
                      key={plan.id}
                      onClick={() => !isCurrent && setSelectedPlan(plan.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                      } ${isCurrent ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <h4 className="font-medium flex items-center justify-between mb-2">
                        {plan.name}
                        {plan.popular && <Badge>Popular</Badge>}
                      </h4>
                      <p className="text-2xl font-bold mb-2">${price}</p>
                      <p className="text-xs text-gray-600">{plan.description}</p>
                      {isCurrent && <Badge variant="outline" className="mt-2">Current Plan</Badge>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Billing Cycle */}
            <div>
              <label className="text-sm font-medium mb-3 block">Billing Cycle</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedBillingCycle('monthly')}
                  className={`flex-1 p-3 border rounded-lg transition-all ${
                    selectedBillingCycle === 'monthly' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'
                  }`}
                >
                  <p className="font-medium">Monthly</p>
                  <p className="text-sm text-gray-600">Pay per month</p>
                </button>
                <button
                  onClick={() => setSelectedBillingCycle('yearly')}
                  className={`flex-1 p-3 border rounded-lg transition-all ${
                    selectedBillingCycle === 'yearly' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'
                  }`}
                >
                  <p className="font-medium">Yearly</p>
                  <p className="text-sm text-gray-600">Save 17%</p>
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-sm font-medium mb-3 block">Payment Method</label>
              <div className="space-y-2">
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                  selectedPaymentMethod === 'paynow' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="paynow"
                    checked={selectedPaymentMethod === 'paynow'}
                    onChange={() => setSelectedPaymentMethod('paynow')}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium">Mobile Money</p>
                    <p className="text-sm text-gray-600">EcoCash, OneMoney, Telecash</p>
                  </div>
                </label>
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                  selectedPaymentMethod === 'bank_transfer' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="bank_transfer"
                    checked={selectedPaymentMethod === 'bank_transfer'}
                    onChange={() => setSelectedPaymentMethod('bank_transfer')}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-sm text-gray-600">Direct bank deposit (USD/ZWL)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Mobile Money Details */}
            {selectedPaymentMethod === 'paynow' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">Select Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileProvider('ecocash')}
                      className={`p-3 border rounded-lg text-center transition-all ${
                        mobileProvider === 'ecocash' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <p className="font-medium text-green-700">EcoCash</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileProvider('onemoney')}
                      className={`p-3 border rounded-lg text-center transition-all ${
                        mobileProvider === 'onemoney' 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <p className="font-medium text-purple-700">OneMoney</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileProvider('telecash')}
                      className={`p-3 border rounded-lg text-center transition-all ${
                        mobileProvider === 'telecash' 
                          ? 'border-orange-500 bg-orange-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <p className="font-medium text-orange-700">Telecash</p>
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
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter your {mobileProvider === 'ecocash' ? 'Econet' : mobileProvider === 'onemoney' ? 'NetOne' : 'Telecel'} number</p>
                </div>
              </div>
            )

            {/* Bank Transfer POP Upload */}
            {selectedPaymentMethod === 'bank_transfer' && (
              <div>
                <label className="text-sm font-medium mb-3 block">Upload Payment Proof</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPopFile(e.currentTarget.files?.[0] || null)}
                    className="hidden"
                    id="pop-upload"
                  />
                  <label htmlFor="pop-upload" className="cursor-pointer">
                    <p className="font-medium text-gray-900">{popFile?.name || 'Click to upload'}</p>
                    <p className="text-sm text-gray-600 mt-1">PNG, JPG, or PDF (max 5MB)</p>
                  </label>
                </div>
              </div>
            )}

            {paymentError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{paymentError}</p>
              </div>
            )}

            {paymentInstructions && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Payment Request Sent!</p>
                    <p className="text-sm text-green-700 mt-1">{paymentInstructions}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            {selectedPaymentMethod === 'bank_transfer' ? (
              <Button 
                onClick={handlePopUpload} 
                disabled={uploadingPop || !popFile}
                className="flex-1"
              >
                {uploadingPop ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Submit Payment Proof'
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleUpgrade} 
                disabled={upgradeLoading || !!paymentInstructions}
                className="flex-1"
              >
                {upgradeLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending payment request...
                  </>
                ) : paymentInstructions ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Waiting for payment...
                  </>
                ) : (
                  'Pay Now'
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
