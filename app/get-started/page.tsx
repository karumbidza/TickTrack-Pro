'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  User, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  Star,
  Building,
  Check,
  Loader2,
  Mail,
  Phone,
  Ticket,
  Key,
  Calendar
} from 'lucide-react'

// Plans data
const plans = [
  {
    id: 'BASIC',
    name: 'Basic',
    description: 'Perfect for small teams',
    icon: Zap,
    color: 'blue',
    features: [
      'Up to 10 users',
      'Basic helpdesk ticketing',
      'Project management',
      'Email support',
      'Mobile app access'
    ],
    pricing: {
      monthly: { USD: 29, ZWL: 8700 },
      yearly: { USD: 290, ZWL: 87000 }
    }
  },
  {
    id: 'PRO',
    name: 'Pro',
    description: 'For growing businesses',
    icon: Star,
    color: 'purple',
    popular: true,
    features: [
      'Up to 50 users',
      'Advanced helpdesk + automation',
      'Contractor network',
      'Invoice management',
      'Priority support',
      'API access'
    ],
    pricing: {
      monthly: { USD: 79, ZWL: 23700 },
      yearly: { USD: 790, ZWL: 237000 }
    }
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'For large organizations',
    icon: Building,
    color: 'green',
    features: [
      'Unlimited users',
      'Enterprise features',
      'White-label options',
      'Dedicated support',
      'Custom integrations',
      'SSO & advanced security'
    ],
    pricing: {
      monthly: { USD: 199, ZWL: 59700 },
      yearly: { USD: 1990, ZWL: 597000 }
    }
  }
]

type Step = 'plan' | 'company' | 'account' | 'success'

interface FormData {
  selectedPlan: string
  billingCycle: 'monthly' | 'yearly'
  companyName: string
  companyAddress: string
  companyPhone: string
  adminName: string
  email: string
  phone: string
}

const stepOrder: Step[] = ['plan', 'company', 'account', 'success']

const stepInfo = {
  plan: { title: 'Choose Your Plan', subtitle: 'Start with a 14-day free trial', icon: CreditCard },
  company: { title: 'Company Information', subtitle: 'Tell us about your organization', icon: Building2 },
  account: { title: 'Create Your Account', subtitle: 'Your admin account details', icon: User },
  success: { title: 'Check Your Email!', subtitle: 'Set your password to get started', icon: Mail }
}

export default function GetStartedPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('plan')
  const [direction, setDirection] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAccountExistsDialog, setShowAccountExistsDialog] = useState(false)
  const [existingEmail, setExistingEmail] = useState('')

  const [formData, setFormData] = useState<FormData>({
    selectedPlan: 'PRO',
    billingCycle: 'monthly',
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    adminName: '',
    email: '',
    phone: ''
  })

  // Calculate trial end date (14 days from now)
  const trialEndDate = new Date()
  trialEndDate.setDate(trialEndDate.getDate() + 14)
  const formattedTrialEnd = trialEndDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const currentStepIndex = stepOrder.indexOf(currentStep)

  const goToStep = (step: Step) => {
    const newIndex = stepOrder.indexOf(step)
    setDirection(newIndex > currentStepIndex ? 1 : -1)
    setCurrentStep(step)
  }

  const nextStep = () => {
    if (currentStepIndex < stepOrder.length - 1) {
      setDirection(1)
      setCurrentStep(stepOrder[currentStepIndex + 1])
    }
  }

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setDirection(-1)
      setCurrentStep(stepOrder[currentStepIndex - 1])
    }
  }

  const validateStep = (): boolean => {
    setError('')
    
    switch (currentStep) {
      case 'plan':
        if (!formData.selectedPlan) {
          setError('Please select a plan')
          return false
        }
        return true
        
      case 'company':
        if (!formData.companyName.trim()) {
          setError('Company name is required')
          return false
        }
        return true
        
      case 'account':
        if (!formData.adminName.trim()) {
          setError('Your name is required')
          return false
        }
        if (!formData.email.trim()) {
          setError('Email is required')
          return false
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError('Please enter a valid email address')
          return false
        }
        if (!formData.phone.trim()) {
          setError('Phone number is required')
          return false
        }
        return true
        
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep === 'account') {
        handleSubmit()
      } else {
        nextStep()
      }
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          companyEmail: formData.email,
          companyPhone: formData.phone,
          companyAddress: formData.companyAddress,
          companySize: 'small',
          adminName: formData.adminName,
          adminEmail: formData.email,
          adminPhone: formData.phone,
          selectedPlan: formData.selectedPlan,
          billingCycle: formData.billingCycle
        })
      })

      const data = await response.json()

      if (response.ok) {
        nextStep()
      } else if (data.error === 'account_exists') {
        setExistingEmail(formData.email)
        setShowAccountExistsDialog(true)
        setError('')
      } else if (data.error === 'company_exists') {
        setError(data.message || 'A company with this name already exists. Please choose a different name.')
      } else {
        setError(data.message || 'Registration failed. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0
    })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="p-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/" className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Ticket className="h-5 w-5" />
          <span style={{ fontWeight: 500, fontSize: 16 }}>TickTrack Pro</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          {/* Progress Steps */}
          {currentStep !== 'success' && (
            <div className="mb-8">
              <div className="flex justify-center items-center gap-2 md:gap-4">
                {stepOrder.slice(0, -1).map((step, index) => {
                  const StepIcon = stepInfo[step].icon
                  const isActive = currentStepIndex >= index
                  const isCurrent = currentStep === step

                  return (
                    <div key={step} className="flex items-center">
                      <button
                        onClick={() => index < currentStepIndex && goToStep(step)}
                        disabled={index >= currentStepIndex}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 14px',
                          borderRadius: 999,
                          fontSize: 14,
                          fontWeight: 500,
                          border: 'none',
                          cursor: index < currentStepIndex ? 'pointer' : 'default',
                          backgroundColor: isActive ? 'var(--accent)' : 'var(--surface2)',
                          color: isActive ? 'var(--bg)' : 'var(--text-muted)',
                          outline: isCurrent ? '2px solid var(--border-strong)' : 'none',
                          outlineOffset: 2,
                          transition: 'all 0.15s',
                        }}
                      >
                        <StepIcon className="h-4 w-4" />
                        <span className="hidden md:inline">
                          {stepInfo[step].title}
                        </span>
                      </button>
                      {index < stepOrder.length - 2 && (
                        <div style={{
                          width: 48,
                          height: 1,
                          margin: '0 8px',
                          backgroundColor: currentStepIndex > index ? 'var(--accent)' : 'var(--border)',
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step Content */}
          <Card className="overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <CardContent className="p-0">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'tween', duration: 0.3 }}
                >
                  {/* Plan Selection Step */}
                  {currentStep === 'plan' && (
                    <div className="p-6 md:p-8">
                      <div className="text-center mb-8">
                        <p className="section-label mb-3">{stepInfo.plan.subtitle}</p>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
                          {stepInfo.plan.title}
                        </h2>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center mt-6">
                          <div className="inline-flex rounded-lg p-1" style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}>
                            <button
                              onClick={() => updateFormData('billingCycle', 'monthly')}
                              style={{
                                padding: '6px 16px',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: formData.billingCycle === 'monthly' ? 'var(--surface)' : 'transparent',
                                color: formData.billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-muted)',
                                boxShadow: formData.billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                              }}
                            >
                              Monthly
                            </button>
                            <button
                              onClick={() => updateFormData('billingCycle', 'yearly')}
                              style={{
                                padding: '6px 16px',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                backgroundColor: formData.billingCycle === 'yearly' ? 'var(--surface)' : 'transparent',
                                color: formData.billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-muted)',
                                boxShadow: formData.billingCycle === 'yearly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                              }}
                            >
                              Yearly
                              <Badge variant="success">2 months free</Badge>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Plans Grid */}
                      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                        {plans.map((plan) => {
                          const Icon = plan.icon
                          const isSelected = formData.selectedPlan === plan.id
                          const price = plan.pricing[formData.billingCycle].USD

                          return (
                            <button
                              key={plan.id}
                              onClick={() => updateFormData('selectedPlan', plan.id)}
                              style={{
                                position: 'relative',
                                padding: '1.5rem',
                                borderRadius: 10,
                                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                                textAlign: 'left',
                                backgroundColor: isSelected ? 'var(--surface2)' : 'var(--surface)',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              {plan.popular && (
                                <Badge variant="default" style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>
                                  Most Popular
                                </Badge>
                              )}

                              <div style={{
                                width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: 'var(--surface2)', marginBottom: 16,
                              }}>
                                <Icon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                              </div>

                              <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{plan.name}</h3>
                              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{plan.description}</p>

                              <div style={{ marginBottom: 16 }}>
                                <span style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>${price}</span>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/{formData.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                              </div>

                              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {plan.features.slice(0, 4).map((feature, i) => (
                                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                                    <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--green)' }} />
                                    {feature}
                                  </li>
                                ))}
                                {plan.features.length > 4 && (
                                  <li style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                                    +{plan.features.length - 4} more features
                                  </li>
                                )}
                              </ul>

                              {isSelected && (
                                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                                  <CheckCircle className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <p className="section-label text-center mt-6" style={{ textTransform: 'none', fontSize: 13, letterSpacing: 0 }}>
                        All plans include a 14-day free trial. No credit card required.
                      </p>
                    </div>
                  )}

                  {/* Company Info Step */}
                  {currentStep === 'company' && (
                    <div className="p-6 md:p-8 max-w-xl mx-auto">
                      <div className="text-center mb-8">
                        <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <Building2 className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 8 }}>
                          {stepInfo.company.title}
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{stepInfo.company.subtitle}</p>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="companyName">
                            Company Name <span style={{ color: 'var(--ds-red)' }}>*</span>
                          </Label>
                          <div className="mt-1.5 relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            <Input
                              id="companyName"
                              value={formData.companyName}
                              onChange={(e) => updateFormData('companyName', e.target.value)}
                              placeholder="Acme Corporation"
                              className="pl-9"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="companyPhone">Company Phone</Label>
                          <div className="mt-1.5 relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            <Input
                              id="companyPhone"
                              value={formData.companyPhone}
                              onChange={(e) => updateFormData('companyPhone', e.target.value)}
                              placeholder="+263 XX XXX XXXX"
                              className="pl-9"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="companyAddress">Company Address</Label>
                          <div className="mt-1.5">
                            <Input
                              id="companyAddress"
                              value={formData.companyAddress}
                              onChange={(e) => updateFormData('companyAddress', e.target.value)}
                              placeholder="123 Business Street, Harare"
                            />
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Optional — you can add this later</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Account Creation Step - NO PASSWORD */}
                  {currentStep === 'account' && (
                    <div className="p-6 md:p-8 max-w-xl mx-auto">
                      <div className="text-center mb-8">
                        <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <User className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 8 }}>
                          {stepInfo.account.title}
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{stepInfo.account.subtitle}</p>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="adminName">
                            Your Full Name <span style={{ color: 'var(--ds-red)' }}>*</span>
                          </Label>
                          <div className="mt-1.5 relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            <Input
                              id="adminName"
                              value={formData.adminName}
                              onChange={(e) => updateFormData('adminName', e.target.value)}
                              placeholder="John Doe"
                              className="pl-9"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="email">
                            Email Address <span style={{ color: 'var(--ds-red)' }}>*</span>
                          </Label>
                          <div className="mt-1.5 relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => updateFormData('email', e.target.value)}
                              placeholder="john@company.com"
                              className="pl-9"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="phone">
                            Phone Number <span style={{ color: 'var(--ds-red)' }}>*</span>
                          </Label>
                          <div className="mt-1.5 relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => updateFormData('phone', e.target.value)}
                              placeholder="+263 77 123 4567"
                              className="pl-9"
                            />
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>For SMS notifications</p>
                        </div>

                        {/* Info box about password */}
                        <div style={{ backgroundColor: 'var(--surface2)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
                          <div className="flex gap-3">
                            <Mail className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                                You&apos;ll set your password via email
                              </p>
                              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                After registration, we&apos;ll send you an activation email to set up your secure password.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success Step */}
                  {currentStep === 'success' && (
                    <div className="p-6 md:p-12 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
                      >
                        <Mail className="h-8 w-8" style={{ color: 'var(--green)' }} />
                      </motion.div>

                      <h2 style={{ fontSize: '1.75rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 8 }}>
                        Check Your Email!
                      </h2>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        We&apos;ve sent an activation email to:
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 32, fontFamily: 'DM Mono, monospace' }}>
                        {formData.email}
                      </p>

                      {/* Next Steps */}
                      <div style={{ backgroundColor: 'var(--surface2)', borderRadius: 10, padding: 24, maxWidth: 400, margin: '0 auto 24px', textAlign: 'left' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CheckCircle className="h-4 w-4" style={{ color: 'var(--green)' }} />
                          Next Steps
                        </h3>
                        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {['Open the email and click the activation link', 'Create your secure password', 'Sign in and start your 14-day free trial!'].map((step, i) => (
                            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{i + 1}</span>
                              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Trial Details */}
                      <div style={{ backgroundColor: 'var(--surface2)', borderRadius: 10, padding: 24, maxWidth: 400, margin: '0 auto 32px', textAlign: 'left', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          <Calendar className="h-3.5 w-3.5" />
                          Trial Details
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { label: 'Company', value: formData.companyName },
                            { label: 'Plan', value: formData.selectedPlan },
                            { label: 'Trial Period', value: '14 days' },
                            { label: 'Trial Expires', value: formattedTrialEnd },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Button onClick={() => router.push('/auth/signin')} className="gap-2">
                          Go to Sign In
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          Didn&apos;t receive the email?{' '}
                          <button style={{ color: 'var(--text-secondary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                            Resend verification
                          </button>
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Error Message */}
              {error && currentStep !== 'success' && (
                <div className="px-6 md:px-8 pb-4">
                  <div className="flex items-center gap-2 text-sm p-3 rounded-lg" style={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}>
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                </div>
              )}

              {/* Account Already Exists Dialog */}
              {showAccountExistsDialog && (
                <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ backgroundColor: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', maxWidth: 400, width: '100%', overflow: 'hidden' }}
                  >
                    <div style={{ padding: '2rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <User className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 8 }}>Account Already Exists</h3>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>We found an existing account with this email</p>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                      <div style={{ backgroundColor: 'var(--surface2)', borderRadius: 8, padding: 12, marginBottom: 20 }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Email</p>
                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>{existingEmail}</p>
                      </div>

                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20 }}>
                        Would you like to sign in to your existing account or reset your password?
                      </p>

                      <div className="space-y-2">
                        <Link href="/auth/signin" className="flex items-center justify-center gap-2 w-full rounded-lg py-2.5 px-4 text-sm font-medium transition-colors"
                          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}>
                          <ArrowRight className="h-4 w-4" />
                          Sign In to Your Account
                        </Link>
                        <Link href="/auth/forgot-password" className="flex items-center justify-center gap-2 w-full rounded-lg py-2.5 px-4 text-sm font-medium"
                          style={{ backgroundColor: 'var(--surface2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                          <Key className="h-4 w-4" />
                          Forgot Password?
                        </Link>
                        <button
                          onClick={() => { setShowAccountExistsDialog(false); updateFormData('email', '') }}
                          className="w-full py-2 text-sm"
                          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          Use a Different Email
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep !== 'success' && (
                <div className="px-6 md:px-8 pb-6 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  {currentStepIndex > 0 ? (
                    <Button variant="outline" onClick={prevStep} className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                  ) : (
                    <Link href="/auth/signin" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Already have an account? <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Sign in</span>
                    </Link>
                  )}

                  <Button onClick={handleNext} disabled={isLoading} className="min-w-[140px] gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : currentStep === 'account' ? (
                      <>
                        Start Free Trial
                        <CheckCircle className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center mt-6" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            By creating an account, you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
