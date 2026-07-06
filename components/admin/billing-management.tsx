'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, CreditCard, Calendar, AlertCircle, CheckCircle, Clock, Star, Shield, ArrowRight, X, Check, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Card as DsCard, MonoLabel, Badge as DsBadge } from '@/components/admin/kit'

// ============================================
// TYPES
// ============================================

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

interface PaymentMethod {
  id: string
  label: string
  icon: string
  description: string
  fields: PaymentField[]
  color: string
  gradient: string
}

interface PaymentField {
  name: string
  label: string
  type: 'text' | 'tel' | 'file'
  placeholder: string
  maxLength?: number
  accept?: string
}

interface Plan {
  id: string
  name: string
  description: string
  features: string[]
  pricing: {
    monthly: { USD: number; ZWL: number }
    yearly: { USD: number; ZWL: number }
  }
  popular?: boolean
}

type PaymentState = 'idle' | 'processing' | 'success' | 'failed'

// ============================================
// DYNAMIC PAYMENT METHODS CONFIG
// Mobile Money (direct push): EcoCash, OneMoney
// Web Redirect (Paynow checkout): InnBucks, ZIPIT, Visa/Mastercard
// Manual: Bank Transfer
// ============================================

// Web redirect payment methods (user redirected to Paynow)
const webPaymentMethods = ['innbucks', 'zipit', 'visa']

const paymentMethods: PaymentMethod[] = [
  {
    id: 'ecocash',
    label: 'EcoCash',
    icon: '/payment-logos/ecocash.svg',
    description: 'Econet Mobile Money',
    color: 'green',
    gradient: 'from-green-500 to-green-600',
    fields: [
      {
        name: 'phone',
        label: 'EcoCash Number',
        type: 'tel',
        placeholder: '0771234567',
        maxLength: 10
      }
    ]
  },
  {
    id: 'onemoney',
    label: 'OneMoney',
    icon: '/payment-logos/onemoney.svg',
    description: 'NetOne Mobile Money',
    color: 'purple',
    gradient: 'from-purple-500 to-purple-600',
    fields: [
      {
        name: 'phone',
        label: 'OneMoney Number',
        type: 'tel',
        placeholder: '0712345678',
        maxLength: 10
      }
    ]
  },
  {
    id: 'innbucks',
    label: 'InnBucks',
    icon: '/payment-logos/innbucks.svg',
    description: 'InnBucks Wallet',
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    fields: [] // No fields needed - redirects to Paynow
  },
  {
    id: 'zipit',
    label: 'ZIPIT',
    icon: '/payment-logos/zipit.svg',
    description: 'Bank ZIPIT Transfer',
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    fields: [] // No fields needed - redirects to Paynow
  },
  {
    id: 'visa',
    label: 'Visa/Mastercard',
    icon: '/payment-logos/visa.svg',
    description: 'Credit/Debit Card',
    color: 'indigo',
    gradient: 'from-indigo-500 to-indigo-600',
    fields: [] // No fields needed - redirects to Paynow
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    icon: '/payment-logos/bank_transfer.svg',
    description: 'Direct Bank Deposit',
    color: 'slate',
    gradient: 'from-slate-600 to-slate-700',
    fields: [
      {
        name: 'pop',
        label: 'Proof of Payment',
        type: 'file',
        placeholder: 'Upload receipt',
        accept: 'image/*,.pdf'
      }
    ]
  }
]

// ============================================
// PLANS CONFIG
// ============================================

const plans: Plan[] = [
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

// ============================================
// MAIN COMPONENT
// ============================================

export function BillingManagement() {
  const { user } = useUser()
  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>
  const tenantId = meta.tenantId ?? null
  
  // Core state
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Modal state
  const [showBillingModal, setShowBillingModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState<'upgrade' | 'renew' | 'advance'>('upgrade')
  
  // Selection state
  const [selectedPlan, setSelectedPlan] = useState<string>('PRO')
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'ZWL'>('USD')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ecocash')
  const [advanceMonths, setAdvanceMonths] = useState(3)
  
  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [popFile, setPopFile] = useState<File | null>(null)
  
  // Payment state
  const [paymentState, setPaymentState] = useState<PaymentState>('idle')
  const [paymentError, setPaymentError] = useState('')
  const [paymentInstructions, setPaymentInstructions] = useState('')

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const currentMethod = useMemo(() => 
    paymentMethods.find(m => m.id === selectedPaymentMethod) || paymentMethods[0],
    [selectedPaymentMethod]
  )

  const currentPlan = useMemo(() => 
    plans.find(p => p.id === selectedPlan) || plans[1],
    [selectedPlan]
  )

  const paymentAmount = useMemo(() => {
    const plan = plans.find(p => p.id === selectedPlan)
    if (!plan) return 0
    
    const basePrice = selectedBillingCycle === 'yearly' 
      ? plan.pricing.yearly[selectedCurrency]
      : plan.pricing.monthly[selectedCurrency]
    
    if (dialogMode === 'advance') {
      return basePrice * advanceMonths
    }
    return basePrice
  }, [selectedPlan, selectedBillingCycle, selectedCurrency, dialogMode, advanceMonths])

  // ============================================
  // DATA FETCHING
  // ============================================

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

  // ============================================
  // PAYMENT HANDLERS
  // ============================================

  const validateForm = (): boolean => {
    const method = currentMethod
    
    for (const field of method.fields) {
      if (field.type === 'tel') {
        const value = formData[field.name] || ''
        if (value.length < 9) {
          setPaymentError(`Please enter a valid ${field.label}`)
          return false
        }
      }
      if (field.type === 'file' && !popFile) {
        setPaymentError('Please upload proof of payment')
        return false
      }
    }
    
    return true
  }

  const handleProceed = () => {
    setPaymentError('')
    if (!validateForm()) return
    setShowConfirmDialog(true)
  }

  const handlePayment = async () => {
    setPaymentError('')
    setPaymentInstructions('')
    setPaymentState('processing')
    setShowConfirmDialog(false)

    const amount = paymentAmount
    const description = dialogMode === 'advance' 
      ? `Pre-payment for ${advanceMonths} months`
      : dialogMode === 'renew'
        ? 'Early renewal'
        : `${selectedPlan} Plan - ${selectedBillingCycle}`

    if (selectedPaymentMethod === 'bank_transfer') {
      await handleBankTransfer()
      return
    }

    // Check if this is a web redirect payment method (InnBucks, ZIPIT, Visa)
    const isWebPayment = webPaymentMethods.includes(selectedPaymentMethod)

    try {
      // Use different endpoint for web vs mobile payments
      const endpoint = isWebPayment 
        ? '/api/billing/paynow/web-initiate'
        : '/api/billing/paynow/initiate'

      const paymentResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle: selectedBillingCycle,
          currency: selectedCurrency,
          phone: isWebPayment ? undefined : formData.phone,
          method: selectedPaymentMethod,
          amount,
          mode: dialogMode,
          advanceMonths: dialogMode === 'advance' ? advanceMonths : undefined,
          description
        })
      })

      const paymentData = await paymentResponse.json()

      if (paymentResponse.ok) {
        if (paymentData.redirectUrl) {
          window.location.href = paymentData.redirectUrl
        } else {
          setPaymentInstructions(paymentData.instructions || 
            `A payment request has been sent to ${formData.phone}. Please check your phone and enter your PIN to complete the payment.`)
          
          if (paymentData.pollUrl) {
            pollPaymentStatus(paymentData.paymentId, paymentData.pollUrl)
          }
        }
      } else {
        setPaymentState('failed')
        setPaymentError(paymentData.error || 'Failed to initiate payment')
      }
    } catch (error) {
      console.error('Payment error:', error)
      setPaymentState('failed')
      setPaymentError('An error occurred. Please try again.')
    }
  }

  const handleBankTransfer = async () => {
    if (!popFile) {
      setPaymentState('failed')
      setPaymentError('Please select a POP file')
      return
    }

    try {
      const formDataObj = new FormData()
      formDataObj.append('file', popFile)
      formDataObj.append('plan', selectedPlan)
      formDataObj.append('billingCycle', selectedBillingCycle)
      formDataObj.append('currency', selectedCurrency)

      const response = await fetch('/api/billing/bank-transfer/submit-pop', {
        method: 'POST',
        body: formDataObj
      })

      if (response.ok) {
        setPaymentState('success')
        toast.success('Payment proof submitted. Admin will review and activate your account soon.')
        setTimeout(() => {
          setShowBillingModal(false)
          resetState()
          fetchBillingData()
        }, 3000)
      } else {
        const error = await response.json()
        setPaymentState('failed')
        setPaymentError(error.error || 'Failed to upload payment proof')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setPaymentState('failed')
      setPaymentError('An error occurred. Please try again.')
    }
  }

  const pollPaymentStatus = async (paymentId: string, pollUrl: string) => {
    const maxAttempts = 12 // 12 attempts × 10 seconds = 2 minutes timeout
    let attempts = 0

    const poll = async () => {
      attempts++
      try {
        const response = await fetch(`/api/billing/paynow/status?paymentId=${paymentId}`)
        const data = await response.json()

        if (data.status === 'paid' || data.status === 'success') {
          setPaymentState('success')
          toast.success('Payment successful! Your subscription is now active.')
          setTimeout(() => {
            setShowBillingModal(false)
            resetState()
            fetchBillingData()
          }, 3000)
          return
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          setPaymentState('failed')
          setPaymentError('Payment was not completed. Please try again.')
          setPaymentInstructions('')
          return
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 10000)
        } else {
          // Timeout after 2 minutes - show timeout state
          setPaymentState('failed')
          setPaymentError('Payment timed out. This could be due to insufficient funds, network issues, or the payment was not confirmed on your phone. Please check your mobile money balance and try again.')
          setPaymentInstructions('')
        }
      } catch (error) {
        console.error('Polling error:', error)
        if (attempts >= maxAttempts) {
          setPaymentState('failed')
          setPaymentError('Unable to verify payment status. Please check your mobile money account and try again.')
          setPaymentInstructions('')
        } else {
          setTimeout(poll, 10000)
        }
      }
    }

    setTimeout(poll, 5000)
  }

  const resetState = () => {
    setPaymentState('idle')
    setPaymentError('')
    setPaymentInstructions('')
    setFormData({})
    setPopFile(null)
    setSelectedPaymentMethod('ecocash')
  }

  const openBillingModal = (mode: 'upgrade' | 'renew' | 'advance') => {
    setDialogMode(mode)
    resetState()
    setShowBillingModal(true)
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

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

  const getDaysRemaining = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  if (!billingData) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Unable to load billing information</h3>
        <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Please try again later or contact support.</p>
        <Button onClick={fetchBillingData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const { subscription, tenant, recentPayments } = billingData
  const subscriptionPlan = plans.find(p => p.id === subscription?.plan)
  const daysRemaining = subscription?.currentPeriodEnd 
    ? getDaysRemaining(subscription.currentPeriodEnd)
    : tenant.trialEndsAt 
      ? getDaysRemaining(tenant.trialEndsAt)
      : 0

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6 font-sans" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Current Subscription — dark plan card */}
      {subscription && (
        <DsCard className="card-dark" padding="22px" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <MonoLabel size={10} spacing="0.1em" color="rgba(247,246,243,0.55)">Current plan</MonoLabel>
            <div style={{ fontSize: 22, fontWeight: 300, marginTop: 6 }}>
              {subscriptionPlan?.name || 'Basic'} — {formatCurrency(subscription.amount, subscription.currency)}/{subscription.billingCycle === 'yearly' ? 'year' : 'month'}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(247,246,243,0.55)', marginTop: 3 }}>
              Renews {formatDate(subscription.currentPeriodEnd)} · {daysRemaining} days remaining · {subscription.status}
            </div>
          </div>
          <button
            onClick={() => openBillingModal('upgrade')}
            style={{ height: 36, padding: '0 16px', background: '#F7F6F3', color: '#1A1916', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', flex: 'none' }}
          >
            Manage plan
          </button>
        </DsCard>
      )}

      {/* Quick Actions */}
      {subscription && subscription.status !== 'TRIAL' && (
        <DsCard padding="18px 22px">
          <div style={{ fontSize: 14.5, fontWeight: 500, marginBottom: 12 }}>Manage subscription</div>
          <div className="flex flex-wrap gap-3">
            <button className="ds-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={() => openBillingModal('upgrade')}>
              <Star size={14} strokeWidth={1.7} />
              Change plan
            </button>
            <button className="ds-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={() => openBillingModal('advance')}>
              <Calendar size={14} strokeWidth={1.7} />
              Pay in advance
            </button>
            <button className="ds-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={() => openBillingModal('renew')}>
              <Clock size={14} strokeWidth={1.7} />
              Renew early
            </button>
          </div>
        </DsCard>
      )}

      {/* Trial Warning */}
      {subscription?.status === 'TRIAL' && daysRemaining <= 7 && (
        <Card className="rounded-xl border-border" style={{ backgroundColor: 'var(--amber-bg)' }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium" style={{ color: 'var(--amber)' }}>Trial Ending Soon</h4>
                <p className="text-sm mt-1" style={{ color: 'var(--amber)' }}>
                  Your trial ends in {daysRemaining} days. Upgrade now to keep your data.
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-amber-bg hover:bg-amber-bg"
                onClick={() => openBillingModal('upgrade')}
              >
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment methods */}
      <DsCard padding="20px 22px">
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>Payment methods</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Pay for your subscription with any supported method</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          {paymentMethods.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border-inner)', borderRadius: 10, padding: '10px 14px' }}>
              <img src={m.icon} alt={m.label} style={{ height: 18 }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>{m.label}</span>
            </div>
          ))}
        </div>
      </DsCard>

      {/* Payment History */}
      <DsCard padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, padding: '18px 22px' }}>Payment history</div>
        {recentPayments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 22px', borderTop: '1px solid var(--row-sep)' }}>
            <CreditCard className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No payments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="ds-thead" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', padding: '10px 22px', borderTop: '1px solid var(--row-sep)' }}>
              <span>Invoice</span>
              <span>Date</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {recentPayments.map((payment) => (
              <div key={payment.id} className="ds-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', alignItems: 'center', padding: '13px 22px' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-tertiary)' }}>{payment.invoiceNumber || payment.id.slice(0, 8)}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(payment.createdAt)}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--text-primary)' }}>{formatCurrency(payment.amount, payment.currency)}</span>
                <span>
                  <DsBadge variant={payment.status === 'success' ? 'green' : payment.status === 'pending' ? 'amber' : 'red'}>
                    {payment.status === 'success' ? 'Paid' : payment.status === 'pending' ? 'Pending' : 'Failed'}
                  </DsBadge>
                </span>
              </div>
            ))}
          </div>
        )}
      </DsCard>

      {/* ============================================ */}
      {/* STRIPE-STYLE BILLING MODAL */}
      {/* ============================================ */}
      <Dialog open={showBillingModal} onOpenChange={setShowBillingModal}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--surface2)' }}>
          {/* Success State */}
          {paymentState === 'success' && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--green-bg)' }}>
                <Check className="h-10 w-10" style={{ color: 'var(--green)' }} />
              </div>
              <h2 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Payment Successful</h2>
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Your subscription has been activated.</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Redirecting...</p>
            </div>
          )}

          {/* Failed State */}
          {paymentState === 'failed' && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--red-bg)' }}>
                <AlertTriangle className="h-10 w-10" style={{ color: 'var(--red)' }} />
              </div>
              <h2 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Payment Failed</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{paymentError || 'Something went wrong with your payment.'}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setShowBillingModal(false)}>
                  Cancel
                </Button>
                <Button
                  style={{ backgroundColor: 'var(--accent)' }}
                  onClick={() => {
                    setPaymentState('idle')
                    setPaymentError('')
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {paymentState === 'processing' && (
            <div className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6" style={{ color: 'var(--accent)' }} />
              <h2 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Processing Payment</h2>
              {paymentInstructions ? (
                <div className="border rounded-lg p-4 mt-4 text-left" style={{ backgroundColor: 'var(--green-bg)', borderColor: 'var(--green)' }}>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 mt-0.5" style={{ color: 'var(--green)' }} />
                    <div>
                      <p className="font-medium" style={{ color: 'var(--green)' }}>Payment Request Sent!</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--green)' }}>{paymentInstructions}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>Please wait while we process your payment...</p>
              )}
            </div>
          )}

          {/* Idle State - Main Form */}
          {paymentState === 'idle' && (
            <>
              {/* Header */}
              <div className="px-6 py-5 border-b border-border" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                      {dialogMode === 'upgrade' && 'Complete your subscription'}
                      {dialogMode === 'advance' && 'Pay in Advance'}
                      {dialogMode === 'renew' && 'Renew your subscription'}
                    </DialogTitle>
                    <DialogDescription className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Plan: {currentPlan.name} – {formatCurrency(paymentAmount, selectedCurrency)} / {selectedBillingCycle}
                    </DialogDescription>
                  </div>
                  <button 
                    onClick={() => setShowBillingModal(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
                  >
                    <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Plan Selection - Only for upgrade mode */}
                {dialogMode === 'upgrade' && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block" style={{ color: 'var(--text-secondary)' }}>Select Plan</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {plans.map((plan) => {
                        const price = selectedBillingCycle === 'yearly' 
                          ? plan.pricing.yearly[selectedCurrency]
                          : plan.pricing.monthly[selectedCurrency]
                        const isSelected = selectedPlan === plan.id

                        return (
                          <Card
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={`cursor-pointer transition-all rounded-xl border-2 ${
                              isSelected ? 'border-border' : 'border-transparent hover:border-border'
                            }`}
                            style={isSelected ? { backgroundColor: 'var(--surface)', borderColor: 'var(--accent)' } : { backgroundColor: 'var(--surface)' }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{plan.name}</h4>
                                {plan.popular && <Badge className="bg-indigo-100 text-indigo-700 border-0">Popular</Badge>}
                              </div>
                              <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(price, selectedCurrency)}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{plan.description}</p>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Advance Payment Months */}
                {dialogMode === 'advance' && (
                  <div className="border border-border rounded-xl p-4" style={{ backgroundColor: 'var(--blue-bg)' }}>
                    <Label className="text-sm font-medium mb-3 block" style={{ color: 'var(--blue)' }}>How many months would you like to pre-pay?</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[3, 6, 12].map((months) => {
                        const plan = plans.find(p => p.id === selectedPlan)
                        const monthlyPrice = plan?.pricing.monthly[selectedCurrency] || 0
                        const totalPrice = monthlyPrice * months
                        const savings = months === 12 ? Math.round(totalPrice * 0.10) : months === 6 ? Math.round(totalPrice * 0.05) : 0
                        
                        return (
                          <button
                            key={months}
                            onClick={() => setAdvanceMonths(months)}
                            className="p-4 rounded-xl text-center transition-all"
                            style={{
                              backgroundColor: 'var(--surface)',
                              outline: advanceMonths === months ? '2px solid var(--accent)' : 'none'
                            }}
                          >
                            <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{months}</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>months</p>
                            <p className="text-lg font-medium mt-2" style={{ color: 'var(--accent)' }}>{formatCurrency(totalPrice - savings, selectedCurrency)}</p>
                            {savings > 0 && (
                              <Badge className="mt-1 border-0" style={{ backgroundColor: 'var(--green-bg)', color: 'var(--green)' }}>Save {formatCurrency(savings, selectedCurrency)}</Badge>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Billing Cycle */}
                {dialogMode === 'upgrade' && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block" style={{ color: 'var(--text-secondary)' }}>Billing Cycle</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedBillingCycle('monthly')}
                        className="p-4 rounded-xl text-left transition-all"
                        style={{
                          backgroundColor: 'var(--surface)',
                          outline: selectedBillingCycle === 'monthly' ? '2px solid var(--accent)' : '1px solid var(--border)'
                        }}
                      >
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Monthly</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pay each month</p>
                      </button>
                      <button
                        onClick={() => setSelectedBillingCycle('yearly')}
                        className="p-4 rounded-xl text-left transition-all"
                        style={{
                          backgroundColor: 'var(--surface)',
                          outline: selectedBillingCycle === 'yearly' ? '2px solid var(--accent)' : '1px solid var(--border)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Yearly</p>
                          <Badge className="border-0" style={{ backgroundColor: 'var(--green-bg)', color: 'var(--green)' }}>Save 17%</Badge>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pay annually</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Payment Method Selection - Using Tabs */}
                <div>
                  <Label className="text-sm font-medium mb-3 block" style={{ color: 'var(--text-secondary)' }}>Payment Method</Label>
                  <Tabs value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="w-full">
                    <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto p-1 rounded-xl gap-1" style={{ backgroundColor: 'var(--surface2)' }}>
                      {paymentMethods.map((method) => (
                        <TabsTrigger 
                          key={method.id} 
                          value={method.id}
                          className="flex flex-col items-center py-2 px-1 data-[state=active]:bg-[var(--surface)] rounded-lg"
                        >
                          <img src={method.icon} alt={method.label} className="w-7 h-7 mb-1" />
                          <span className="text-[10px] font-medium text-center leading-tight">{method.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* Dynamic Payment Form Based on Selected Method */}
                    {paymentMethods.map((method) => (
                      <TabsContent key={method.id} value={method.id} className="mt-4">
                        <Card className="rounded-xl border-border">
                          <CardContent className="p-4 space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-border">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${method.gradient} flex items-center justify-center overflow-hidden`}>
                                <img src={method.icon} alt={method.label} className="w-8 h-8" />
                              </div>
                              <div>
                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{method.label}</p>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{method.description}</p>
                              </div>
                              {webPaymentMethods.includes(method.id) && (
                                <Badge variant="outline" className="ml-auto text-xs">
                                  Redirects to Paynow
                                </Badge>
                              )}
                            </div>

                            {/* Dynamic Fields - or info message for web payments */}
                            {method.fields.length > 0 ? (
                              method.fields.map((field) => (
                                <div key={field.name}>
                                  <Label htmlFor={field.name} className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                                    {field.label}
                                  </Label>
                                  {field.type === 'file' ? (
                                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center transition-colors">
                                      <input
                                      type="file"
                                      accept={field.accept}
                                      onChange={(e) => setPopFile(e.currentTarget.files?.[0] || null)}
                                      className="hidden"
                                      id={field.name}
                                    />
                                    <label htmlFor={field.name} className="cursor-pointer">
                                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{popFile?.name || 'Click to upload'}</p>
                                      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>PNG, JPG, or PDF (max 5MB)</p>
                                    </label>
                                  </div>
                                ) : (
                                  <Input
                                    id={field.name}
                                    type={field.type}
                                    value={formData[field.name] || ''}
                                    onChange={(e) => setFormData(prev => ({ 
                                      ...prev, 
                                      [field.name]: field.type === 'tel' 
                                        ? e.target.value.replace(/\D/g, '') 
                                        : e.target.value 
                                    }))}
                                    placeholder={field.placeholder}
                                    maxLength={field.maxLength}
                                    className="h-12 text-lg rounded-xl border-border"
                                  />
                                )}
                              </div>
                              ))
                            ) : (
                              // Web payment methods - no fields needed, show info
                              <div className="border rounded-xl p-4" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--border)' }}>
                                <div className="flex items-start gap-3">
                                  <ExternalLink className="h-5 w-5 mt-0.5" style={{ color: 'var(--blue)' }} />
                                  <div>
                                    <p className="font-medium" style={{ color: 'var(--blue)' }}>Secure Payment via Paynow</p>
                                    <p className="text-sm mt-1" style={{ color: 'var(--blue)' }}>
                                      You will be redirected to Paynow&apos;s secure checkout page to complete your payment using {method.label}.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                {/* Error Display */}
                {paymentError && (
                  <div className="p-4 border rounded-xl flex items-start gap-3" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--border)' }}>
                    <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: 'var(--red)' }} />
                    <p className="text-sm" style={{ color: 'var(--red)' }}>{paymentError}</p>
                  </div>
                )}

                {/* Security Note */}
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <Shield className="h-4 w-4" />
                  <span>Your payment is secured by Paynow. We never store your payment details.</span>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total due today</p>
                    <p className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(paymentAmount, selectedCurrency)}</p>
                  </div>
                  <Button 
                    onClick={handleProceed}
                    className="h-12 px-8 text-bg font-medium rounded-xl" style={{ backgroundColor: 'var(--accent)' }}
                  >
                    Proceed to Pay
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* CONFIRMATION ALERT DIALOG */}
      {/* ============================================ */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-center">Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-center space-y-4 pt-4">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${currentMethod.gradient} flex items-center justify-center mx-auto overflow-hidden`}>
                  <img src={currentMethod.icon} alt={currentMethod.label} className="w-12 h-12" />
                </div>
                <div>
                  <p className="text-3xl font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(paymentAmount, selectedCurrency)}</p>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>to TickTrack Pro</p>
                </div>
                <div className="rounded-xl p-4 text-left space-y-2" style={{ backgroundColor: 'var(--surface2)' }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>Plan</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{currentPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>Payment Method</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{currentMethod.label}</span>
                  </div>
                  {dialogMode === 'advance' && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-muted)' }}>Duration</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{advanceMonths} months</span>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePayment}
              className={`rounded-xl bg-gradient-to-r ${currentMethod.gradient} hover:opacity-90`}
            >
              Pay Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
