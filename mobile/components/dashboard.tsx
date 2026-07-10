import { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { Plus, ChevronRight, AlertTriangle } from 'lucide-react-native'
import { useApi } from '@/lib/api'
import { colors, font, radius, STATUS_VARIANT, PRIORITY_VARIANT, statusLabel, ticketStatGroup } from '@/lib/theme'
import { Screen, Card, Badge, Mono, Loading } from '@/components/ui'

interface TicketItem {
  id: string
  ticketNumber?: string
  title: string
  status: string
  priority: string
  createdAt?: string
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const { user } = useUser()
  const api = useApi()
  const router = useRouter()

  const [items, setItems] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>('/api/tickets')
      setItems(data.tickets || (Array.isArray(data) ? data : []))
    } catch {
      // dashboard is best-effort; leave lists empty on error
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Loading />

  const counts = { open: 0, inProgress: 0, completed: 0 }
  items.forEach((t) => {
    const g = ticketStatGroup(t.status)
    if (g) counts[g] += 1
  })
  const awaitingApproval = items.filter((t) => t.status === 'AWAITING_WORK_APPROVAL')
  const recent = [...items]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 3)

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'there'

  const stats: { key: string; label: string; value: number; color: string; filter?: string }[] = [
    { key: 'open', label: 'Open', value: counts.open, color: colors.amber, filter: 'open' },
    { key: 'inProgress', label: 'In progress', value: counts.inProgress, color: colors.blue, filter: 'inProgress' },
    { key: 'completed', label: 'Completed', value: counts.completed, color: colors.green, filter: 'completed' },
    { key: 'total', label: 'Total', value: items.length, color: colors.textPrimary },
  ]

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }}>
      <View style={{ marginBottom: 4 }}>
        <Text style={{ fontFamily: font.sansLight, fontSize: 26, letterSpacing: -0.6, color: colors.textPrimary }}>
          {greeting()}, {firstName}
        </Text>
        <Text style={{ fontFamily: font.sans, fontSize: 13.5, color: colors.textSecondary, marginTop: 3 }}>
          Here's what's happening
        </Text>
      </View>

      {awaitingApproval.length > 0 && (
        <Pressable
          onPress={() => router.push('/(tabs)/tickets')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.amberBg, borderRadius: radius.card, padding: 14 }}
        >
          <AlertTriangle color={colors.amber} size={18} strokeWidth={2} />
          <Text style={{ flex: 1, fontFamily: font.sansMedium, fontSize: 13.5, color: colors.amber }}>
            {awaitingApproval.length} ticket{awaitingApproval.length === 1 ? '' : 's'} awaiting your approval
          </Text>
          <ChevronRight color={colors.amber} size={18} />
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stats.map((s) => (
          <Pressable
            key={s.key}
            onPress={s.filter ? () => router.push({ pathname: '/(tabs)/tickets', params: { filter: s.filter! } }) : undefined}
            style={{ width: '47.5%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 14 }}
          >
            <Text style={{ fontFamily: font.sansMedium, fontSize: 24, color: s.color }}>{s.value}</Text>
            <Text style={{ fontFamily: font.sans, fontSize: 12.5, color: colors.textSecondary, marginTop: 2 }}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/new-ticket')}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radius.control, backgroundColor: colors.accent }}
      >
        <Plus color={colors.white} size={18} strokeWidth={2} />
        <Text style={{ color: colors.white, fontFamily: font.sansMedium, fontSize: 14 }}>New ticket</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
        <Text style={{ fontFamily: font.sansMedium, fontSize: 14, color: colors.textPrimary }}>Recent tickets</Text>
        <Pressable onPress={() => router.push('/(tabs)/tickets')}>
          <Text style={{ fontFamily: font.sans, fontSize: 13, color: colors.accent }}>See all ›</Text>
        </Pressable>
      </View>

      {recent.length === 0 ? (
        <Text style={{ fontFamily: font.sans, fontSize: 13, color: colors.textMuted }}>No tickets yet.</Text>
      ) : (
        recent.map((t) => (
          <Card key={t.id} onPress={() => router.push(`/ticket/${t.id}`)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Mono size={11} style={{ textTransform: 'none' as any }}>{t.ticketNumber || t.id.slice(0, 6)}</Mono>
              <View style={{ flex: 1 }} />
              <Badge variant={PRIORITY_VARIANT[t.priority] || 'neutral'}>{t.priority}</Badge>
              <Badge variant={STATUS_VARIANT[t.status] || 'neutral'}>{statusLabel(t.status)}</Badge>
            </View>
            <Text style={{ fontFamily: font.sansMedium, fontSize: 14, color: colors.textPrimary }} numberOfLines={1}>{t.title}</Text>
          </Card>
        ))
      )}
    </Screen>
  )
}
