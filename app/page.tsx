import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Ticket,
  Users,
  Building2,
  Clock,
  MessageSquare,
  Star,
  Shield
} from 'lucide-react'
import { LandingNavbar } from '@/components/layout/landing-navbar'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    redirect('/dashboard')
  }

  const features = [
    { icon: Ticket, label: 'Ticket Management', description: 'Create, track, and manage support tickets with full workflow automation' },
    { icon: Users, label: 'Multi-Role Access', description: 'End users, admins, and contractors with role-based permissions' },
    { icon: Building2, label: 'Multi-Tenant', description: 'Host multiple organisations with complete data isolation' },
    { icon: MessageSquare, label: 'Real-time Chat', description: 'Communicate instantly between users, admins, and contractors' },
    { icon: Clock, label: 'SLA Tracking', description: 'Monitor response times and ensure service level agreements' },
    { icon: Star, label: 'Rating System', description: 'Collect feedback and ratings to improve service quality' },
  ]

  const steps = [
    { num: '01', title: 'User Creates Ticket', description: 'End users submit support requests with detailed descriptions' },
    { num: '02', title: 'Admin Assigns', description: 'Admin reviews and assigns tickets to qualified contractors' },
    { num: '03', title: 'Work Completion', description: 'Contractor performs work and updates status in real-time' },
    { num: '04', title: 'Invoice & Rating', description: 'User approves work, contractor submits invoice, user rates service' },
  ]

  return (
    <div style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
      <LandingNavbar />

      {/* Hero */}
      <section style={{ padding: '6rem 0', borderBottom: '1px solid var(--border)' }}>
        <div className="mx-auto max-w-[1100px] px-6 text-center">
          <p className="section-label mb-6">Helpdesk Management System</p>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Built for teams that <strong>need to move fast</strong>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            Multi-tenant helpdesk and ticket tracking system for modern organisations — from ticket to invoice, all in one place.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/get-started">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '5rem 0' }}>
        <div className="mx-auto max-w-[1100px] px-6">
          <div className="text-center mb-12">
            <p className="section-label mb-3">What's included</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              Complete helpdesk solution
            </h2>
          </div>

          {/* Grid with 1px gap on --border background */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 1,
              backgroundColor: 'var(--border)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {features.map(({ icon: Icon, label, description }) => (
              <div
                key={label}
                style={{ backgroundColor: 'var(--surface)', padding: '2rem' }}
              >
                <Icon className="h-8 w-8 mb-4" style={{ color: 'var(--text-muted)' }} />
                <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: 'var(--text-primary)' }}>{label}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section style={{ padding: '5rem 0', borderTop: '1px solid var(--border)' }}>
        <div className="mx-auto max-w-[1100px] px-6">
          <div className="text-center mb-12">
            <p className="section-label mb-3">How it works</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              Streamlined workflow
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
            {steps.map(({ num, title, description }) => (
              <div key={num}>
                <span
                  className="font-mono"
                  style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}
                >
                  {num}
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: 'var(--text-primary)' }}>{title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 0', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="mx-auto max-w-[1100px] px-6 text-center">
          <p className="section-label mb-4">Get started today</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 300, letterSpacing: '-0.03em', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 2rem' }}>
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link href="/get-started">
            <Button size="lg" className="gap-2">
              Start Free Trial
              <Shield className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '2rem 0' }}>
        <div className="mx-auto max-w-[1100px] px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 15 }}>TickTrack Pro</span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>© {new Date().getFullYear()} TickTrack Pro. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
