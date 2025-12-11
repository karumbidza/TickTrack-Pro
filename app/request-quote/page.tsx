'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Calculator, MessageSquare, Clock, Users } from 'lucide-react'

export default function RequestQuotePage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    // Company details
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    companySize: '',
    industry: '',
    
    // Project details
    projectTitle: '',
    projectDescription: '',
    timeline: '',
    budget: '',
    
    // Required features
    customModules: [] as string[],
    integrations: [] as string[],
    specialRequirements: '',
    
    // Additional info
    hasExistingSystem: false,
    needDataMigration: false,
    needTraining: false,
    needOnSiteSupport: false
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: 'customModules' | 'integrations', value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyName || !formData.contactEmail || !formData.projectTitle) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to submit quote request')
      }
    } catch (error) {
      console.error('Quote submission error:', error)
      alert('Failed to submit quote request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const customModuleOptions = [
    'Advanced CRM Integration',
    'Custom Reporting Dashboard',
    'Inventory Management',
    'HR & Payroll Integration',
    'Advanced Analytics & BI',
    'Custom Mobile App',
    'Document Management System',
    'Advanced Security & Compliance',
    'Multi-language Support',
    'Custom Workflow Engine',
    'Advanced Notification System',
    'Real-time Chat & Collaboration'
  ]

  const integrationOptions = [
    'Sage Accounting',
    'QuickBooks',
    'Xero',
    'Microsoft Office 365',
    'Google Workspace',
    'Slack',
    'WhatsApp Business',
    'SMS Gateway',
    'Email Marketing Platforms',
    'ERP Systems',
    'Custom APIs',
    'Legacy Systems'
  ]

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Quote Request Submitted!
              </h1>
              <p className="text-gray-600">
                Thank you for your interest in TickTrack Pro custom solutions.
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-green-900 mb-2">What happens next?</h3>
              <div className="text-left space-y-2 text-green-800">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Our team will review your requirements within 24 hours</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  <span>A solution architect will contact you to discuss details</span>
                </div>
                <div className="flex items-center">
                  <Calculator className="w-4 h-4 mr-2" />
                  <span>You'll receive a detailed proposal within 3-5 business days</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              We've sent a confirmation email to <strong>{formData.contactEmail}</strong>
            </p>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => window.location.href = '/pricing'}>
                View Standard Plans
              </Button>
              <Button onClick={() => window.location.href = '/register'}>
                Start Free Trial
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Request Custom Quote
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tell us about your specific requirements and we'll create a tailored 
            TickTrack Pro solution for your organization.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Company Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companyName">Company Name *</Label>
                        <Input
                          id="companyName"
                          value={formData.companyName}
                          onChange={(e) => handleInputChange('companyName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="industry">Industry</Label>
                        <select
                          id="industry"
                          value={formData.industry}
                          onChange={(e) => handleInputChange('industry', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select industry</option>
                          <option value="technology">Technology</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="finance">Finance</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="retail">Retail</option>
                          <option value="education">Education</option>
                          <option value="government">Government</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactName">Contact Name *</Label>
                        <Input
                          id="contactName"
                          value={formData.contactName}
                          onChange={(e) => handleInputChange('contactName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="companySize">Company Size</Label>
                        <select
                          id="companySize"
                          value={formData.companySize}
                          onChange={(e) => handleInputChange('companySize', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select size</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="500+">500+ employees</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactEmail">Email Address *</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactPhone">Phone Number</Label>
                        <Input
                          id="contactPhone"
                          value={formData.contactPhone}
                          onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="projectTitle">Project Title *</Label>
                      <Input
                        id="projectTitle"
                        value={formData.projectTitle}
                        onChange={(e) => handleInputChange('projectTitle', e.target.value)}
                        placeholder="e.g., Custom Enterprise Helpdesk Solution"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="projectDescription">Project Description *</Label>
                      <Textarea
                        id="projectDescription"
                        value={formData.projectDescription}
                        onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                        placeholder="Describe your project requirements, goals, and any specific features you need..."
                        rows={4}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="timeline">Preferred Timeline</Label>
                        <select
                          id="timeline"
                          value={formData.timeline}
                          onChange={(e) => handleInputChange('timeline', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select timeline</option>
                          <option value="1-3 months">1-3 months</option>
                          <option value="3-6 months">3-6 months</option>
                          <option value="6-12 months">6-12 months</option>
                          <option value="12+ months">12+ months</option>
                          <option value="flexible">Flexible</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="budget">Estimated Budget (USD)</Label>
                        <select
                          id="budget"
                          value={formData.budget}
                          onChange={(e) => handleInputChange('budget', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select budget range</option>
                          <option value="<10k">Less than $10,000</option>
                          <option value="10k-25k">$10,000 - $25,000</option>
                          <option value="25k-50k">$25,000 - $50,000</option>
                          <option value="50k-100k">$50,000 - $100,000</option>
                          <option value=">100k">More than $100,000</option>
                          <option value="discuss">Prefer to discuss</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Custom Features */}
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Features Required</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-base font-medium">Custom Modules</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {customModuleOptions.map((module) => (
                          <div key={module} className="flex items-center space-x-2">
                            <Checkbox
                              id={`module-${module}`}
                              checked={formData.customModules.includes(module)}
                              onCheckedChange={(checked) => 
                                handleArrayChange('customModules', module, checked as boolean)
                              }
                            />
                            <Label htmlFor={`module-${module}`} className="text-sm">
                              {module}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium">System Integrations</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {integrationOptions.map((integration) => (
                          <div key={integration} className="flex items-center space-x-2">
                            <Checkbox
                              id={`integration-${integration}`}
                              checked={formData.integrations.includes(integration)}
                              onCheckedChange={(checked) => 
                                handleArrayChange('integrations', integration, checked as boolean)
                              }
                            />
                            <Label htmlFor={`integration-${integration}`} className="text-sm">
                              {integration}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="specialRequirements">Special Requirements</Label>
                      <Textarea
                        id="specialRequirements"
                        value={formData.specialRequirements}
                        onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                        placeholder="Any specific technical requirements, compliance needs, or other special considerations..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Services */}
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Services</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasExistingSystem"
                        checked={formData.hasExistingSystem}
                        onCheckedChange={(checked) => handleInputChange('hasExistingSystem', checked as boolean)}
                      />
                      <Label htmlFor="hasExistingSystem">
                        I have an existing system that needs integration
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="needDataMigration"
                        checked={formData.needDataMigration}
                        onCheckedChange={(checked) => handleInputChange('needDataMigration', checked as boolean)}
                      />
                      <Label htmlFor="needDataMigration">
                        I need data migration from existing systems
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="needTraining"
                        checked={formData.needTraining}
                        onCheckedChange={(checked) => handleInputChange('needTraining', checked as boolean)}
                      />
                      <Label htmlFor="needTraining">
                        I need training for my team
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="needOnSiteSupport"
                        checked={formData.needOnSiteSupport}
                        onCheckedChange={(checked) => handleInputChange('needOnSiteSupport', checked as boolean)}
                      />
                      <Label htmlFor="needOnSiteSupport">
                        I need on-site implementation support
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>What You'll Receive</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <Calculator className="h-4 w-4 text-green-500 mr-2" />
                        Detailed project proposal
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 text-green-500 mr-2" />
                        Project timeline & milestones
                      </div>
                      <div className="flex items-center text-sm">
                        <Users className="h-4 w-4 text-green-500 mr-2" />
                        Dedicated project team
                      </div>
                      <div className="flex items-center text-sm">
                        <MessageSquare className="h-4 w-4 text-green-500 mr-2" />
                        Free consultation call
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Need Help?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Not sure what you need? Our solution architects can help you 
                      define the perfect custom solution.
                    </p>
                    <Button variant="outline" className="w-full" size="sm">
                      Schedule Consultation
                    </Button>
                  </CardContent>
                </Card>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Quote Request'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}