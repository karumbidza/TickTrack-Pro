'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Building, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    // Company details
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    industry: '',
    companySize: '',
    
    // Admin user details (NO password - set via activation email)
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    
    // Terms and preferences
    agreeToTerms: false,
    subscribeToUpdates: false,
    customRequirements: ''
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.companyName.trim()) {
      setError('Company name is required')
      return false
    }
    if (!formData.companyEmail.trim() || !formData.companyEmail.includes('@')) {
      setError('Valid company email is required')
      return false
    }
    if (!formData.companySize) {
      setError('Please select company size')
      return false
    }
    if (!formData.adminName.trim()) {
      setError('Admin name is required')
      return false
    }
    if (!formData.adminEmail.trim() || !formData.adminEmail.includes('@')) {
      setError('Valid admin email is required')
      return false
    }
    if (!formData.agreeToTerms) {
      setError('Please accept the terms of service')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) return

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(data.message || 'Registration failed. Please try again.')
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const companySizes = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' }
  ]

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Manufacturing',
    'Retail',
    'Education',
    'Government',
    'Non-profit',
    'Other'
  ]

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="p-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--green-bg)' }}>
                <Mail className="h-8 w-8" style={{ color: 'var(--green)' }} />
              </div>

              <div>
                <h2 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                  Check Your Email!
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  We've sent an activation email to:
                </p>
                <p className="font-medium mt-1" style={{ color: 'var(--accent)' }}>
                  {formData.adminEmail}
                </p>
              </div>

              <div className="rounded-lg p-4 text-left" style={{ backgroundColor: 'var(--blue-bg)' }}>
                <h4 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--blue)' }}>
                  <CheckCircle2 className="h-5 w-5" />
                  Next Steps:
                </h4>
                <ol className="space-y-2 text-sm" style={{ color: 'var(--blue)' }}>
                  <li className="flex gap-2">
                    <span className="font-medium">1.</span>
                    <span>Open the email and click the activation link</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium">2.</span>
                    <span>Create your secure password</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium">3.</span>
                    <span>Sign in and complete setup</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium">4.</span>
                    <span>Start your 30-day free trial!</span>
                  </li>
                </ol>
              </div>

              <div className="pt-4 space-y-3">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Didn't receive the email? Check your spam folder or contact support.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/signin">
                    Go to Sign In
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-medium mb-2" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>
            Start Your Free Trial
          </h1>
          <p className="text-xl" style={{ color: 'var(--text-secondary)' }}>
            Get full access to TickTrack Pro for 30 days. No credit card required.
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Error Message */}
              {error && (
                <div className="border px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--border)', color: 'var(--red)' }}>
                  {error}
                </div>
              )}

              {/* Company Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-border">
                  <Building className="h-6 w-6" style={{ color: 'var(--accent)' }} />
                  <h2 className="text-xl font-medium">Company Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Your Company Ltd."
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="companyEmail">Company Email *</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                      placeholder="hello@company.com"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="companyPhone">Company Phone</Label>
                    <Input
                      id="companyPhone"
                      value={formData.companyPhone}
                      onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                      placeholder="+263 XX XXX XXXX"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <select
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      className="w-full p-2 rounded-md disabled:opacity-50" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                      disabled={loading}
                    >
                      <option value="">Select industry</option>
                      {industries.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="companySize">Company Size *</Label>
                    <select
                      id="companySize"
                      value={formData.companySize}
                      onChange={(e) => handleInputChange('companySize', e.target.value)}
                      className="w-full p-2 rounded-md disabled:opacity-50" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                      disabled={loading}
                    >
                      <option value="">Select size</option>
                      {companySizes.map(size => (
                        <option key={size.value} value={size.value}>{size.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="companyAddress">Company Address</Label>
                    <Textarea
                      id="companyAddress"
                      value={formData.companyAddress}
                      onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                      placeholder="Your company address"
                      rows={2}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Admin Account Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-border">
                  <Mail className="h-6 w-6" style={{ color: 'var(--accent)' }} />
                  <h2 className="text-xl font-medium">Admin Account</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="adminName">Full Name *</Label>
                    <Input
                      id="adminName"
                      value={formData.adminName}
                      onChange={(e) => handleInputChange('adminName', e.target.value)}
                      placeholder="John Doe"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="adminPhone">Phone Number</Label>
                    <Input
                      id="adminPhone"
                      value={formData.adminPhone}
                      onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                      placeholder="+263 XX XXX XXXX"
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="adminEmail">Admin Email *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                      placeholder="admin@company.com"
                      disabled={loading}
                    />
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      We'll send an activation email to set up your password
                    </p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="customRequirements">Custom Requirements (Optional)</Label>
                    <Textarea
                      id="customRequirements"
                      value={formData.customRequirements}
                      onChange={(e) => handleInputChange('customRequirements', e.target.value)}
                      placeholder="Any specific features or customizations your organization needs?"
                      rows={2}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Terms & Trial Info */}
              <div className="space-y-4">
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--blue-bg)' }}>
                  <h4 className="font-medium mb-2" style={{ color: 'var(--blue)' }}>What's included in your 30-day trial:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm" style={{ color: 'var(--blue)' }}>
                    <div>✓ Unlimited tickets and projects</div>
                    <div>✓ Helpdesk & project management</div>
                    <div>✓ Invoice management system</div>
                    <div>✓ Contractor network access</div>
                    <div>✓ Email & SMS notifications</div>
                    <div>✓ No credit card required</div>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked as boolean)}
                    disabled={loading}
                  />
                  <div className="text-sm">
                    <Label htmlFor="agreeToTerms" style={{ color: 'var(--text-secondary)' }}>
                      I agree to the{' '}
                      <Link href="/terms" style={{ color: 'var(--accent)' }} className="hover:underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" style={{ color: 'var(--accent)' }} className="hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="subscribeToUpdates"
                    checked={formData.subscribeToUpdates}
                    onCheckedChange={(checked) => handleInputChange('subscribeToUpdates', checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="subscribeToUpdates" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Subscribe to product updates and tips
                  </Label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-8" style={{ color: 'var(--text-secondary)' }}>
          <p>
            Already have an account?{' '}
            <Link href="/auth/signin" style={{ color: 'var(--accent)' }} className="hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
