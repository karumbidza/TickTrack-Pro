'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, getSession, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Shield,
  Zap,
  Users,
  BarChart3
} from 'lucide-react'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [resendingEmail, setResendingEmail] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    const verified = searchParams.get('verified')
    const errorParam = searchParams.get('error')

    if (verified === 'true') {
      setSuccessMessage('Email verified successfully! You can now sign in.')
    } else if (errorParam === 'token_expired') {
      setError('Verification link has expired. Please request a new one.')
    } else if (errorParam === 'invalid_token') {
      setError('Invalid verification link.')
    } else if (errorParam === 'verification_failed') {
      setError('Email verification failed. Please try again.')
    }
  }, [searchParams])

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const { role } = session.user
      if (role === 'SUPER_ADMIN') router.push('/super-admin')
      else if (['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(role)) router.push('/admin')
      else if (role === 'CONTRACTOR') router.push('/contractor')
      else router.push('/dashboard')
    }
  }, [session, status, router])

  const handleResendVerification = async () => {
    if (!email) { setError('Please enter your email address first'); return }
    setResendingEmail(true)
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (response.ok) { setSuccessMessage('Verification email sent! Please check your inbox.'); setError('') }
      else setError('Failed to send verification email')
    } catch { setError('Failed to send verification email') }
    finally { setResendingEmail(false) }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
          <p style={{ fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const result = await signIn('credentials', { email, password, redirect: false })

      if (result?.error) {
        const msg = result.error
        if (msg.includes('PENDING_APPROVAL:')) setError('Your account is pending administrator approval.')
        else if (msg.includes('EMAIL_PENDING:')) setError('Please check your email and click the activation link.')
        else if (msg.includes('SUSPENDED:')) setError('Your account has been suspended. Contact your administrator.')
        else if (msg.includes('DEACTIVATED:')) setError('Your account has been deactivated. Contact your administrator.')
        else setError('Invalid email or password')
      } else {
        const s = await getSession()
        if (s?.user) {
          const { role } = s.user
          if (role === 'SUPER_ADMIN') router.push('/super-admin')
          else if (['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(role)) router.push('/admin')
          else if (role === 'CONTRACTOR') router.push('/contractor')
          else router.push('/dashboard')
        }
      }
    } catch { setError('An error occurred. Please try again.') }
    finally { setIsLoading(false) }
  }

  const features = [
    { icon: Zap, label: 'Fast Resolution', description: 'Resolve tickets 50% faster' },
    { icon: Users, label: 'Team Collaboration', description: 'Work together seamlessly' },
    { icon: BarChart3, label: 'Smart Analytics', description: 'Data-driven insights' },
    { icon: Shield, label: 'Enterprise Security', description: 'Bank-level protection' },
  ]

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}>
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-5 w-5" style={{ opacity: 0.8 }} />
          <span style={{ fontWeight: 500, fontSize: 16, opacity: 0.9 }}>TickTrack Pro</span>
        </Link>

        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: '1rem', opacity: 0.95 }}
          >
            Welcome back to your <strong>helpdesk command centre</strong>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: 15, opacity: 0.6, marginBottom: '3rem', lineHeight: 1.6 }}
          >
            Manage tickets, assets, contractors, and more — all in one place.
          </motion.p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {features.map(({ icon: Icon, label, description }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                style={{ padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <Icon className="h-5 w-5 mb-2" style={{ opacity: 0.6 }} />
                <p style={{ fontWeight: 500, fontSize: 14, opacity: 0.9, marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 12, opacity: 0.5 }}>{description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, opacity: 0.35 }}>© {new Date().getFullYear()} TickTrack Pro. All rights reserved.</p>
      </div>

      {/* Right Panel — Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12"
        style={{ backgroundColor: 'var(--surface)' }}>
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <Ticket className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
              <span style={{ fontWeight: 500, fontSize: 16, color: 'var(--text-primary)' }}>TickTrack Pro</span>
            </Link>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <p className="section-label mb-3">Sign in</p>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 8 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Enter your credentials to access your dashboard</p>
          </div>

          {successMessage && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, backgroundColor: 'var(--green-bg)', marginBottom: 20 }}>
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--green)' }} />
              <span style={{ fontSize: 13, color: 'var(--green)' }}>{successMessage}</span>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, backgroundColor: 'var(--red-bg)', marginBottom: 20 }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
              <div>
                <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
                {error.includes('expired') && (
                  <button type="button" onClick={handleResendVerification} disabled={resendingEmail}
                    style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--red)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {resendingEmail ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <Input
                  id="email" name="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" className="pl-9"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password">Password</Label>
                <Link href="/auth/forgot-password" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <Input
                  id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" className="pl-9 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in...</> : <>Sign in<ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>New to TickTrack Pro? </span>
            <Link href="/get-started" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Create an account</Link>
          </div>

          <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
            <button type="button" onClick={handleResendVerification} disabled={resendingEmail || !email}
              style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: !email ? 0.4 : 1 }}>
              {resendingEmail ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Sending...</span> : <><Mail className="inline h-3 w-3 mr-1" />Resend verification email</>}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
