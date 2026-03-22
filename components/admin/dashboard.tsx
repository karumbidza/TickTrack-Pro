'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowRight,
  FileText,
  DollarSign,
  Wrench,
  AlertTriangle,
  Package
} from 'lucide-react'

interface User {
  id: string
  email: string
  name?: string | null
  role: string
  tenantId: string | null
}

interface TicketSummary {
  id: string
  ticketNumber?: string
  title: string
  status: string
  type: string
  priority: string
  user: {
    name: string
    email: string
  }
  assignedTo?: {
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

interface AdminDashboardProps {
  user: User
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    processingTickets: 0,
    inProgressTickets: 0,
    completedTickets: 0,
    completedMTD: 0,
    cancelledTickets: 0,
    highPriorityTickets: 0,
    needsAttention: 0,
    contractorCount: 0,
    userCount: 0,
    avgResolutionTime: 0,
    totalCost: 0,
    totalCostMTD: 0,
    pendingCost: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        fetch('/api/admin/tickets'),
        fetch('/api/admin/stats')
      ])
      
      const ticketsData = await ticketsRes.json()
      const statsData = await statsRes.json()
      
      setTickets(ticketsData.tickets || [])
      if (statsData.stats) {
        setStats(statsData.stats)
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: string): 'info' | 'warning' | 'success' | 'neutral' | 'destructive' => {
    const variants: Record<string, 'info' | 'warning' | 'success' | 'neutral' | 'destructive'> = {
      OPEN: 'info',
      PROCESSING: 'warning',
      IN_PROGRESS: 'warning',
      ON_SITE: 'info',
      PENDING_REVIEW: 'info',
      COMPLETED: 'success',
      CLOSED: 'neutral',
      CANCELLED: 'destructive'
    }
    return variants[status] || 'neutral'
  }

  const getPriorityVariant = (priority: string): 'success' | 'warning' | 'destructive' | 'neutral' => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'neutral'> = {
      LOW: 'success',
      MEDIUM: 'warning',
      HIGH: 'warning',
      CRITICAL: 'destructive',
      URGENT: 'destructive'
    }
    return variants[priority] || 'neutral'
  }

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  // Get recent tickets (last 5)
  const recentTickets = tickets.slice(0, 5)
  
  // Get urgent/high priority open tickets
  const urgentTickets = tickets.filter(t => 
    ['HIGH', 'CRITICAL', 'URGENT'].includes(t.priority) && 
    ['OPEN', 'PROCESSING', 'IN_PROGRESS'].includes(t.status)
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="space-y-5">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl" style={{ fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Welcome back, {user.name || 'Admin'}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Here's what's happening with your tickets today</p>
          </div>
          <Badge variant="neutral" style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {formatRole(user.role)}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card style={{ backgroundColor: 'var(--amber-bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 500 }}>Open</CardTitle>
              <AlertCircle className="h-5 w-5" style={{ color: 'var(--amber)' }} />
            </CardHeader>
            <CardContent>
              <div style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>{stats.openTickets}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Awaiting assignment</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: 'var(--blue-bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 500 }}>In Progress</CardTitle>
              <Clock className="h-5 w-5" style={{ color: 'var(--blue)' }} />
            </CardHeader>
            <CardContent>
              <div style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>{stats.inProgressTickets}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Being worked on</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: 'var(--green-bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 500 }}>Completed</CardTitle>
              <CheckCircle className="h-5 w-5" style={{ color: 'var(--green)' }} />
            </CardHeader>
            <CardContent>
              <div style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>{stats.completedMTD}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Month to date</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 500 }}>Approved Cost</CardTitle>
              <DollarSign className="h-5 w-5" style={{ color: 'var(--green)' }} />
            </CardHeader>
            <CardContent>
              <div style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>${stats.totalCostMTD.toLocaleString()}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Month to date</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Quick links:</span>
          <Link href="/admin/tickets" className="hover:underline flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            <Ticket className="h-4 w-4" />
            Manage Tickets
          </Link>
          <Link href="/admin/assets" className="hover:underline flex items-center gap-1" style={{ color: 'var(--blue)' }}>
            <Package className="h-4 w-4" />
            Assets
          </Link>
          <Link href="/admin/contractors" className="hover:underline flex items-center gap-1" style={{ color: 'var(--green)' }}>
            <Wrench className="h-4 w-4" />
            Contractors
          </Link>
          <Link href="/admin/invoices" className="hover:underline flex items-center gap-1" style={{ color: 'var(--amber)' }}>
            <FileText className="h-4 w-4" />
            Invoices
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Urgent Tickets */}
          <Card style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center font-medium" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                <AlertTriangle className="h-5 w-5 mr-2" style={{ color: 'var(--red)' }} />
                Urgent Tickets
              </CardTitle>
              <Badge variant="destructive" style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{urgentTickets.length}</Badge>
            </CardHeader>
            <CardContent>
              {urgentTickets.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle className="h-12 w-12 mx-auto mb-2" style={{ color: 'var(--green)' }} />
                  <p>No urgent tickets! Great job!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {urgentTickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--red-bg)', border: '1px solid var(--border)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ticket.title}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{ticket.ticketNumber || ticket.id.slice(0, 8)}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Badge variant={getPriorityVariant(ticket.priority)} style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{ticket.priority}</Badge>
                        <Link href={`/admin/tickets`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center font-medium" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                <Clock className="h-5 w-5 mr-2" style={{ color: 'var(--blue)' }} />
                Recent Tickets
              </CardTitle>
              <Link href="/admin/tickets">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentTickets.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  <Ticket className="h-12 w-12 mx-auto mb-2" style={{ color: 'var(--border-strong)' }} />
                  <p>No tickets yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg transition-colors" style={{ ['--hover-bg' as string]: 'var(--surface2)' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface2)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--blue-bg)' }}>
                          <Ticket className="h-5 w-5" style={{ color: 'var(--blue)' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ticket.title}</p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {ticket.user?.name || 'Unknown'} • {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(ticket.status)} style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
