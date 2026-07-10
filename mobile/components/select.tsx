import { useMemo, useState } from 'react'
import { View, Text, Pressable, Modal, TextInput, FlatList } from 'react-native'
import { colors, radius, font } from '@/lib/theme'

export interface Option {
  label: string
  value: string
  hint?: string
}

export function Dropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  searchable = false,
}: {
  label?: string
  value: string | null
  options: Option[]
  onChange: (v: string) => void
  placeholder?: string
  searchable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((o) => o.value === value)
  const filtered = useMemo(
    () =>
      searchable && query
        ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
        : options,
    [options, query, searchable],
  )

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control,
          paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontFamily: font.sans, fontSize: 15, color: selected ? colors.textPrimary : colors.textMuted }} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 24 }}
            onPress={() => {}}
          >
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.rowSep }}>
              <Text style={{ fontFamily: font.sansMedium, fontSize: 15, color: colors.textPrimary }}>{label || placeholder}</Text>
            </View>
            {searchable && (
              <View style={{ padding: 12 }}>
                <TextInput
                  placeholder="Search…"
                  placeholderTextColor={colors.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  style={{
                    borderWidth: 1, borderColor: colors.border, borderRadius: radius.control,
                    paddingHorizontal: 12, paddingVertical: 10, fontFamily: font.sans, fontSize: 14, color: colors.textPrimary,
                  }}
                />
              </View>
            )}
            <FlatList
              data={filtered}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.value === value
                return (
                  <Pressable
                    onPress={() => { onChange(item.value); setOpen(false); setQuery('') }}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.rowSep,
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      backgroundColor: active ? colors.accentSoft : 'transparent',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.sans, fontSize: 15, color: active ? colors.accent : colors.textPrimary }}>{item.label}</Text>
                      {item.hint ? <Text style={{ fontFamily: font.sans, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{item.hint}</Text> : null}
                    </View>
                    {active ? <Text style={{ color: colors.accent }}>✓</Text> : null}
                  </Pressable>
                )
              }}
              ListEmptyComponent={<Text style={{ padding: 16, fontFamily: font.sans, color: colors.textMuted }}>No options</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
