import { useCallback, useEffect, useState } from 'react'
import { View, Text, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { useApi } from '@/lib/api'
import { colors, font, STATUS_VARIANT, PRIORITY_VARIANT, statusLabel } from '@/lib/theme'
import { Screen, Card, Badge, Mono, Button, Loading } from '@/components/ui'

interface Ticket {
  id: string
  ticketNumber?: string
  title: string
  description?: string
  status: string
  priority: string
  type?: string
  createdAt?: string
  user?: { name?: string | null } | null
  assignedTo?: { name?: string | null } | null
}

// Which contractor action(s) are offered for the current status.
const NEXT_ACTIONS: Record<string, { action: string; label: string }[]> = {
  OPEN: [{ action: 'accept', label: 'Accept job' }, { action: 'reject', label: 'Decline' }],
  ASSIGNED: [{ action: 'accept', label: 'Accept job' }, { action: 'reject', label: 'Decline' }],
  ACCEPTED: [{ action: 'start', label: 'Start work' }],
  IN_PROGRESS: [{ action: 'on_site', label: 'Mark on site' }],
  ON_SITE: [{ action: 'complete', label: 'Mark complete' }],
}

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useUser()
  const api = useApi()
  const role = ((user?.publicMetadata as any)?.role as string) ?? 'END_USER'
  const isContractor = role === 'CONTRACTOR'

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(isContractor ? `/api/contractor/jobs/${id}` : `/api/tickets/${id}`)
      setTicket(data.job || data.ticket || data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isContractor])

  useEffect(() => {
    load()
  }, [load])

  const runAction = async (action: string) => {
    setBusy(true)
    try {
      await api.patch(`/api/contractor/jobs/${id}`, { action })
      await load()
    } catch (e: any) {
      Alert.alert('Action failed', e?.message ?? 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  if (!ticket) return <Screen><Text style={{ color: colors.red, fontFamily: font.sans }}>{error ?? 'Not found'}</Text></Screen>

  const actions = isContractor ? NEXT_ACTIONS[ticket.status] ?? [] : []

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Mono size={11} style={{ textTransform: 'none' as any }}>{ticket.ticketNumber || ticket.id.slice(0, 8)}</Mono>
        <Badge variant={PRIORITY_VARIANT[ticket.priority] || 'neutral'}>{ticket.priority}</Badge>
        <Badge variant={STATUS_VARIANT[ticket.status] || 'neutral'}>{statusLabel(ticket.status)}</Badge>
      </View>
      <Text style={{ fontFamily: font.sansLight, fontSize: 22, letterSpacing: -0.5, color: colors.textPrimary }}>{ticket.title}</Text>

      {ticket.description ? (
        <Card>
          <Mono size={10.5}>Description</Mono>
          <Text style={{ fontFamily: font.sans, fontSize: 14, color: colors.textPrimary, marginTop: 8, lineHeight: 21 }}>{ticket.description}</Text>
        </Card>
      ) : null}

      <Card>
        <DetailRow label="TYPE" value={ticket.type ? statusLabel(ticket.type) : '—'} />
        <DetailRow label="REPORTED BY" value={ticket.user?.name ?? '—'} />
        <DetailRow label="ASSIGNED TO" value={ticket.assignedTo?.name ?? 'Unassigned'} />
        {ticket.createdAt ? <DetailRow label="CREATED" value={new Date(ticket.createdAt).toLocaleDateString()} /> : null}
      </Card>

      {actions.map((a) => (
        <Button key={a.action} label={a.label} onPress={() => runAction(a.action)} loading={busy} variant={a.action === 'reject' ? 'ghost' : 'accent'} />
      ))}
    </Screen>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Mono size={10.5}>{label}</Mono>
      <Text style={{ fontFamily: font.sans, fontSize: 13.5, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  )
}
