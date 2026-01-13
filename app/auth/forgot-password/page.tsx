'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ticket, Mail, MessageSquare, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'method' | 'otp' | 'reset' | 'success'>('email')
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<'email' | 'sms'>('email')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  // Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to send OTP')
      }

      setStep('method')
      setSuccess('Account found! Choose how you\'d like to receive your OTP.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Send OTP via selected method
  const handleSendOTP = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          method,
          phone: method === 'sms' ? phone : undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || `Failed to send OTP via ${method}`)
      }

      setStep('otp')
      setSuccess(`OTP sent to your ${method}. It expires in 10 minutes.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Verify OTP and reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp,
          password
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to reset password')
      }

      setStep('success')
      setTimeout(() => router.push('/auth/signin'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Ticket className="h-6 w-6 text-white" />
            </div>
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {step === 'success' ? 'Password Reset' : 'Forgot Password?'}
          </h2>
          <p className="mt-2 text-gray-600">
            {step === 'email' && 'Enter your email to get started'}
            {step === 'method' && 'Choose how to receive your OTP'}
            {step === 'otp' && 'Enter the code and create a new password'}
            {step === 'reset' && 'Create your new password'}
            {step === 'success' && 'Your password has been reset successfully'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200 p-4 rounded-xl"
          >
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{success}</span>
          </motion.div>
        )}

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 h-12"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking email...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        )}

        {/* Step 2: Choose method */}
        {step === 'method' && (
          <div className="space-y-4">
            <div
              onClick={() => setMethod('email')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                method === 'email'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Mail className={`h-5 w-5 ${method === 'email' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{email}</p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setMethod('sms')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                method === 'sms'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className={`h-5 w-5 ${method === 'sms' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <p className="font-medium text-gray-900">SMS</p>
                  {method === 'sms' ? (
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-2 h-10"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">Enter your phone number</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleSendOTP}
              className="w-full h-12 font-medium"
              disabled={loading || (method === 'sms' && !phone)}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                `Send OTP via ${method.toUpperCase()}`
              )}
            </Button>
          </div>
        )}

        {/* Step 3: OTP & Password Reset */}
        {step === 'otp' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                Enter OTP Code
              </Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 h-12 text-center text-2xl tracking-widest font-semibold"
              />
              <p className="text-xs text-gray-500 mt-2">Check your {method} for the 6-digit code</p>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="mt-1 h-12"
              />
              <p className="text-xs text-gray-500 mt-2">
                Must contain uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="mt-1 h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-medium"
              disabled={loading || !otp || !password || !confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <p className="text-gray-600">
              Your password has been reset successfully. Redirecting to sign in...
            </p>
            <Button
              onClick={() => router.push('/auth/signin')}
              variant="outline"
              className="w-full"
            >
              Go to Sign In
            </Button>
          </motion.div>
        )}

        {/* Back to sign in */}
        {step !== 'success' && (
          <Link
            href="/auth/signin"
            className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        )}
      </motion.div>
    </div>
  )
}
