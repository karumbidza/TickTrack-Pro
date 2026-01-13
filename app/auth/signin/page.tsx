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
      
      if (role === 'SUPER_ADMIN') {
        router.push('/super-admin')
      } else if (['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(role)) {
        router.push('/admin')
      } else if (role === 'CONTRACTOR') {
        router.push('/contractor')
      } else {
        router.push('/dashboard')
      }
    }
  }, [session, status, router])

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }
    
    setResendingEmail(true)
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      if (response.ok) {
        setSuccessMessage('Verification email sent! Please check your inbox.')
        setError('')
      } else {
        setError('Failed to send verification email')
      }
    } catch (err) {
      setError('Failed to send verification email')
    } finally {
      setResendingEmail(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        const errorMessage = result.error
        
        if (errorMessage.includes('PENDING_APPROVAL:')) {
          setError('Your account is pending administrator approval. You will receive an email once approved.')
        } else if (errorMessage.includes('EMAIL_PENDING:')) {
          setError('Please check your email and click the activation link to complete your account setup.')
        } else if (errorMessage.includes('SUSPENDED:')) {
          setError('Your account has been suspended. Please contact your administrator.')
        } else if (errorMessage.includes('DEACTIVATED:')) {
          setError('Your account has been deactivated. Please contact your administrator.')
        } else {
          setError('Invalid email or password')
        }
      } else {
        const session = await getSession()
        if (session?.user) {
          const { role } = session.user
          
          if (role === 'SUPER_ADMIN') {
            router.push('/super-admin')
          } else if (['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN'].includes(role)) {
            router.push('/admin')
          } else if (role === 'CONTRACTOR') {
            router.push('/contractor')
          } else {
            router.push('/dashboard')
          }
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    { icon: Zap, title: 'Fast Resolution', description: 'Resolve tickets 50% faster' },
    { icon: Users, title: 'Team Collaboration', description: 'Work together seamlessly' },
    { icon: BarChart3, title: 'Smart Analytics', description: 'Data-driven insights' },
    { icon: Shield, title: 'Enterprise Security', description: 'Bank-level protection' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, white 2px, transparent 0)`,
            backgroundSize: '50px 50px'
          }} />
        </div>
        
        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Ticket className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold">TickTrack Pro</span>
          </Link>
        </div>

        {/* Hero Content */}
        <div className="relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold text-white mb-6"
          >
            Welcome back to your
            <span className="block text-blue-400">help desk command center</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-white/70 mb-12"
          >
            Manage tickets, assets, contractors, and more — all in one place.
          </motion.p>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10"
              >
                <feature.icon className="h-6 w-6 text-blue-400 mb-2" />
                <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                <p className="text-white/60 text-xs">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-white/40 text-sm">
          © 2026 TickTrack Pro. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gray-50">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-900">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">TickTrack Pro</span>
            </Link>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Sign in to your account
            </h2>
            <p className="text-gray-600">
              Enter your credentials to access your dashboard
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-3 text-green-700 bg-green-50 border border-green-200 p-4 rounded-xl"
            >
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{successMessage}</span>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start gap-3 text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm">{error}</span>
                {error.includes('expired') && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="block mt-2 text-sm font-medium text-red-600 hover:text-red-700 underline"
                  >
                    {resendingEmail ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </Label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10 h-12 bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 h-12 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <span className="text-gray-600">New to TickTrack Pro? </span>
            <Link href="/get-started" className="text-blue-600 hover:text-blue-700 font-medium">
              Create an account
            </Link>
          </div>

          {/* Resend Verification */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingEmail || !email}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {resendingEmail ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending...
                </span>
              ) : (
                <>
                  <Mail className="inline-block h-4 w-4 mr-1" />
                  Resend verification email
                </>
              )}
            </button>
          </div>

          {/* Mobile Footer */}
          <p className="mt-8 text-center text-xs text-gray-500 lg:hidden">
            © 2026 TickTrack Pro. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}