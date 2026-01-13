'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Phone,
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Banknote,
  Building2,
  ArrowRight,
  Shield,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'

interface PaymentMethod {
  id: string
  name: string
  icon: string
  type: 'mobile_money' | 'card' | 'bank'
  description?: string
  popular?: boolean
}

interface PaynowPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: string
  billingCycle: 'monthly' | 'yearly'
  amount: number
  currency?: string
  onSuccess?: () => void
  onCancel?: () => void
}

type PaymentStatus = 'idle' | 'processing' | 'awaiting_payment' | 'polling' | 'success' | 'failed' | 'cancelled'

export function PaynowPaymentDialog({
  open,
  onOpenChange,
  plan,
  billingCycle,
  amount,
  currency = 'USD',
  onSuccess,
  onCancel
}: PaynowPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('ecocash')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [pollUrl, setPollUrl] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [instructions, setInstructions] = useState<string>('')

  const paymentMethods: PaymentMethod[] = [
    { 
      id: 'ecocash', 
      name: 'EcoCash', 
      icon: '💚', 
      type: 'mobile_money',
      description: 'Pay with your Econet mobile money',
      popular: true
    },
    { 
      id: 'onemoney', 
      name: 'OneMoney', 
      icon: '🔵', 
      type: 'mobile_money',
      description: 'Pay with your NetOne mobile money'
    },
    { 
      id: 'innbucks', 
      name: 'InnBucks', 
      icon: '🟡', 
      type: 'mobile_money',
      description: 'Pay with InnBucks wallet'
    },
    { 
      id: 'telecash', 
      name: 'Telecash', 
      icon: '🔴', 
      type: 'mobile_money',
      description: 'Pay with Telecel mobile money'
    }
  ]

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // Wait a bit before resetting to allow animation
      setTimeout(() => {
        setStatus('idle')
        setStatusMessage('')
        setPollUrl(null)
        setInstructions('')
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
      }, 300)
    }
  }, [open])

  const formatPhoneNumber = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format for Zimbabwe numbers
    if (digits.startsWith('263')) {
      return digits.slice(0, 12) // 263XXXXXXXXX
    } else if (digits.startsWith('0')) {
      return digits.slice(0, 10) // 07XXXXXXXX
    }
    return digits.slice(0, 10)
  }

  const validatePhoneNumber = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '')
    
    // Zimbabwe mobile formats
    if (digits.startsWith('263')) {
      return digits.length === 12
    }
    if (digits.startsWith('07')) {
      return digits.length === 10
    }
    return false
  }

  const normalizePhoneNumber = (phone: string): string => {
    const digits = phone.replace(/\D/g, '')
    
    // Convert to international format
    if (digits.startsWith('0')) {
      return '263' + digits.slice(1)
    }
    return digits
  }

  const initiatePayment = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid Zimbabwe phone number (e.g., 0771234567)')
      return
    }

    setStatus('processing')
    setStatusMessage('Initiating payment...')

    try {
      const response = await fetch('/api/billing/paynow/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billingCycle,
          amount,
          currency,
          paymentMethod,
          phone: normalizePhoneNumber(phoneNumber)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment')
      }

      if (data.success) {
        setPollUrl(data.pollUrl)
        setInstructions(data.instructions || getDefaultInstructions(paymentMethod))
        setStatus('awaiting_payment')
        setStatusMessage('Payment request sent to your phone')
        
        // Start polling for payment status
        startPolling(data.pollUrl, data.paymentId)
      } else {
        throw new Error(data.error || 'Payment initiation failed')
      }
    } catch (error) {
      console.error('Payment initiation error:', error)
      setStatus('failed')
      setStatusMessage(error instanceof Error ? error.message : 'Failed to initiate payment')
      toast.error('Failed to initiate payment. Please try again.')
    }
  }

  const getDefaultInstructions = (method: string): string => {
    const methodName = paymentMethods.find(m => m.id === method)?.name || 'your mobile money'
    return `A payment request has been sent to your ${methodName} number. Please check your phone and approve the payment.`
  }

  const startPolling = (url: string, paymentId: string) => {
    setStatus('polling')
    
    let attempts = 0
    const maxAttempts = 60 // 5 minutes (every 5 seconds)
    
    const interval = setInterval(async () => {
      attempts++
      
      if (attempts > maxAttempts) {
        clearInterval(interval)
        setPollingInterval(null)
        setStatus('failed')
        setStatusMessage('Payment timed out. Please try again.')
        return
      }

      try {
        const response = await fetch(`/api/billing/paynow/status?paymentId=${paymentId}`)
        const data = await response.json()

        if (data.status === 'success' || data.paid) {
          clearInterval(interval)
          setPollingInterval(null)
          setStatus('success')
          setStatusMessage('Payment successful!')
          
          // Notify parent component
          setTimeout(() => {
            onSuccess?.()
            onOpenChange(false)
          }, 2000)
        } else if (data.status === 'failed') {
          clearInterval(interval)
          setPollingInterval(null)
          setStatus('failed')
          setStatusMessage(data.message || 'Payment failed')
        } else if (data.status === 'cancelled') {
          clearInterval(interval)
          setPollingInterval(null)
          setStatus('cancelled')
          setStatusMessage('Payment was cancelled')
        }
        // Otherwise, continue polling (status is still 'pending')
      } catch (error) {
        console.error('Polling error:', error)
        // Don't stop polling on network errors, just log
      }
    }, 5000) // Poll every 5 seconds

    setPollingInterval(interval)
  }

  const handleCancel = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    onCancel?.()
    onOpenChange(false)
  }

  const handleRetry = () => {
    setStatus('idle')
    setStatusMessage('')
    setPollUrl(null)
    setInstructions('')
  }

  const renderPaymentForm = () => (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{plan} Plan</h4>
              <p className="text-sm text-gray-500 capitalize">{billingCycle} billing</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {currency === 'USD' ? '$' : 'ZWL '}{amount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {billingCycle === 'yearly' && 'Billed annually'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">Select Payment Method</Label>
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-3">
          {paymentMethods.map((method) => (
            <Label
              key={method.id}
              htmlFor={method.id}
              className={`relative flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                paymentMethod === method.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
              <span className="text-2xl">{method.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{method.name}</span>
                  {method.popular && (
                    <Badge variant="secondary" className="text-xs">Popular</Badge>
                  )}
                </div>
              </div>
              {paymentMethod === method.id && (
                <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
              )}
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Phone Number Input */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
          Mobile Number
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="phone"
            type="tel"
            placeholder="0771234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-gray-500">
          Enter your {paymentMethods.find(m => m.id === paymentMethod)?.name} registered number
        </p>
      </div>

      {/* Security Note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
        <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-800">
          <p className="font-medium">Secure Payment</p>
          <p className="text-green-700">
            Your payment is processed securely through Paynow Zimbabwe.
          </p>
        </div>
      </div>
    </div>
  )

  const renderProcessingState = () => (
    <div className="py-12 text-center space-y-4">
      {status === 'processing' && (
        <>
          <Loader2 className="h-16 w-16 mx-auto text-blue-500 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900">{statusMessage}</h3>
          <p className="text-sm text-gray-500">Please wait while we connect to Paynow...</p>
        </>
      )}

      {(status === 'awaiting_payment' || status === 'polling') && (
        <>
          <div className="relative">
            <Smartphone className="h-20 w-20 mx-auto text-blue-500" />
            <div className="absolute -top-1 -right-1 w-full h-full flex items-center justify-center">
              <span className="flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500 items-center justify-center">
                  <Zap className="h-3 w-3 text-white" />
                </span>
              </span>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Check Your Phone</h3>
          <p className="text-sm text-gray-600 max-w-sm mx-auto">{instructions}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Waiting for payment confirmation...</span>
          </div>
          <p className="text-xs text-gray-400">
            Phone number: {phoneNumber}
          </p>
        </>
      )}
    </div>
  )

  const renderResultState = () => (
    <div className="py-12 text-center space-y-4">
      {status === 'success' && (
        <>
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-green-100 rounded-full scale-150 opacity-50 animate-pulse"></div>
            <CheckCircle className="relative h-20 w-20 text-green-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Payment Successful!</h3>
          <p className="text-sm text-gray-600">
            Your {plan} subscription is now active.
          </p>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Thank you for your payment
          </Badge>
        </>
      )}

      {status === 'failed' && (
        <>
          <XCircle className="h-20 w-20 mx-auto text-red-500" />
          <h3 className="text-lg font-medium text-gray-900">Payment Failed</h3>
          <p className="text-sm text-gray-600 max-w-sm mx-auto">{statusMessage}</p>
          <div className="flex gap-3 justify-center mt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleRetry}>
              Try Again
            </Button>
          </div>
        </>
      )}

      {status === 'cancelled' && (
        <>
          <AlertCircle className="h-20 w-20 mx-auto text-yellow-500" />
          <h3 className="text-lg font-medium text-gray-900">Payment Cancelled</h3>
          <p className="text-sm text-gray-600">{statusMessage}</p>
          <div className="flex gap-3 justify-center mt-4">
            <Button variant="outline" onClick={handleCancel}>
              Close
            </Button>
            <Button onClick={handleRetry}>
              Try Again
            </Button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value && (status === 'processing' || status === 'awaiting_payment' || status === 'polling')) {
        // Confirm before closing during payment
        if (!confirm('Payment is in progress. Are you sure you want to cancel?')) {
          return
        }
      }
      onOpenChange(value)
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            {status === 'idle' ? 'Complete Payment' : 
             status === 'success' ? 'Payment Complete' : 
             status === 'failed' || status === 'cancelled' ? 'Payment Status' :
             'Processing Payment'}
          </DialogTitle>
          {status === 'idle' && (
            <DialogDescription>
              Pay securely with Paynow mobile money
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-2">
          {status === 'idle' && renderPaymentForm()}
          {(status === 'processing' || status === 'awaiting_payment' || status === 'polling') && renderProcessingState()}
          {(status === 'success' || status === 'failed' || status === 'cancelled') && renderResultState()}
        </div>

        {status === 'idle' && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={initiatePayment}
              disabled={!phoneNumber || !validatePhoneNumber(phoneNumber)}
              className="gap-2"
            >
              Pay {currency === 'USD' ? '$' : 'ZWL '}{amount.toFixed(2)}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        )}

        {(status === 'awaiting_payment' || status === 'polling') && (
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel Payment
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default PaynowPaymentDialog
