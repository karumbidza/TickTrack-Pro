import React from 'react'
import { View, Text, Pressable, ActivityIndicator, ScrollView, RefreshControl } from 'react-native'
import { colors, radius, font, badgeColors, type BadgeVariant } from '@/lib/theme'

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const c = badgeColors[variant]
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: c.fg, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' }}>{children}</Text>
    </View>
  )
}

export function Card({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: any }) {
  const inner = (
    <View style={[{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16 }, style]}>
      {children}
    </View>
  )
  return onPress ? <Pressable onPress={onPress}>{inner}</Pressable> : inner
}

export function Mono({ children, size = 11, color = colors.textMuted, style }: { children: React.ReactNode; size?: number; color?: string; style?: any }) {
  return <Text style={[{ fontFamily: font.mono, fontSize: size, color }, style]}>{children}</Text>
}

export function Button({ label, onPress, variant = 'accent', disabled, loading }: { label: string; onPress?: () => void; variant?: 'accent' | 'ghost'; disabled?: boolean; loading?: boolean }) {
  const accent = variant === 'accent'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        height: 46, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        backgroundColor: accent ? colors.accent : colors.surface,
        borderWidth: accent ? 0 : 1, borderColor: colors.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading && <ActivityIndicator size="small" color={accent ? colors.white : colors.textSecondary} />}
      <Text style={{ color: accent ? colors.white : colors.textTertiary, fontFamily: font.sansMedium, fontSize: 14 }}>{label}</Text>
    </Pressable>
  )
}

export function Screen({ children, refreshing, onRefresh, scroll = true }: { children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; scroll?: boolean }) {
  if (!scroll) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>{children}</View>
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      {children}
    </ScrollView>
  )
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={{ fontFamily: font.sansLight, fontSize: 26, letterSpacing: -0.6, color: colors.textPrimary }}>{title}</Text>
      {subtitle ? <Text style={{ fontFamily: font.sans, fontSize: 13.5, color: colors.textSecondary, marginTop: 3 }}>{subtitle}</Text> : null}
    </View>
  )
}

export function Loading() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Text style={{ fontFamily: font.sans, fontSize: 13.5, color: colors.textMuted, textAlign: 'center' }}>{message}</Text>
    </View>
  )
}
