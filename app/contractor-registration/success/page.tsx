'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Mail, Clock } from 'lucide-react'
import Link from 'next/link'

export default function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Application Submitted Successfully!
          </h1>
          
          <p className="text-gray-600 mb-8">
            Thank you for completing your contractor registration. Your KYC application is now under review.
          </p>
          
          <div className="space-y-4 text-left bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900">What happens next?</h3>
            
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Review Process</p>
                <p className="text-sm text-gray-600">
                  Our team will review your application within 2-3 business days.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Email Notification</p>
                <p className="text-sm text-gray-600">
                  Once approved, you will receive an email with a link to set up your password and access your account.
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            If you have any questions, please contact the administrator.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
