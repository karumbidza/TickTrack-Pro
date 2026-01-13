'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Home,
  CreditCard
} from 'lucide-react'

type PaymentStatus = 'checking' | 'success' | 'failed' | 'pending' | 'unknown'

function PaymentReturnContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<PaymentStatus>('checking')
  const [message, setMessage] = useState('Verifying your payment...')
  const [reference, setReference] = useState<string>('')

  useEffect(() => {
    verifyPayment()
  }, [])

  const verifyPayment = async () => {
    // Get reference from URL
    const ref = searchParams.get('reference')
    const paynowRef = searchParams.get('paynowreference')
    
    if (!ref && !paynowRef) {
      setStatus('unknown')
      setMessage('No payment reference found')
      return
    }

    setReference(ref || paynowRef || '')

    try {
      // Wait a bit for webhook to process
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Check payment status via API
      const response = await fetch(`/api/billing/paynow/verify?reference=${ref || paynowRef}`)
      const data = await response.json()

      if (data.status === 'success' || data.paid) {
        setStatus('success')
        setMessage('Your payment has been confirmed!')
      } else if (data.status === 'failed') {
        setStatus('failed')
        setMessage(data.message || 'Payment failed. Please try again.')
      } else if (data.status === 'pending') {
        setStatus('pending')
        setMessage('Your payment is being processed. This may take a few minutes.')
      } else {
        setStatus('unknown')
        setMessage('Unable to verify payment status')
      }
    } catch (error) {
      console.error('Payment verification error:', error)
      setStatus('unknown')
      setMessage('Unable to verify payment. Please check your billing dashboard.')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-20 w-20 text-blue-500 animate-spin mx-auto" />
      case 'success':
        return (
          <div className="relative inline-flex mx-auto">
            <div className="absolute inset-0 bg-green-100 rounded-full scale-150 opacity-50 animate-pulse"></div>
            <CheckCircle className="relative h-20 w-20 text-green-500" />
          </div>
        )
      case 'failed':
        return <XCircle className="h-20 w-20 text-red-500 mx-auto" />
      case 'pending':
        return <AlertCircle className="h-20 w-20 text-yellow-500 mx-auto" />
      default:
        return <AlertCircle className="h-20 w-20 text-gray-400 mx-auto" />
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Payment Successful</Badge>
      case 'failed':
        return <Badge variant="destructive">Payment Failed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>
      case 'checking':
        return <Badge variant="secondary">Verifying...</Badge>
      default:
        return <Badge variant="outline">Unknown Status</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-4">
          <div className="mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl mb-2">Payment Status</CardTitle>
          <div className="flex justify-center">
            {getStatusBadge()}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Message */}
          <div className="text-center">
            <p className="text-lg text-gray-700">{message}</p>
            {reference && (
              <p className="text-sm text-gray-500 mt-2">
                Reference: <span className="font-mono">{reference}</span>
              </p>
            )}
          </div>

          {/* Success State */}
          {status === 'success' && (
            <div className="space-y-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="space-y-2 text-sm text-green-800">
                <p className="font-medium">✓ Payment processed successfully</p>
                <p className="font-medium">✓ Subscription activated</p>
                <p className="font-medium">✓ Invoice will be sent to your email</p>
              </div>
            </div>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <div className="space-y-3 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <p className="font-medium">Common reasons for payment failure:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Insufficient funds in mobile money account</li>
                <li>Payment cancelled or timed out</li>
                <li>Incorrect PIN entered</li>
                <li>Network connection issues</li>
              </ul>
              <p className="mt-3">Please try again or contact your mobile money provider for assistance.</p>
            </div>
          )}

          {/* Pending State */}
          {status === 'pending' && (
            <div className="space-y-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-medium">What happens next?</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Your payment is being verified</li>
                <li>You will receive a confirmation SMS</li>
                <li>Your subscription will activate automatically</li>
                <li>Usually takes 1-5 minutes</li>
              </ul>
              <p className="mt-3">You can close this page and check your billing dashboard shortly.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {status === 'success' && (
              <>
                <Button 
                  onClick={() => router.push('/admin/settings?tab=billing')}
                  className="flex-1 gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  View Billing
                </Button>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </>
            )}

            {status === 'failed' && (
              <>
                <Button 
                  onClick={() => router.push('/admin/settings?tab=billing')}
                  className="flex-1 gap-2"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
              </>
            )}

            {status === 'pending' && (
              <>
                <Button 
                  onClick={verifyPayment}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Loader2 className="h-4 w-4" />
                  Check Again
                </Button>
                <Button 
                  onClick={() => router.push('/admin/settings?tab=billing')}
                  className="flex-1 gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Billing Dashboard
                </Button>
              </>
            )}

            {(status === 'checking' || status === 'unknown') && (
              <Button 
                onClick={() => router.push('/admin/settings?tab=billing')}
                variant="outline"
                className="w-full gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Billing
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              Need help? Contact support at{' '}
              <a href="mailto:billing@ticktrackpro.com" className="text-blue-600 hover:underline">
                billing@ticktrackpro.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-16 w-16 mx-auto text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentReturnContent />
    </Suspense>
  )
}
