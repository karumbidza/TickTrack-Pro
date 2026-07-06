import { useCallback, useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { useApi } from '@/lib/api'
import { colors, font, statusLabel, type BadgeVariant } from '@/lib/theme'
import { Screen, ScreenTitle, Card, Badge, Mono, Loading, EmptyState } from '@/components/ui'

interface Invoice {
  id: string
  invoiceNumber?: string
  amount?: number
  status: string
  createdAt?: string
  ticket?: { title?: string } | null
}

const INVOICE_VARIANT: Record<string, BadgeVariant> = {
  PENDING: 'amber', APPROVED: 'blue', PAID: 'green', REJECTED: 'red', CANCELLED: 'neutral', PROCESSING: 'blue',
}
const money = (n?: number) => `$${(n || 0).toLocaleString()}`

export default function Invoices() {
  const api = useApi()
  const [items, setItems] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await api.get<any>('/api/contractor/invoices')
      setItems(data.invoices || (Array.isArray(data) ? data : []))
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
      <ScreenTitle title="Invoices" subtitle={`${items.length} invoice${items.length === 1 ? '' : 's'}`} />
      {error ? <Text style={{ color: colors.red, fontFamily: font.sans, fontSize: 13 }}>{error}</Text> : null}
      {items.length === 0 && !error && <EmptyState message="No invoices yet." />}
      {items.map((inv) => (
        <Card key={inv.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Mono size={11} style={{ textTransform: 'none' as any }}>{inv.invoiceNumber || inv.id.slice(0, 8)}</Mono>
            <View style={{ flex: 1 }} />
            <Badge variant={INVOICE_VARIANT[inv.status] || 'neutral'}>{statusLabel(inv.status)}</Badge>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: font.sans, fontSize: 13.5, color: colors.textSecondary, flexShrink: 1 }} numberOfLines={1}>{inv.ticket?.title ?? 'Invoice'}</Text>
            <Text style={{ fontFamily: font.monoMedium, fontSize: 15, color: colors.textPrimary }}>{money(inv.amount)}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  )
}
