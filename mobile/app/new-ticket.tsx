import { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useApi } from '@/lib/api'
import { colors, font, radius } from '@/lib/theme'
import { Button, Mono } from '@/components/ui'

const TYPES = ['REPAIR', 'MAINTENANCE', 'INSPECTION', 'INSTALLATION', 'REPLACEMENT', 'EMERGENCY', 'OTHER']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function NewTicket() {
  const api = useApi()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('REPAIR')
  const [priority, setPriority] = useState('MEDIUM')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing details', 'Please add a title and description.')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/tickets', { title: title.trim(), description: description.trim(), type, priority })
      router.back()
    } catch (e: any) {
      Alert.alert('Could not create ticket', e?.message ?? 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, backgroundColor: colors.surface,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: font.sans, fontSize: 15, color: colors.textPrimary,
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Field label="TITLE">
        <TextInput placeholder="Brief summary" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} style={inputStyle} />
      </Field>

      <Field label="DESCRIPTION">
        <TextInput
          placeholder="What's the problem?" placeholderTextColor={colors.textMuted}
          value={description} onChangeText={setDescription} multiline
          style={[inputStyle, { height: 120, textAlignVertical: 'top' }]}
        />
      </Field>

      <Field label="TYPE">
        <ChipRow options={TYPES} value={type} onChange={setType} />
      </Field>

      <Field label="PRIORITY">
        <ChipRow options={PRIORITIES} value={priority} onChange={setPriority} />
      </Field>

      <Button label="Create ticket" onPress={submit} loading={saving} />
    </ScrollView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Mono size={10.5}>{label}</Mono>
      {children}
    </View>
  )
}

function ChipRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = o === value
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={{
              paddingHorizontal: 13, height: 32, borderRadius: radius.pill, justifyContent: 'center',
              borderWidth: 1, borderColor: active ? colors.accent : colors.border,
              backgroundColor: active ? colors.accentSoft : colors.surface,
            }}
          >
            <Text style={{ fontFamily: active ? font.sansMedium : font.sans, fontSize: 12.5, color: active ? colors.accent : colors.textTertiary }}>
              {o.charAt(0) + o.slice(1).toLowerCase()}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
