import { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { useApi } from '@/lib/api'
import { colors, font, radius, STATUS_VARIANT, PRIORITY_VARIANT, statusLabel, ticketStatGroup, type StatGroup } from '@/lib/theme'
import { Screen, ScreenTitle, Card, Badge, Mono, Loading, EmptyState } from '@/components/ui'

interface TicketItem {
  id: string
  ticketNumber?: string
  title: string
  status: string
  priority: string
  assignedTo?: { name?: string | null } | null
}

export default function Tickets() {
  const api = useApi()
  const router = useRouter()
  const { filter } = useLocalSearchParams<{ filter?: string }>()
  const raw = Array.isArray(filter) ? filter[0] : filter
  const STAT_GROUPS: StatGroup[] = ['open', 'inProgress', 'completed']
  const group: StatGroup | null = STAT_GROUPS.includes(raw as StatGroup) ? (raw as StatGroup) : null

  const [items, setItems] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await api.get<any>('/api/tickets')
      const list: TicketItem[] = data.tickets || (Array.isArray(data) ? data : [])
      setItems(list)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = group ? items.filter((t) => ticketStatGroup(t.status) === group) : items
  const groupLabel: Record<StatGroup, string> = { open: 'Open', inProgress: 'In progress', completed: 'Completed' }

  if (loading) return <Loading />

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }}>
      <ScreenTitle
        title={group ? groupLabel[group] : 'My tickets'}
        subtitle={`${visible.length} ticket${visible.length === 1 ? '' : 's'}`}
      />

      <Pressable
        onPress={() => router.push('/new-ticket')}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radius.control, backgroundColor: colors.accent }}
      >
        <Plus color={colors.white} size={18} strokeWidth={2} />
        <Text style={{ color: colors.white, fontFamily: font.sansMedium, fontSize: 14 }}>New ticket</Text>
      </Pressable>

      {error ? <Text style={{ color: colors.red, fontFamily: font.sans, fontSize: 13 }}>{error}</Text> : null}
      {visible.length === 0 && !error && (
        <EmptyState message={group ? `No ${groupLabel[group].toLowerCase()} tickets.` : 'No tickets yet. Tap “New ticket” to create one.'} />
      )}

      {visible.map((t) => (
        <Card key={t.id} onPress={() => router.push(`/ticket/${t.id}`)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Mono size={11} style={{ textTransform: 'none' as any }}>{t.ticketNumber || t.id.slice(0, 6)}</Mono>
            <View style={{ flex: 1 }} />
            <Badge variant={PRIORITY_VARIANT[t.priority] || 'neutral'}>{t.priority}</Badge>
            <Badge variant={STATUS_VARIANT[t.status] || 'neutral'}>{statusLabel(t.status)}</Badge>
          </View>
          <Text style={{ fontFamily: font.sansMedium, fontSize: 14.5, color: colors.textPrimary }} numberOfLines={2}>{t.title}</Text>
          {t.assignedTo?.name ? (
            <Text style={{ fontFamily: font.sans, fontSize: 12.5, color: colors.textMuted, marginTop: 4 }}>Assigned to {t.assignedTo.name}</Text>
          ) : null}
        </Card>
      ))}
    </Screen>
  )
}
