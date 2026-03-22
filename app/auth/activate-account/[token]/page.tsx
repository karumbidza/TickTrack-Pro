'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, CheckCircle, XCircle, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface UserData { id: string; name: string; email: string }
interface TenantData { id: string; name: string; logo: string | null }

const passwordRequirements = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[0-9]/, label: 'One number' },
  { regex: /[^A-Za-z0-9]/, label: 'One special character (!@#$%^&*)' }
]

export default function ActivateAccountPage({ params }: { params: { token: string } }) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' })
  const router = useRouter()

  useEffect(() => { validateToken() }, [params.token])

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/activate-account/${params.token}`)
      const data = await response.json()
      if (data.valid) { setUser(data.user); setTenant(data.tenant) }
      else setError(data.error || 'Invalid activation link')
    } catch { setError('Failed to validate activation link') }
    finally { setLoading(false) }
  }

  const passwordStrength = passwordRequirements.map(req => ({ ...req, met: req.regex.test(formData.password) }))
  const allRequirementsMet = passwordStrength.every(req => req.met)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    if (!allRequirementsMet) { setError('Please meet all password requirements'); setSubmitting(false); return }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); setSubmitting(false); return }
    try {
      const response = await fetch(`/api/auth/activate-account/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await response.json()
      if (response.ok) setSuccess(true)
      else setError(data.error || 'Failed to activate account')
    } catch { setError('An error occurred. Please try again.') }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
          <p style={{ fontSize: 14 }}>Validating activation link...</p>
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div style={{ maxWidth: 420, width: '100%', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <XCircle className="h-6 w-6" style={{ color: 'var(--red)' }} />
          </div>
          <p className="section-label mb-2">Error</p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 8 }}>Activation Failed</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</p>
          <Button onClick={() => router.push('/auth/signin')} className="w-full">Go to Sign In</Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div style={{ maxWidth: 420, width: '100%', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle className="h-6 w-6" style={{ color: 'var(--green)' }} />
          </div>
          <p className="section-label mb-2">Success</p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 8 }}>Account Activated!</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Your account at <strong>{tenant?.name}</strong> is now active. You can now log in with your email and password.
          </p>
          <Button onClick={() => router.push('/auth/signin')} className="w-full">Sign In Now</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {tenant?.logo ? (
            <img src={tenant.logo} alt={tenant.name} style={{ height: 48, margin: '0 auto 16px' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Shield className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
          <p className="section-label mb-2">Account Activation</p>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 8 }}>
            Set your password
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Welcome to {tenant?.name}! Complete activation to get started.
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, backgroundColor: 'var(--surface2)' }}>
            <p className="section-label mb-1">Activating account for</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.name}</p>
            <p className="font-mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="password">Password <span style={{ color: 'var(--red)' }}>*</span></Label>
              <div className="relative mt-1.5">
                <Input
                  id="password" type={showPassword ? 'text' : 'password'} required
                  value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Create a strong password" className="pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {passwordStrength.map((req, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      {req.met
                        ? <CheckCircle className="h-3 w-3" style={{ color: 'var(--green)' }} />
                        : <AlertCircle className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />}
                      <span style={{ color: req.met ? 'var(--green)' : 'var(--text-muted)' }}>{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password <span style={{ color: 'var(--red)' }}>*</span></Label>
              <div className="relative mt-1.5">
                <Input
                  id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required
                  value={formData.confirmPassword} onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm your password" className="pr-10"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>Passwords do not match</p>
              )}
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, backgroundColor: 'var(--red-bg)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--red)' }} />
                <p style={{ fontSize: 13, color: 'var(--red)' }}>{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting || !allRequirementsMet}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Activating...</> : 'Activate Account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
