import { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { useApi } from '@/lib/api'
import { colors, font, radius, ASSET_STATUS_VARIANT, STATUS_VARIANT, statusLabel } from '@/lib/theme'
import { Screen, Card, Badge, Mono, Loading } from '@/components/ui'

interface RepairItem {
  id?: string
  ticketNumber?: string
  title?: string
  status?: string
}
interface Asset {
  id: string
  assetNumber?: string
  name: string
  status: string
  description?: string | null
  location?: string | null
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  warrantyExpires?: string | null
  category?: { id: string; name: string } | null
  repairHistory?: RepairItem[]
}

export default function AssetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const api = useApi()
  const router = useRouter()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(`/api/assets/${id}`)
      setAsset(data.asset || data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Loading />
  if (!asset) return <Screen><Text style={{ fontFamily: font.sans, color: colors.red }}>{error ?? 'Asset not found'}</Text></Screen>

  const rows: [string, string | null | undefined][] = [
    ['Category', asset.category?.name],
    ['Location', asset.location],
    ['Brand / Model', [asset.brand, asset.model].filter(Boolean).join(' ') || null],
    ['Serial', asset.serialNumber],
    ['Warranty', asset.warrantyExpires ? new Date(asset.warrantyExpires).toLocaleDateString() : null],
  ]

  return (
    <Screen>
      <View>
        <Text style={{ fontFamily: font.sansLight, fontSize: 24, letterSpacing: -0.5, color: colors.textPrimary }}>{asset.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Mono size={11} style={{ textTransform: 'none' as any }}>{asset.assetNumber || asset.id.slice(0, 6)}</Mono>
          <Badge variant={ASSET_STATUS_VARIANT[asset.status] || 'neutral'}>{statusLabel(asset.status)}</Badge>
        </View>
      </View>

      <Card>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ fontFamily: font.sans, fontSize: 13, color: colors.textMuted }}>{k}</Text>
            <Text style={{ fontFamily: font.sans, fontSize: 13, color: colors.textPrimary, maxWidth: '60%', textAlign: 'right' }}>{v || '—'}</Text>
          </View>
        ))}
      </Card>

      <Mono size={10.5}>REPAIR HISTORY</Mono>
      {(asset.repairHistory ?? []).length === 0 ? (
        <Text style={{ fontFamily: font.sans, fontSize: 13, color: colors.textMuted }}>No repairs recorded.</Text>
      ) : (
        (asset.repairHistory ?? []).map((r, i) => (
          <Card key={r.id || i} onPress={r.id ? () => router.push({ pathname: '/ticket/[id]', params: { id: r.id! } }) : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Mono size={11} style={{ textTransform: 'none' as any }}>{r.ticketNumber || (r.id ? r.id.slice(0, 6) : '')}</Mono>
              <View style={{ flex: 1 }} />
              {r.status ? <Badge variant={STATUS_VARIANT[r.status] || 'neutral'}>{statusLabel(r.status)}</Badge> : null}
            </View>
            <Text style={{ fontFamily: font.sansMedium, fontSize: 13.5, color: colors.textPrimary }} numberOfLines={2}>{r.title}</Text>
          </Card>
        ))
      )}

      <Pressable
        onPress={() =>
          router.push({
            pathname: '/new-ticket',
            params: { assetId: asset.id, ...(asset.category?.id ? { categoryId: asset.category.id } : {}) },
          })
        }
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radius.control, backgroundColor: colors.accent, marginTop: 4 }}
      >
        <Plus color={colors.white} size={18} strokeWidth={2} />
        <Text style={{ color: colors.white, fontFamily: font.sansMedium, fontSize: 14 }}>Report an issue on this asset</Text>
      </Pressable>
    </Screen>
  )
}
