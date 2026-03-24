'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null>

  // Already onboarded — redirect
  if (isLoaded && meta.tenantId) {
    const role = meta.role
    if (role === 'SUPER_ADMIN') router.replace('/super-admin')
    else router.replace('/admin')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }
      // Reload Clerk session to pick up new metadata
      await user?.reload()
      router.replace('/admin')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) return null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '24px 16px',
      gap: 24,
    }}>
      <div style={{ textAlign: 'center' }}>
        <Logo size="sm" href="/" />
        <h1 style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 300,
          color: 'var(--text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          marginTop: 24,
          marginBottom: 6,
        }}>
          Set up your organisation
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Create your company workspace to get started with a 14-day free trial
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        width: '100%',
        maxWidth: 400,
        background: '#ffffff',
        border: '1px solid #e0ddd6',
        borderRadius: 8,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="Acme Corp"
            required
            autoFocus
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>
        )}

        <Button type="submit" disabled={loading || !companyName.trim()}>
          {loading ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
    </div>
  )
}
