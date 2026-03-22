'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Mail, Clock } from 'lucide-react'
import Link from 'next/link'

export default function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <Card className="max-w-lg w-full border border-border" style={{ backgroundColor: 'var(--surface)' }}>
        <CardContent className="pt-8 pb-6 text-center">
          <div className="rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: 'var(--green-bg)' }}>
            <CheckCircle className="h-10 w-10" style={{ color: 'var(--green)' }} />
          </div>

          <h1 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)', fontWeight: 300, letterSpacing: '-0.025em' }}>
            Application Submitted Successfully!
          </h1>

          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Thank you for completing your contractor registration. Your KYC application is now under review.
          </p>

          <div className="space-y-4 text-left rounded-lg p-4 mb-6 border border-border" style={{ backgroundColor: 'var(--surface2)' }}>
            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>What happens next?</h3>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 mt-0.5" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Review Process</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Our team will review your application within 2-3 business days.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 mt-0.5" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Email Notification</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Once approved, you will receive an email with a link to set up your password and access your account.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            If you have any questions, please contact the administrator.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
