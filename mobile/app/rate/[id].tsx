import { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Star } from 'lucide-react-native'
import { useApi } from '@/lib/api'
import { colors, font, radius } from '@/lib/theme'
import { Button, Mono, Card } from '@/components/ui'

export default function RateService() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const api = useApi()
  const router = useRouter()

  const [punctuality, setPunctuality] = useState(5)
  const [customerService, setCustomerService] = useState(5)
  const [workmanship, setWorkmanship] = useState(5)
  const [overall, setOverall] = useState(5)
  const [ppeCompliant, setPpeCompliant] = useState(true)
  const [followedProcedures, setFollowedProcedures] = useState(true)
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await api.post(`/api/tickets/${id}/rating`, {
        punctualityRating: punctuality,
        customerServiceRating: customerService,
        workmanshipRating: workmanship,
        overallRating: overall,
        ppeCompliant,
        followedSiteProcedures: followedProcedures,
        additionalComments: comments.trim() || undefined,
      })
      router.back()
    } catch (e: any) {
      Alert.alert('Could not submit rating', e?.message ?? 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card>
        <Stars label="PUNCTUALITY" value={punctuality} onChange={setPunctuality} min={0} />
        <Stars label="CUSTOMER SERVICE" value={customerService} onChange={setCustomerService} />
        <Stars label="WORKMANSHIP" value={workmanship} onChange={setWorkmanship} />
        <Stars label="OVERALL" value={overall} onChange={setOverall} />
      </Card>

      <Card>
        <YesNo label="PPE compliant" value={ppeCompliant} onChange={setPpeCompliant} />
        <YesNo label="Followed site procedures" value={followedProcedures} onChange={setFollowedProcedures} />
      </Card>

      <View style={{ gap: 8 }}>
        <Mono size={10.5}>COMMENTS (OPTIONAL)</Mono>
        <TextInput
          value={comments}
          onChangeText={setComments}
          multiline
          placeholder="Anything else to add?"
          placeholderTextColor={colors.textMuted}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, backgroundColor: colors.surface, padding: 12, minHeight: 90, textAlignVertical: 'top', fontFamily: font.sans, fontSize: 14, color: colors.textPrimary }}
        />
      </View>

      <Button label="Submit rating" onPress={submit} loading={saving} />
    </ScrollView>
  )
}

function Stars({ label, value, onChange, min = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Mono size={10.5}>{label}</Mono>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= value
          return (
            <Pressable key={n} onPress={() => onChange(n === value && min === 0 && n === 1 ? 0 : n)} hitSlop={4}>
              <Star size={24} color={filled ? colors.amber : colors.border} fill={filled ? colors.amber : 'transparent'} strokeWidth={1.5} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ fontFamily: font.sans, fontSize: 14, color: colors.textPrimary }}>{label}</Text>
      <Pressable
        onPress={() => onChange(!value)}
        style={{ width: 48, height: 27, borderRadius: 99, backgroundColor: value ? colors.accent : colors.border, padding: 3, justifyContent: 'center' }}
      >
        <View style={{ width: 21, height: 21, borderRadius: 99, backgroundColor: colors.white, alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </Pressable>
    </View>
  )
}
