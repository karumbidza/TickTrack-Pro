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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="container mx-auto px-6 pt-16 pb-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Start with a 30-day free trial. No credit card required. 
            Experience the full power of TickTrack Pro before you commit.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-12">
            <div className="bg-white rounded-lg p-1 shadow-md">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  billingCycle === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
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
                plan.popular 
                  ? 'ring-2 ring-purple-500 shadow-2xl' 
                  : 'shadow-lg hover:shadow-xl'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-600 hover:bg-purple-700 px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className={`mx-auto mb-4 p-3 rounded-full bg-${plan.color}-100`}>
                  <div className={`text-${plan.color}-600`}>
                    {plan.icon}
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <p className="text-gray-600">{plan.description}</p>
                
                <div className="mt-6">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      ${billingCycle === 'monthly' ? plan.price.monthly : Math.floor(plan.price.yearly / 12)}
                    </span>
                    <span className="text-gray-600 ml-2">/month</span>
                  </div>
                  
                  {billingCycle === 'yearly' && (
                    <div className="text-sm text-green-600">
                      Save ${getYearlySavings(plan.price.monthly)} per year
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-6">
                <Button 
                  asChild
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
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
        <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Need Something Custom?
            </h2>
            <p className="text-xl text-gray-600">
              We can tailor TickTrack Pro to meet your specific business requirements
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Custom Features We Can Build:
              </h3>
              <ul className="space-y-2">
                {customFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Get a Custom Quote
              </h3>
              <p className="text-gray-600 mb-6">
                Tell us about your specific needs and we'll create a tailored solution 
                with custom pricing that fits your budget.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Free consultation call
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Custom development timeline
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
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
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                What's included in the free trial?
              </h3>
              <p className="text-gray-600">
                Full access to all features for 30 days. No limitations, 
                no credit card required.
              </p>
            </div>

            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600">
                Yes! Upgrade or downgrade your plan at any time. 
                Changes take effect immediately.
              </p>
            </div>

            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards, EcoCash, OneMoney, 
                and bank transfers in Zimbabwe.
              </p>
            </div>

            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a setup fee?
              </h3>
              <p className="text-gray-600">
                No setup fees for standard plans. Custom solutions 
                may include implementation costs.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
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