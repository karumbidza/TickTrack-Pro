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
  Eye, 
  EyeOff, 
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
  Lock,
  Ticket
} from 'lucide-react'

// Password requirements
const passwordRequirements = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[0-9]/, label: 'One number' },
  { regex: /[^A-Za-z0-9]/, label: 'One special character' }
]

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
  password: string
  confirmPassword: string
}

const stepOrder: Step[] = ['plan', 'company', 'account', 'success']

const stepInfo = {
  plan: { title: 'Choose Your Plan', subtitle: 'Start with a 14-day free trial', icon: CreditCard },
  company: { title: 'Company Information', subtitle: 'Tell us about your organization', icon: Building2 },
  account: { title: 'Create Your Account', subtitle: 'Set up your admin credentials', icon: User },
  success: { title: 'Welcome Aboard!', subtitle: 'Your account is ready', icon: CheckCircle }
}

export default function GetStartedPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('plan')
  const [direction, setDirection] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    selectedPlan: 'PRO',
    billingCycle: 'monthly',
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
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
        if (!allRequirementsMet) {
          setError('Password does not meet all requirements')
          return false
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
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
      const response = await fetch('/api/auth/company-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          adminName: formData.adminName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          address: formData.companyAddress,
          selectedPlan: formData.selectedPlan,
          billingCycle: formData.billingCycle
        })
      })

      const data = await response.json()

      if (response.ok) {
        nextStep()
      } else {
        setError(data.error || 'Registration failed. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = passwordRequirements.map(req => ({
    ...req,
    met: req.regex.test(formData.password)
  }))
  const allRequirementsMet = passwordStrength.every(req => req.met)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Ticket className="h-8 w-8" />
          <span className="text-xl font-bold">TickTrack Pro</span>
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
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-full transition-all
                          ${isActive 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white/10 text-white/50'}
                          ${isCurrent ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : ''}
                          ${index < currentStepIndex ? 'cursor-pointer hover:bg-blue-500' : 'cursor-default'}
                        `}
                      >
                        <StepIcon className="h-4 w-4" />
                        <span className="hidden md:inline text-sm font-medium">
                          {stepInfo[step].title}
                        </span>
                      </button>
                      {index < stepOrder.length - 2 && (
                        <div className={`w-8 md:w-16 h-0.5 mx-2 ${
                          currentStepIndex > index ? 'bg-blue-500' : 'bg-white/20'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step Content */}
          <Card className="overflow-hidden bg-white/95 backdrop-blur shadow-2xl">
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
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                          {stepInfo.plan.title}
                        </h2>
                        <p className="text-gray-600">{stepInfo.plan.subtitle}</p>
                        
                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center mt-6">
                          <div className="bg-gray-100 rounded-lg p-1 inline-flex">
                            <button
                              onClick={() => updateFormData('billingCycle', 'monthly')}
                              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                formData.billingCycle === 'monthly'
                                  ? 'bg-white text-gray-900 shadow'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Monthly
                            </button>
                            <button
                              onClick={() => updateFormData('billingCycle', 'yearly')}
                              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                formData.billingCycle === 'yearly'
                                  ? 'bg-white text-gray-900 shadow'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Yearly
                              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                                2 months free
                              </Badge>
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
                              className={`
                                relative p-6 rounded-xl border-2 text-left transition-all
                                ${isSelected 
                                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]' 
                                  : 'border-gray-200 hover:border-gray-300 hover:shadow'}
                              `}
                            >
                              {plan.popular && (
                                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600">
                                  Most Popular
                                </Badge>
                              )}
                              
                              <div className={`
                                w-12 h-12 rounded-lg flex items-center justify-center mb-4
                                ${plan.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                                ${plan.color === 'purple' ? 'bg-purple-100 text-purple-600' : ''}
                                ${plan.color === 'green' ? 'bg-green-100 text-green-600' : ''}
                              `}>
                                <Icon className="h-6 w-6" />
                              </div>
                              
                              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                              
                              <div className="mb-4">
                                <span className="text-3xl font-bold text-gray-900">${price}</span>
                                <span className="text-gray-500">/{formData.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                              </div>
                              
                              <ul className="space-y-2">
                                {plan.features.slice(0, 4).map((feature, i) => (
                                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    {feature}
                                  </li>
                                ))}
                                {plan.features.length > 4 && (
                                  <li className="text-sm text-blue-600 font-medium">
                                    +{plan.features.length - 4} more features
                                  </li>
                                )}
                              </ul>
                              
                              {isSelected && (
                                <div className="absolute top-4 right-4">
                                  <CheckCircle className="h-6 w-6 text-blue-600" />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <p className="text-center text-sm text-gray-500 mt-6">
                        All plans include a 14-day free trial. No credit card required.
                      </p>
                    </div>
                  )}

                  {/* Company Info Step */}
                  {currentStep === 'company' && (
                    <div className="p-6 md:p-8 max-w-xl mx-auto">
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                          <Building2 className="h-8 w-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                          {stepInfo.company.title}
                        </h2>
                        <p className="text-gray-600">{stepInfo.company.subtitle}</p>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                            Company Name <span className="text-red-500">*</span>
                          </Label>
                          <div className="mt-1 relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              id="companyName"
                              value={formData.companyName}
                              onChange={(e) => updateFormData('companyName', e.target.value)}
                              placeholder="Acme Corporation"
                              className="pl-10 h-12"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="companyPhone" className="text-sm font-medium text-gray-700">
                            Company Phone
                          </Label>
                          <div className="mt-1 relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              id="companyPhone"
                              value={formData.companyPhone}
                              onChange={(e) => updateFormData('companyPhone', e.target.value)}
                              placeholder="+263 XX XXX XXXX"
                              className="pl-10 h-12"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="companyAddress" className="text-sm font-medium text-gray-700">
                            Company Address
                          </Label>
                          <div className="mt-1">
                            <Input
                              id="companyAddress"
                              value={formData.companyAddress}
                              onChange={(e) => updateFormData('companyAddress', e.target.value)}
                              placeholder="123 Business Street, Harare"
                              className="h-12"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Optional - you can add this later</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Account Creation Step */}
                  {currentStep === 'account' && (
                    <div className="p-6 md:p-8 max-w-xl mx-auto">
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                          <User className="h-8 w-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                          {stepInfo.account.title}
                        </h2>
                        <p className="text-gray-600">{stepInfo.account.subtitle}</p>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="adminName" className="text-sm font-medium text-gray-700">
                            Your Full Name <span className="text-red-500">*</span>
                          </Label>
                          <div className="mt-1 relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              id="adminName"
                              value={formData.adminName}
                              onChange={(e) => updateFormData('adminName', e.target.value)}
                              placeholder="John Doe"
                              className="pl-10 h-12"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                            Email Address <span className="text-red-500">*</span>
                          </Label>
                          <div className="mt-1 relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => updateFormData('email', e.target.value)}
                              placeholder="john@company.com"
                              className="pl-10 h-12"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                            Phone Number <span className="text-red-500">*</span>
                          </Label>
                          <div className="mt-1 relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => updateFormData('phone', e.target.value)}
                              placeholder="+263 77 123 4567"
                              className="pl-10 h-12"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">For SMS notifications</p>
                        </div>

                        <div>
                          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                            Password <span className="text-red-500">*</span>
                          </Label>
                          <div className="mt-1 relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              value={formData.password}
                              onChange={(e) => updateFormData('password', e.target.value)}
                              placeholder="Create a strong password"
                              className="pl-10 pr-10 h-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          
                          {/* Password Requirements */}
                          {formData.password && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {passwordStrength.map((req, i) => (
                                <div
                                  key={i}
                                  className={`flex items-center gap-1.5 text-xs ${
                                    req.met ? 'text-green-600' : 'text-gray-400'
                                  }`}
                                >
                                  {req.met ? (
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  ) : (
                                    <div className="h-3.5 w-3.5 rounded-full border border-current" />
                                  )}
                                  {req.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                            Confirm Password <span className="text-red-500">*</span>
                          </Label>
                          <div className="mt-1 relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              id="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={formData.confirmPassword}
                              onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                              placeholder="Confirm your password"
                              className="pl-10 pr-10 h-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
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
                        className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
                      >
                        <CheckCircle className="h-12 w-12 text-green-600" />
                      </motion.div>
                      
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                        Welcome to TickTrack Pro!
                      </h2>
                      <p className="text-gray-600 mb-8 max-w-md mx-auto">
                        We&apos;ve sent a verification email to <strong>{formData.email}</strong>. 
                        Please check your inbox and click the link to activate your account.
                      </p>

                      <div className="bg-blue-50 rounded-lg p-6 max-w-md mx-auto mb-8">
                        <h3 className="font-semibold text-blue-900 mb-3">Your Trial Details</h3>
                        <div className="text-left space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Company:</span>
                            <span className="font-medium text-gray-900">{formData.companyName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Plan:</span>
                            <span className="font-medium text-gray-900">{formData.selectedPlan}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trial Period:</span>
                            <span className="font-medium text-gray-900">14 days</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Button
                          onClick={() => router.push('/auth/signin')}
                          className="w-full max-w-xs h-12"
                        >
                          Go to Sign In
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        
                        <p className="text-sm text-gray-500">
                          Didn&apos;t receive the email?{' '}
                          <button className="text-blue-600 hover:underline">
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
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep !== 'success' && (
                <div className="px-6 md:px-8 pb-6 flex items-center justify-between">
                  {currentStepIndex > 0 ? (
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      className="h-12"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  ) : (
                    <Link href="/auth/signin" className="text-sm text-gray-600 hover:text-gray-900">
                      Already have an account? <span className="text-blue-600 font-medium">Sign in</span>
                    </Link>
                  )}

                  <Button
                    onClick={handleNext}
                    disabled={isLoading}
                    className="h-12 min-w-[140px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : currentStep === 'account' ? (
                      <>
                        Create Account
                        <CheckCircle className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-white/60 text-sm mt-6">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-white/80 hover:text-white underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-white/80 hover:text-white underline">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
