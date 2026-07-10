import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useApi } from '@/lib/api'
import { colors, font, radius, ASSET_STATUS_VARIANT, statusLabel } from '@/lib/theme'
import { Screen, ScreenTitle, Card, Badge, Mono, Loading, EmptyState } from '@/components/ui'

interface Asset {
  id: string
  assetNumber?: string
  name: string
  status: string
  location?: string | null
  category?: { id: string; name: string; color?: string | null } | null
}
interface Category { id: string; name: string }

export default function Assets() {
  const api = useApi()
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [a, c] = await Promise.all([
        api.get<any>('/api/assets'),
        api.get<any>('/api/asset-categories'),
      ])
      setAssets(a.assets || [])
      setCategories(c.categories || [])
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return assets.filter((a) => {
      if (catFilter && a.category?.id !== catFilter) return false
      if (q && !(`${a.name} ${a.assetNumber ?? ''}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [assets, query, catFilter])

  if (loading) return <Loading />

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }}>
      <ScreenTitle title="Assets" subtitle={`${visible.length} asset${visible.length === 1 ? '' : 's'}`} />

      <TextInput
        placeholder="Search assets..." placeholderTextColor={colors.textMuted}
        value={query} onChangeText={setQuery} autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 11, fontFamily: font.sans, fontSize: 14, color: colors.textPrimary }}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <FilterChip label="All" active={catFilter === null} onPress={() => setCatFilter(null)} />
        {categories.map((c) => (
          <FilterChip key={c.id} label={c.name} active={catFilter === c.id} onPress={() => setCatFilter(c.id)} />
        ))}
      </View>

      {error ? <Text style={{ color: colors.red, fontFamily: font.sans, fontSize: 13 }}>{error}</Text> : null}
      {visible.length === 0 && !error && <EmptyState message="No assets found." />}

      {visible.map((a) => (
        <Card key={a.id} onPress={() => router.push({ pathname: '/asset/[id]', params: { id: a.id } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Mono size={11} style={{ textTransform: 'none' as any }}>{a.assetNumber || a.id.slice(0, 6)}</Mono>
            <View style={{ flex: 1 }} />
            <Badge variant={ASSET_STATUS_VARIANT[a.status] || 'neutral'}>{statusLabel(a.status)}</Badge>
          </View>
          <Text style={{ fontFamily: font.sansMedium, fontSize: 14.5, color: colors.textPrimary }} numberOfLines={1}>{a.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
            {a.category?.color ? <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: a.category.color }} /> : null}
            <Text style={{ fontFamily: font.sans, fontSize: 12.5, color: colors.textSecondary }}>
              {[a.category?.name, a.location].filter(Boolean).join(' · ') || '—'}
            </Text>
          </View>
        </Card>
      ))}
    </Screen>
  )
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 13, height: 32, borderRadius: radius.pill, justifyContent: 'center', borderWidth: 1, borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accentSoft : colors.surface }}
    >
      <Text style={{ fontFamily: active ? font.sansMedium : font.sans, fontSize: 12.5, color: active ? colors.accent : colors.textTertiary }}>{label}</Text>
    </Pressable>
  )
}
