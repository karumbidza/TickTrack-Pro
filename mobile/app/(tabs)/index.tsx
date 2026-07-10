import { useCallback, useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { useApi } from '@/lib/api'
import { colors, font, STATUS_VARIANT, PRIORITY_VARIANT, statusLabel } from '@/lib/theme'
import { Screen, ScreenTitle, Card, Badge, Mono, Loading, EmptyState } from '@/components/ui'
import { Dashboard } from '@/components/dashboard'

interface JobItem {
  id: string
  ticketNumber?: string
  title: string
  status: string
  priority: string
}

function ContractorJobs() {
  const api = useApi()
  const router = useRouter()
  const [items, setItems] = useState<JobItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await api.get<any>('/api/contractor/jobs')
      setItems(data.jobs || (Array.isArray(data) ? data : []))
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

  if (loading) return <Loading />

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }}>
      <ScreenTitle title="My jobs" subtitle={`${items.length} assigned job${items.length === 1 ? '' : 's'}`} />
      {error ? <Text style={{ color: colors.red, fontFamily: font.sans, fontSize: 13 }}>{error}</Text> : null}
      {items.length === 0 && !error && <EmptyState message="No jobs assigned yet." />}
      {items.map((t) => (
        <Card key={t.id} onPress={() => router.push(`/ticket/${t.id}`)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Mono size={11} style={{ textTransform: 'none' as any }}>{t.ticketNumber || t.id.slice(0, 6)}</Mono>
            <View style={{ flex: 1 }} />
            <Badge variant={PRIORITY_VARIANT[t.priority] || 'neutral'}>{t.priority}</Badge>
            <Badge variant={STATUS_VARIANT[t.status] || 'neutral'}>{statusLabel(t.status)}</Badge>
          </View>
          <Text style={{ fontFamily: font.sansMedium, fontSize: 14.5, color: colors.textPrimary }} numberOfLines={2}>{t.title}</Text>
        </Card>
      ))}
    </Screen>
  )
}

export default function Home() {
  const { user } = useUser()
  const role = ((user?.publicMetadata as any)?.role as string) ?? 'END_USER'
  if (role === 'CONTRACTOR') return <ContractorJobs />
  return <Dashboard />
}
