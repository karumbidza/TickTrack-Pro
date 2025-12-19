'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Mail, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Join TickTrack Pro
          </h2>
          <p className="mt-2 text-gray-600">
            Choose how you'd like to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Company Registration */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/auth/company-register')}>
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Register Your Company</CardTitle>
              <CardDescription>
                Create a new company account and become the administrator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2 mb-4">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  Set up your organization
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  Invite users and contractors
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  Manage tickets, assets, and more
                </li>
              </ul>
              <Button className="w-full">
                Register Company
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Invited User */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Join an Existing Company</CardTitle>
              <CardDescription>
                You need an invitation from your company administrator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">How it works:</h4>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Your admin sends you an invitation email</li>
                  <li>Click the link to accept the invitation</li>
                  <li>Fill in your basic profile details</li>
                  <li>Wait for admin approval</li>
                  <li>Set your password and start using TickTrack</li>
                </ol>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Already received an invitation? Check your email!
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
