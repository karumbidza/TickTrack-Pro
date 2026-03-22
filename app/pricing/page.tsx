'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Star, Zap, Building, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const plans = [
    {
      name: 'Basic',
      description: 'Perfect for small teams getting started',
      price: {
        monthly: 29,
        yearly: 290
      },
      icon: <Zap className="h-8 w-8" />,
      color: 'blue',
      features: [
        'Up to 10 users',
        'Basic helpdesk ticketing',
        'Project management',
        'Basic reporting',
        'Email support',
        'Mobile app access',
        'Basic integrations'
      ],
      limitations: [
        'Limited to 1,000 tickets/month',
        'Basic customization options'
      ]
    },
    {
      name: 'Pro',
      description: 'Advanced features for growing businesses',
      price: {
        monthly: 79,
        yearly: 790
      },
      icon: <Star className="h-8 w-8" />,
      color: 'purple',
      popular: true,
      features: [
        'Up to 50 users',
        'Advanced helpdesk with automation',
        'Full project management suite',
        'Contractor network access',
        'Invoice management',
        'Advanced reporting & analytics',
        'Priority email support',
        'Custom workflows',
        'Advanced integrations',
        'API access'
      ],
      limitations: [
        'Up to 5,000 tickets/month'
      ]
    },
    {
      name: 'Enterprise',
      description: 'Full-featured solution for large organizations',
      price: {
        monthly: 199,
        yearly: 1990
      },
      icon: <Building className="h-8 w-8" />,
      color: 'green',
      features: [
        'Unlimited users',
        'Enterprise helpdesk features',
        'Advanced project portfolio management',
        'Dedicated contractor network',
        'Advanced invoice & billing management',
        'Custom reporting & dashboards',
        'Dedicated support manager',
        'White-label options',
        'SSO & advanced security',
        'Custom integrations',
        'On-premise deployment option'
      ],
      limitations: [
        'Unlimited tickets',
        'Custom SLA agreements'
      ]
    }
  ]

  const customFeatures = [
    'Custom module development',
    'Advanced integrations with your existing systems',
    'Custom reporting and analytics',
    'Dedicated training and onboarding',
    'Custom branding and white-labeling',
    'Advanced security and compliance features',
    'Custom mobile app development',
    'API customization and extensions'
  ]

  const getYearlySavings = (monthlyPrice: number) => {
    const yearlyPrice = monthlyPrice * 10 // 2 months free
    const regularYearlyPrice = monthlyPrice * 12
    return regularYearlyPrice - yearlyPrice
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="container mx-auto px-6 pt-16 pb-8">
        <div className="text-center">
          <h1 className="text-5xl mb-6" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>
            Choose Your Plan
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Start with a 30-day free trial. No credit card required. 
            Experience the full power of TickTrack Pro before you commit.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-12">
            <div className="rounded-lg p-1" style={{ backgroundColor: 'var(--surface)' }}>
              <button
                onClick={() => setBillingCycle('monthly')}
                className="px-6 py-2 rounded-md font-medium transition-colors"
                style={billingCycle === 'monthly'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' }
                  : { color: 'var(--text-secondary)' }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className="px-6 py-2 rounded-md font-medium transition-colors"
                style={billingCycle === 'yearly'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' }
                  : { color: 'var(--text-secondary)' }}
              >
                Yearly
                <Badge variant="secondary" className="ml-2">
                  Save 17%
                </Badge>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative transition-all duration-300 hover:scale-105 ${
                plan.popular ? 'ring-2 ring-border-strong' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 rounded-full" style={{ backgroundColor: 'var(--surface2)' }}>
                  <div style={{ color: 'var(--accent)' }}>
                    {plan.icon}
                  </div>
                </div>
                <CardTitle className="text-2xl font-medium">{plan.name}</CardTitle>
                <p style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>

                <div className="mt-6">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-4xl" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>
                      ${billingCycle === 'monthly' ? plan.price.monthly : Math.floor(plan.price.yearly / 12)}
                    </span>
                    <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>/month</span>
                  </div>

                  {billingCycle === 'yearly' && (
                    <div className="text-sm" style={{ color: 'var(--green)' }}>
                      Save ${getYearlySavings(plan.price.monthly)} per year
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" style={{ color: 'var(--green)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-6">
                <Button
                  asChild
                  className="w-full"
                  size="lg"
                >
                  <Link href="/register">
                    Start Free Trial
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Custom Solutions */}
        <div className="rounded-xl p-8 mb-16" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="text-center mb-8">
            <h2 className="text-3xl mb-4" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>
              Need Something Custom?
            </h2>
            <p className="text-xl" style={{ color: 'var(--text-secondary)' }}>
              We can tailor TickTrack Pro to meet your specific business requirements
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                Custom Features We Can Build:
              </h3>
              <ul className="space-y-2">
                {customFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <ArrowRight className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--surface2)' }}>
              <h3 className="text-xl font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                Get a Custom Quote
              </h3>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                Tell us about your specific needs and we'll create a tailored solution 
                with custom pricing that fits your budget.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Check className="h-4 w-4 mr-2" style={{ color: 'var(--green)' }} />
                  Free consultation call
                </div>
                <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Check className="h-4 w-4 mr-2" style={{ color: 'var(--green)' }} />
                  Custom development timeline
                </div>
                <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Check className="h-4 w-4 mr-2" style={{ color: 'var(--green)' }} />
                  Dedicated project manager
                </div>
                
                <Button asChild className="w-full mt-4" variant="outline" size="lg">
                  <Link href="/request-quote">
                    Request Custom Quote
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="text-center">
          <h2 className="text-3xl mb-8" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                What's included in the free trial?
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Full access to all features for 30 days. No limitations, 
                no credit card required.
              </p>
            </div>

            <div className="text-left">
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Can I change plans later?
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Yes! Upgrade or downgrade your plan at any time. 
                Changes take effect immediately.
              </p>
            </div>

            <div className="text-left">
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                What payment methods do you accept?
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                We accept all major credit cards, EcoCash, OneMoney, 
                and bank transfers in Zimbabwe.
              </p>
            </div>

            <div className="text-left">
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Is there a setup fee?
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                No setup fees for standard plans. Custom solutions 
                may include implementation costs.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Button asChild size="lg">
              <Link href="/register">
                Start Your Free Trial Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}