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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
      ON_SITE: 'bg-purple-100 text-purple-800',
      PENDING_REVIEW: 'bg-indigo-100 text-indigo-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
      URGENT: 'bg-red-100 text-red-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name || 'Admin'}</h1>
            <p className="text-gray-600">Here's what's happening with your tickets today</p>
          </div>
          <Badge variant="outline" className="text-base px-4 py-2">
            {formatRole(user.role)}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-100">Open</CardTitle>
              <AlertCircle className="h-5 w-5 text-amber-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.openTickets}</div>
              <p className="text-xs text-amber-200 mt-1">Awaiting assignment</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">In Progress</CardTitle>
              <Clock className="h-5 w-5 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.inProgressTickets}</div>
              <p className="text-xs text-purple-200 mt-1">Being worked on</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Completed</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completedMTD}</div>
              <p className="text-xs text-green-200 mt-1">Month to date</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100">Approved Cost</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalCostMTD.toLocaleString()}</div>
              <p className="text-xs text-emerald-200 mt-1">Month to date</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-gray-500 font-medium">Quick links:</span>
          <Link href="/admin/tickets" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
            <Ticket className="h-4 w-4" />
            Manage Tickets
          </Link>
          <Link href="/admin/assets" className="text-cyan-600 hover:text-cyan-800 hover:underline flex items-center gap-1">
            <Package className="h-4 w-4" />
            Assets
          </Link>
          <Link href="/admin/contractors" className="text-green-600 hover:text-green-800 hover:underline flex items-center gap-1">
            <Wrench className="h-4 w-4" />
            Contractors
          </Link>
          <Link href="/admin/invoices" className="text-amber-600 hover:text-amber-800 hover:underline flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Invoices
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Urgent Tickets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                Urgent Tickets
              </CardTitle>
              <Badge variant="destructive">{urgentTickets.length}</Badge>
            </CardHeader>
            <CardContent>
              {urgentTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-2" />
                  <p>No urgent tickets! Great job!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {urgentTickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{ticket.title}</p>
                        <p className="text-sm text-gray-500">{ticket.ticketNumber || ticket.id.slice(0, 8)}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 text-blue-500 mr-2" />
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
                <div className="text-center py-8 text-gray-500">
                  <Ticket className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No tickets yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Ticket className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">{ticket.title}</p>
                          <p className="text-sm text-gray-500">
                            {ticket.user?.name || 'Unknown'} • {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(ticket.status)}>
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
