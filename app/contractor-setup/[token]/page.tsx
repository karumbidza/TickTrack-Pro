'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

export default function ContractorSetupPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [valid, setValid] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tenant, setTenant] = useState<{ name: string; logo?: string } | null>(null)
  const [companyInfo, setCompanyInfo] = useState<{ companyName: string; companyEmail: string } | null>(null)
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/contractor-setup/${token}`)
      const data = await response.json()
      
      if (data.valid) {
        setValid(true)
        setTenant(data.tenant)
        setCompanyInfo(data.kyc)
      } else {
        setError(data.message || 'Invalid setup link')
      }
    } catch (err) {
      setError('Failed to validate setup link')
    } finally {
      setLoading(false)
    }
  }

  const validatePassword = () => {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return false
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return false
    }
    // Check for at least one uppercase, one lowercase, one number
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      toast.error('Password must contain uppercase, lowercase, and numbers')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePassword()) return
    
    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/contractor-setup/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(true)
        toast.success('Account created successfully!')
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      } else {
        toast.error(data.message || 'Failed to create account')
      }
    } catch (err) {
      toast.error('Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h1>
            <p className="text-gray-600 mb-4">
              Your account has been set up successfully. Redirecting to login...
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {tenant?.logo && (
            <img src={tenant.logo} alt={tenant.name} className="h-12 mx-auto mb-4" />
          )}
          <div className="bg-blue-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>Set Up Your Account</CardTitle>
          <CardDescription>
            Create a password for your contractor account at {tenant?.name}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              <strong>Company:</strong> {companyInfo?.companyName}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {companyInfo?.companyEmail}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>Password must:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li className={password.length >= 8 ? 'text-green-600' : ''}>
                  Be at least 8 characters
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                  Contain an uppercase letter
                </li>
                <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                  Contain a lowercase letter
                </li>
                <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                  Contain a number
                </li>
              </ul>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
