'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Ticket, Clock, CheckCircle, DollarSign, ChevronDown } from 'lucide-react'
import { Card, CardTitle, MonoLabel, Badge, Avatar, StatCard, getInitials, avatarTint, type BadgeVariant } from '@/components/admin/kit'

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
  user: { name: string; email: string }
  assignedTo?: { name: string; email: string } | null
  createdAt: string
  updatedAt: string
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  OPEN: 'amber', ASSIGNED: 'blue', ACCEPTED: 'blue', IN_PROGRESS: 'blue', PROCESSING: 'blue',
  ON_SITE: 'violet', AWAITING_QUOTE: 'amber', QUOTE_SUBMITTED: 'amber',
  AWAITING_DESCRIPTION: 'amber', AWAITING_WORK_APPROVAL: 'amber',
  COMPLETED: 'green', CLOSED: 'neutral', CANCELLED: 'red',
}
const PRIORITY_VARIANT: Record<string, BadgeVariant> = { LOW: 'green', MEDIUM: 'amber', HIGH: 'orange', CRITICAL: 'red', URGENT: 'red' }
// Category dot colour derived from ticket type (seed-style palette).
const TYPE_COLOR: Record<string, string> = {
  REPAIR: '#5A51D6', MAINTENANCE: '#2D6A4F', INSPECTION: '#1E40AF',
  INSTALLATION: '#9A3412', REPLACEMENT: '#5B21B6', EMERGENCY: '#991B1B', OTHER: '#9E9C94',
}
const money = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const statusLabel = (s: string) => s.replace(/_/g, ' ')

export function AdminDashboard({ user }: { user: User }) {
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [stats, setStats] = useState({
    openTickets: 0, inProgressTickets: 0, completedMTD: 0, needsAttention: 0,
    highPriorityTickets: 0, contractorCount: 0, userCount: 0, totalCostMTD: 0,
  })
  const [weeks, setWeeks] = useState<{ label: string; created: number; resolved: number }[]>([])
  const [sla, setSla] = useState<{ rate: number | null; delta: number | null }>({ rate: null, delta: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [ticketsRes, statsRes, extrasRes] = await Promise.all([
          fetch('/api/admin/tickets'),
          fetch('/api/admin/stats'),
          fetch('/api/admin/stats/dashboard-extras'),
        ])
        const ticketsData = await ticketsRes.json()
        const statsData = await statsRes.json()
        const extrasData = await extrasRes.json()
        setTickets(ticketsData.tickets || [])
        if (statsData.stats) setStats((s) => ({ ...s, ...statsData.stats }))
        if (Array.isArray(extrasData.weeks)) setWeeks(extrasData.weeks)
        if (extrasData.sla) setSla(extrasData.sla)
      } catch (e) {
        console.error('Failed to fetch admin data:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  })()
  const firstName = (user.name || 'there').split(' ')[0]

  const recent = tickets.slice(0, 5)
  const urgent = tickets
    .filter((t) => ['HIGH', 'CRITICAL', 'URGENT'].includes(t.priority) && ['OPEN', 'PROCESSING', 'IN_PROGRESS', 'ON_SITE'].includes(t.status))
    .slice(0, 3)

  // Contractors on the job — derived from assigned tickets.
  const onJob = (() => {
    const counts = new Map<string, number>()
    tickets.forEach((t) => {
      if (t.assignedTo?.name && ['ACCEPTED', 'IN_PROGRESS', 'ON_SITE', 'ASSIGNED'].includes(t.status)) {
        counts.set(t.assignedTo.name, (counts.get(t.assignedTo.name) || 0) + 1)
      }
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
  })()

  const volumeMax = Math.max(1, ...weeks.flatMap((w) => [w.created, w.resolved]))

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ padding: '26px 32px 48px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Greeting */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 300, letterSpacing: '-0.03em' }}>{greeting}, {firstName}</h1>
            <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              {stats.needsAttention > 0 && (
                <> — <span style={{ color: 'var(--red)', fontWeight: 500 }}>{stats.needsAttention} ticket{stats.needsAttention === 1 ? '' : 's'}</span> need your attention today.</>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 13px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            All branches
            <ChevronDown size={12} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard label="Open" value={stats.openTickets} icon={<Ticket size={13} strokeWidth={1.8} />} tint="var(--amber-bg)" iconColor="var(--amber)"
            delta={stats.needsAttention > 0 ? `${stats.needsAttention} urgent` : undefined} deltaColor="var(--red)" note={stats.needsAttention > 0 ? 'need attention' : 'all clear'} />
          <StatCard label="In progress" value={stats.inProgressTickets} icon={<Clock size={13} strokeWidth={1.8} />} tint="var(--blue-bg)" iconColor="var(--blue)" note="active now" />
          <StatCard label="Completed — MTD" value={stats.completedMTD} icon={<CheckCircle size={13} strokeWidth={1.8} />} tint="var(--green-bg)" iconColor="var(--green)" note="this month" />
          <StatCard label="Approved cost — MTD" value={money(stats.totalCostMTD)} icon={<DollarSign size={13} strokeWidth={1.8} />} tint="var(--accent-soft)" iconColor="var(--accent-color)" note="this month" />
        </div>

        {/* Two-column */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, alignItems: 'stretch' }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Volume chart */}
            <Card padding="20px 22px">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <CardTitle>Ticket volume</CardTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 3, background: 'var(--accent-color)' }} />Created</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 3, background: 'var(--accent-soft-2)' }} />Resolved</span>
                  <MonoLabel size={10} spacing="0.08em" color="var(--text-faint)">Last 8 weeks</MonoLabel>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, marginTop: 18 }}>
                {weeks.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>No ticket activity yet.</div>
                )}
                {weeks.map((w, i) => (
                  <div key={i} title={`${w.label}: ${w.created} created, ${w.resolved} resolved`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 170 }}>
                      <div style={{ width: 14, borderRadius: '5px 5px 2px 2px', background: 'var(--accent-color)', height: `${Math.round((w.created / volumeMax) * 100)}%` }} />
                      <div style={{ width: 14, borderRadius: '5px 5px 2px 2px', background: 'var(--accent-soft-2)', height: `${Math.round((w.resolved / volumeMax) * 100)}%` }} />
                    </div>
                    <MonoLabel size={10} spacing="0" color="var(--text-faint)">{w.label}</MonoLabel>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent tickets */}
            <Card padding="8px 0" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px 8px' }}>
                <CardTitle>Recent tickets</CardTitle>
                <Link href="/admin/tickets" className="link-accent" style={{ fontSize: 12.5, textDecoration: 'none' }}>View all →</Link>
              </div>
              {recent.length === 0 && <div style={{ padding: '16px 22px', fontSize: 13, color: 'var(--text-muted)' }}>No tickets yet.</div>}
              {recent.map((t) => (
                <Link key={t.id} href={`/admin/tickets/${t.id}`} className="ds-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 22px', textDecoration: 'none', color: 'inherit' }}>
                  <MonoLabel size={11.5} spacing="0" color="var(--text-muted)" style={{ width: 70, flex: 'none', textTransform: 'none' }}>{t.ticketNumber || t.id.slice(0, 6)}</MonoLabel>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: TYPE_COLOR[t.type] || '#9E9C94', flex: 'none' }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 'none' }}>{t.assignedTo?.name || 'Unassigned'}</span>
                  <Badge variant={STATUS_VARIANT[t.status] || 'neutral'}>{statusLabel(t.status)}</Badge>
                </Link>
              ))}
            </Card>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Needs attention */}
            <Card padding="18px 20px">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <CardTitle>Needs attention</CardTitle>
                {urgent.length > 0 && <Badge variant="red">{urgent.length} urgent</Badge>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {urgent.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nothing urgent. 🎉</div>}
                {urgent.map((u) => (
                  <Link key={u.id} href={`/admin/tickets/${u.id}`} style={{ border: '1px solid var(--border-inner)', borderRadius: 10, padding: '11px 13px', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--red)', flex: 'none' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingLeft: 15 }}>
                      <MonoLabel size={10.5} spacing="0" color="var(--text-muted)" style={{ textTransform: 'none' }}>{u.ticketNumber || u.id.slice(0, 6)}</MonoLabel>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>· {statusLabel(u.type)}</span>
                      <span style={{ flex: 1 }} />
                      <Badge variant={PRIORITY_VARIANT[u.priority] || 'neutral'}>{u.priority}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* On the job */}
            <Card padding="18px 20px">
              <CardTitle>On the job</CardTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                {onJob.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No contractors on active jobs.</div>}
                {onJob.map(([name, count]) => {
                  const t = avatarTint(name)
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar initials={getInitials(name)} size={34} tint={t.tint} color={t.color} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Contractor</div>
                      </div>
                      <Badge variant="blue">{count} job{count === 1 ? '' : 's'}</Badge>
                    </div>
                  )
                })}
              </div>
              <Link href="/admin/contractors" style={{ display: 'block', marginTop: 14 }}>
                <button className="filter-chip" style={{ width: '100%', justifyContent: 'center' }}>All contractors</button>
              </Link>
            </Card>

            {/* SLA compliance — MTD (resolution deadline met) */}
            <div className="card-dark" style={{ padding: '18px 20px' }}>
              <MonoLabel size={10} color="rgba(247,246,243,0.55)">SLA compliance — MTD</MonoLabel>
              {sla.rate === null ? (
                <>
                  <div style={{ fontSize: 31, fontWeight: 300, letterSpacing: '-0.03em', marginTop: 8, color: 'rgba(247,246,243,0.6)' }}>—</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(247,246,243,0.5)', marginTop: 10 }}>No resolved tickets with an SLA target yet this month.</div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                    <span style={{ fontSize: 31, fontWeight: 300, letterSpacing: '-0.03em' }}>{sla.rate}%</span>
                    {sla.delta !== null && sla.delta !== 0 && (
                      <span style={{ fontSize: 12, color: sla.delta > 0 ? '#6EE7B7' : '#FCA5A5', fontWeight: 500 }}>
                        {sla.delta > 0 ? '▲' : '▼'} {Math.abs(sla.delta)}%
                      </span>
                    )}
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: '#3D3C38', marginTop: 12, overflow: 'hidden' }}>
                    <div style={{ width: `${sla.rate}%`, height: '100%', background: '#4ADE80', borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(247,246,243,0.5)', marginTop: 10 }}>Resolved within the resolution SLA target.</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
