'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Building, Users, CheckCircle, Mail } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Company details
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    industry: '',
    companySize: '',
    
    // Admin user details
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
    
    // Terms and preferences
    agreeToTerms: false,
    subscribeToUpdates: false,
    customRequirements: ''
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNextStep = () => {
    if (step === 1) {
      // Validate company details
      if (!formData.companyName || !formData.companyEmail || !formData.companySize) {
        alert('Please fill in all required company details')
        return
      }
    }
    
    if (step === 2) {
      // Validate admin details
      if (!formData.adminName || !formData.adminEmail || !formData.adminPassword) {
        alert('Please fill in all admin details')
        return
      }
    }
    
    setStep(prev => prev + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.agreeToTerms) {
      alert('Please accept the terms of service')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setStep(4) // Success step
      } else {
        const error = await response.json()
        alert(error.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('Registration failed. Please try again.')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Start Your Free Trial
          </h1>
          <p className="text-xl text-gray-600">
            Get full access to TickTrack Pro for 30 days. No credit card required.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-16 h-1 ${
                    step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Building className="h-12 w-12 mx-auto text-blue-600 mb-4" />
                  <h2 className="text-2xl font-semibold">Company Information</h2>
                  <p className="text-gray-600">Tell us about your organization</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Your Company Ltd."
                      required
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
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="companyPhone">Company Phone</Label>
                    <Input
                      id="companyPhone"
                      value={formData.companyPhone}
                      onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                      placeholder="+263 XX XXX XXXX"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="companyAddress">Company Address</Label>
                    <Textarea
                      id="companyAddress"
                      value={formData.companyAddress}
                      onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                      placeholder="Your company address"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <select
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select size</option>
                      {companySizes.map(size => (
                        <option key={size.value} value={size.value}>{size.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button onClick={handleNextStep} className="w-full" size="lg">
                  Continue to Admin Setup
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Users className="h-12 w-12 mx-auto text-blue-600 mb-4" />
                  <h2 className="text-2xl font-semibold">Admin Account</h2>
                  <p className="text-gray-600">Create your admin account</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="adminName">Full Name *</Label>
                    <Input
                      id="adminName"
                      value={formData.adminName}
                      onChange={(e) => handleInputChange('adminName', e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="adminPhone">Phone Number</Label>
                    <Input
                      id="adminPhone"
                      value={formData.adminPhone}
                      onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                      placeholder="+263 XX XXX XXXX"
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
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="adminPassword">Password *</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                      placeholder="Choose a strong password"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Minimum 8 characters with letters and numbers
                    </p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="customRequirements">Custom Requirements (Optional)</Label>
                    <Textarea
                      id="customRequirements"
                      value={formData.customRequirements}
                      onChange={(e) => handleInputChange('customRequirements', e.target.value)}
                      placeholder="Any specific features or customizations your organization needs?"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button onClick={handleNextStep} className="flex-1">
                    Continue to Review
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CheckCircle className="h-12 w-12 mx-auto text-blue-600 mb-4" />
                  <h2 className="text-2xl font-semibold">Review & Confirm</h2>
                  <p className="text-gray-600">Please review your information</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Company Details</h3>
                    <p className="text-gray-600">{formData.companyName}</p>
                    <p className="text-gray-600">{formData.companyEmail}</p>
                    <p className="text-gray-600">{formData.companySize}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">Admin Account</h3>
                    <p className="text-gray-600">{formData.adminName}</p>
                    <p className="text-gray-600">{formData.adminEmail}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked as boolean)}
                    />
                    <div className="text-sm">
                      <Label htmlFor="agreeToTerms" className="text-gray-700">
                        I agree to the{' '}
                        <Link href="/terms" className="text-blue-600 hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-blue-600 hover:underline">
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
                    />
                    <Label htmlFor="subscribeToUpdates" className="text-sm text-gray-700">
                      Subscribe to product updates and tips
                    </Label>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">What's included in your trial:</h4>
                  <ul className="text-blue-800 space-y-1 text-sm">
                    <li>✓ 30-day free trial (Full access to all features)</li>
                    <li>✓ Unlimited tickets and projects</li>
                    <li>✓ Helpdesk, ordering, and project management</li>
                    <li>✓ Invoice management system</li>
                    <li>✓ Contractor network access</li>
                    <li>✓ Email support</li>
                    <li>✓ No credit card required</li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    className="flex-1"
                    disabled={loading || !formData.agreeToTerms}
                  >
                    {loading ? 'Creating Account...' : 'Start Free Trial'}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-6">
                <Mail className="h-16 w-16 mx-auto text-green-600" />
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Check Your Email!
                  </h2>
                  <p className="text-gray-600 mb-4">
                    We've sent a verification email to <strong>{formData.adminEmail}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Click the link in your email to activate your account and start your 30-day free trial.
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">What happens next:</h4>
                  <ol className="text-green-800 space-y-1 text-sm text-left">
                    <li>1. Check your email and click the verification link</li>
                    <li>2. Sign in to your new TickTrack Pro account</li>
                    <li>3. Complete the initial setup wizard</li>
                    <li>4. Start using all features during your trial</li>
                    <li>5. Choose your plan after the trial period</li>
                  </ol>
                </div>

                <Button asChild>
                  <Link href="/auth/signin">
                    Go to Sign In
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-gray-600">
          <p>
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-blue-600 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}