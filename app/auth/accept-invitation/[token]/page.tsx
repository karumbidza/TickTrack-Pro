'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, CheckCircle, XCircle, Loader2, AlertCircle, Clock } from 'lucide-react'

interface InvitationData {
  id: string
  email: string
  name: string | null
  expiresAt: string
  invitedBy: string
}

interface TenantData {
  id: string
  name: string
  logo: string | null
}

export default function AcceptInvitationPage({ params }: { params: { token: string } }) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const router = useRouter()

  useEffect(() => {
    validateToken()
  }, [params.token])

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/accept-invitation/${params.token}`)
      const data = await response.json()

      if (data.valid) {
        setInvitation(data.invitation)
        setTenant(data.tenant)
        setFormData(prev => ({
          ...prev,
          email: data.invitation.email,
          name: data.invitation.name || ''
        }))
      } else {
        setError(data.error || 'Invalid invitation')
      }
    } catch (err) {
      setError('Failed to validate invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/auth/accept-invitation/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to accept invitation')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-ds-blue mx-auto" />
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: 'var(--bg)' }}>
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4" style={{ backgroundColor: 'var(--red-bg)' }}>
                <XCircle className="h-10 w-10" style={{ color: 'var(--red)' }} />
              </div>
              <h2 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                Invalid Invitation
              </h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{error}</p>
              <Button onClick={() => router.push('/auth/signin')} className="w-full">
                Go to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: 'var(--bg)' }}>
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4" style={{ backgroundColor: 'var(--green-bg)' }}>
                <Clock className="h-10 w-10" style={{ color: 'var(--green)' }} />
              </div>
              <h2 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                Request Submitted!
              </h2>
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                Your account request has been sent to the administrator at <strong>{tenant?.name}</strong>.
              </p>
              <div className="border rounded-lg p-4 mb-6 text-left" style={{ backgroundColor: 'var(--blue-bg)', borderColor: 'var(--border)' }}>
                <h3 className="font-medium mb-2" style={{ color: 'var(--blue)' }}>What happens next?</h3>
                <ol className="text-sm space-y-2 list-decimal list-inside" style={{ color: 'var(--blue)' }}>
                  <li>An administrator will review your request</li>
                  <li>They will assign your role and site/branch</li>
                  <li>You'll receive an email to verify and set your password</li>
                  <li>After verification, you can log in</li>
                </ol>
              </div>
              <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {tenant?.logo ? (
            <img src={tenant.logo} alt={tenant.name} className="h-16 mx-auto mb-4" />
          ) : (
            <div className="flex justify-center">
              <UserPlus className="h-12 w-12" style={{ color: 'var(--accent)' }} />
            </div>
          )}
          <h2 className="mt-6 text-3xl font-medium" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>
            Join {tenant?.name}
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            You've been invited by <strong>{invitation?.invitedBy}</strong>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Fill in your details to request access. An administrator will review and approve your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  disabled
                  style={{ backgroundColor: 'var(--surface2)' }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This email was specified in your invitation
                </p>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+263 77 123 4567"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For SMS notifications about your tickets
                </p>
              </div>

              <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--amber-bg)', borderColor: 'var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--amber)' }}>
                  <strong>Note:</strong> You will set your password after an administrator approves your account and you verify your email.
                </p>
              </div>

              {error && (
                <div className="border rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--border)' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--red)' }} />
                  <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/auth/signin" style={{ color: 'var(--accent)' }} className="hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
