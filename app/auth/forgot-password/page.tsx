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
      setSuccess("Account found! Choose how you'd like to receive your OTP.")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOTP = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, method, phone: method === 'sms' ? phone : undefined })
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return }
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password })
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

  const stepLabels: Record<string, string> = {
    email: 'Enter your email to get started',
    method: 'Choose how to receive your OTP',
    otp: 'Enter the code and create a new password',
    reset: 'Create your new password',
    success: 'Your password has been reset successfully',
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 420, width: '100%' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket className="h-5 w-5" style={{ color: 'var(--bg)' }} />
            </div>
          </Link>
          <p className="section-label mt-4 mb-2">{step === 'success' ? 'Password Reset' : 'Forgot Password'}</p>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 8 }}>
            {step === 'success' ? 'All done!' : 'Reset your password'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{stepLabels[step]}</p>
        </div>

        {/* Alert messages */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, backgroundColor: 'var(--red-bg)', marginBottom: 20 }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
            <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, backgroundColor: 'var(--green-bg)', marginBottom: 20 }}>
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--green)' }} />
            <span style={{ fontSize: 13, color: 'var(--green)' }}>{success}</span>
          </motion.div>
        )}

        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Checking email...</> : 'Continue'}
              </Button>
            </form>
          )}

          {/* Step 2: Choose method */}
          {step === 'method' && (
            <div className="space-y-3">
              {[
                { id: 'email' as const, icon: Mail, label: 'Email', sub: email },
                { id: 'sms' as const, icon: MessageSquare, label: 'SMS', sub: 'Enter your phone number' },
              ].map(({ id, icon: Icon, label, sub }) => (
                <div key={id} onClick={() => setMethod(id)} style={{
                  padding: 16, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  border: method === id ? '2px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: method === id ? 'var(--surface2)' : 'var(--surface)',
                }}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5" style={{ color: method === id ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</p>
                      {id === 'sms' && method === 'sms' ? (
                        <Input type="tel" placeholder="+1 (555) 000-0000" value={phone}
                          onChange={(e) => setPhone(e.target.value)} className="mt-2" onClick={(e) => e.stopPropagation()} />
                      ) : (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Button onClick={handleSendOTP} className="w-full gap-2" disabled={loading || (method === 'sms' && !phone)}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Sending OTP...</> : `Send OTP via ${method.toUpperCase()}`}
              </Button>
            </div>
          )}

          {/* Step 3: OTP & Password Reset */}
          {step === 'otp' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <Label htmlFor="otp">OTP Code</Label>
                <Input id="otp" type="text" placeholder="000000" maxLength={6} value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-1.5 text-center font-mono tracking-widest" style={{ fontSize: 20 }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Check your {method} for the 6-digit code</p>
              </div>
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-1.5" />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Must contain uppercase, lowercase, number, and special character
                </p>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !otp || !password || !confirmPassword}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Resetting password...</> : 'Reset Password'}
              </Button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 className="h-6 w-6" style={{ color: 'var(--green)' }} />
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Your password has been reset successfully. Redirecting to sign in...
              </p>
              <Button onClick={() => router.push('/auth/signin')} variant="outline" className="w-full">
                Go to Sign In
              </Button>
            </motion.div>
          )}
        </div>

        {step !== 'success' && (
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <Link href="/auth/signin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}
