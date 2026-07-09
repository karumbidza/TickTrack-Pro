# Mobile End-User Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Expo/React Native mobile app to END_USER feature parity with the web app — a Dashboard home tab, a fuller ticket-creation form (dropdowns + department/asset/category), and a read-only Asset Register with detail + repair history.

**Architecture:** Pure client work against existing Next.js API routes via the Clerk-authenticated `mobile/lib/api.ts`. No server changes. Tabs become role-aware (end-user: Home/Tickets/Assets/Profile; contractor unchanged). New reusable `Dropdown` component powers all pickers. Ticket stats are derived client-side from `GET /api/tickets`, exactly as the web does.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, `@clerk/clerk-expo`, `lucide-react-native`.

**Testing note:** The mobile app has no test framework (only a `typecheck` script; zero mobile tests). Per-task verification uses the project's real loop — `npx tsc --noEmit`, and for structural/route changes `npx expo export --platform ios`, plus a manual Expo Go check. All commands run from the `mobile/` directory. Test login: `end.user+clerk_test@example.com` / `TickTrackDemo2026!` / code `424242`.

---

## File Structure

**Create:**
- `mobile/components/select.tsx` — reusable `Dropdown` (bottom-sheet picker, optional search).
- `mobile/components/dashboard.tsx` — end-user Home dashboard.
- `mobile/app/(tabs)/tickets.tsx` — end-user tickets list (moved out of `index.tsx`), supports a `filter` param.
- `mobile/app/(tabs)/assets.tsx` — asset register list.
- `mobile/app/asset/[id].tsx` — asset detail + repair history.

**Modify:**
- `mobile/lib/theme.ts` — add `ticketStatGroup` helper + `ASSET_STATUS_VARIANT`.
- `mobile/app/(tabs)/_layout.tsx` — 4 role-aware tabs.
- `mobile/app/(tabs)/index.tsx` — role-aware Home: `<Dashboard/>` for end-users, contractor jobs list unchanged.
- `mobile/app/new-ticket.tsx` — full form (dropdowns, asset/category pickers, reporter toggle, photos split, prefill params).
- `mobile/app/_layout.tsx` — register the `asset/[id]` route in the Stack.

---

## Task 1: Theme helpers (stat groups + asset status colours)

**Files:**
- Modify: `mobile/lib/theme.ts` (append at end)

- [ ] **Step 1: Append helpers to `mobile/lib/theme.ts`**

```tsx
// Ticket status → dashboard stat group (mirrors the web's client-side stats).
export type StatGroup = 'open' | 'inProgress' | 'completed'
export const ticketStatGroup = (s: string): StatGroup | null => {
  if (s === 'OPEN' || s === 'ASSIGNED') return 'open'
  if (s === 'IN_PROGRESS' || s === 'ON_SITE') return 'inProgress'
  if (s === 'COMPLETED' || s === 'CLOSED') return 'completed'
  return null
}

// Asset lifecycle status → badge variant.
export const ASSET_STATUS_VARIANT: Record<string, BadgeVariant> = {
  ACTIVE: 'green',
  MAINTENANCE: 'amber',
  REPAIR_NEEDED: 'orange',
  OUT_OF_SERVICE: 'red',
  RETIRED: 'neutral',
  DECOMMISSIONED: 'neutral',
  TRANSFERRED: 'blue',
  PENDING_DECOMMISSION: 'amber',
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/theme.ts
git commit -m "feat(mobile): add ticket stat-group and asset status helpers"
```

---

## Task 2: Reusable Dropdown component

**Files:**
- Create: `mobile/components/select.tsx`

- [ ] **Step 1: Create `mobile/components/select.tsx`**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/components/select.tsx
git commit -m "feat(mobile): add reusable Dropdown picker component"
```

---

## Task 3: Move tickets list to its own tab

Extract the end-user tickets list from `index.tsx` into `(tabs)/tickets.tsx`, adding a `filter` param (used by dashboard stat taps). `index.tsx` is updated in Task 5.

**Files:**
- Create: `mobile/app/(tabs)/tickets.tsx`

- [ ] **Step 1: Create `mobile/app/(tabs)/tickets.tsx`**

```tsx
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
  const group = (filter as StatGroup | undefined) ?? null

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
      {visible.length === 0 && !error && <EmptyState message="No tickets yet. Tap “New ticket” to create one." />}

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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (The `index.tsx` still exports the old screen; both compile. `index.tsx` is rewritten in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add mobile/app/(tabs)/tickets.tsx
git commit -m "feat(mobile): add dedicated tickets tab with filter param"
```

---

## Task 4: Dashboard component

**Files:**
- Create: `mobile/components/dashboard.tsx`

- [ ] **Step 1: Create `mobile/components/dashboard.tsx`**

```tsx
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
          Here’s what’s happening
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/components/dashboard.tsx
git commit -m "feat(mobile): add end-user dashboard component"
```

---

## Task 5: Role-aware tabs + Home

Wire the 4-tab layout and make `index.tsx` render the Dashboard for end-users while keeping the contractor jobs list.

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx` (replace whole file)
- Modify: `mobile/app/(tabs)/index.tsx` (replace whole file)

- [ ] **Step 1: Replace `mobile/app/(tabs)/_layout.tsx`**

```tsx
import { Tabs, Redirect } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { LayoutDashboard, FileText, Boxes, User, Briefcase } from 'lucide-react-native'
import { colors, font } from '@/lib/theme'
import { Loading } from '@/components/ui'
import { usePushNotifications } from '@/lib/push'

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  usePushNotifications()

  if (!isLoaded) return <Loading />
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />

  const role = ((user?.publicMetadata as any)?.role as string) ?? 'END_USER'
  const isContractor = role === 'CONTRACTOR'

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: font.sansMedium, fontSize: 16, color: colors.textPrimary },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: font.sansMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isContractor ? 'My jobs' : 'Home',
          tabBarLabel: isContractor ? 'Jobs' : 'Home',
          tabBarIcon: ({ color, size }) =>
            isContractor ? <Briefcase color={color} size={size} strokeWidth={1.8} /> : <LayoutDashboard color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'My tickets',
          tabBarLabel: 'Tickets',
          // End-user only.
          href: isContractor ? null : '/(tabs)/tickets',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Assets',
          tabBarLabel: 'Assets',
          // End-user only.
          href: isContractor ? null : '/(tabs)/assets',
          tabBarIcon: ({ color, size }) => <Boxes color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarLabel: 'Invoices',
          // Contractor only.
          href: isContractor ? '/(tabs)/invoices' : null,
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 2: Replace `mobile/app/(tabs)/index.tsx`**

This becomes the role-aware Home: Dashboard for end-users, the existing jobs list for contractors.

```tsx
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
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Bundle check**

Run: `npx expo export --platform ios --output-dir /tmp/ttp-export-t5`
Expected: "Exported" with exit 0 (validates the new routes resolve).

- [ ] **Step 5: Manual check (Expo Go, end-user)**

Reload the app. Expect 4 tabs: Home, Tickets, Assets, Profile. Home shows greeting + stats + recent tickets. Tapping a stat opens the Tickets tab filtered. Assets tab currently errors/blank until Task 7 — that is expected.

- [ ] **Step 6: Commit**

```bash
git add mobile/app/(tabs)/_layout.tsx mobile/app/(tabs)/index.tsx
git commit -m "feat(mobile): role-aware 4-tab nav with dashboard home"
```

---

## Task 6: Full ticket form

Rewrite `new-ticket.tsx` with dropdowns, asset + category pickers (category auto-fills from asset), reporter auto-fill with a toggle, photos split left/right, and prefill via route params (`assetId`, `categoryId`).

**Files:**
- Modify: `mobile/app/new-ticket.tsx` (replace whole file)

- [ ] **Step 1: Replace `mobile/app/new-ticket.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Camera, Image as ImageIcon } from 'lucide-react-native'
import type { ImagePickerAsset } from 'expo-image-picker'
import { useApi } from '@/lib/api'
import { colors, font, radius } from '@/lib/theme'
import { Button, Mono } from '@/components/ui'
import { Dropdown, type Option } from '@/components/select'
import { PhotoPicker } from '@/components/photo-picker'
import { assetToFilePart } from '@/lib/upload'

const TYPES: Option[] = ['REPAIR', 'MAINTENANCE', 'INSPECTION', 'INSTALLATION', 'REPLACEMENT', 'EMERGENCY', 'OTHER'].map((v) => ({ label: v.charAt(0) + v.slice(1).toLowerCase(), value: v }))
const PRIORITIES: Option[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((v) => ({ label: v.charAt(0) + v.slice(1).toLowerCase(), value: v }))
const DEPARTMENTS: Option[] = ['IT', 'SALES', 'RETAIL', 'MAINTENANCE', 'PROJECTS', 'FACILITIES', 'OPERATIONS'].map((v) => ({ label: v.charAt(0) + v.slice(1).toLowerCase(), value: v }))

interface AssetOpt { id: string; name: string; assetNumber?: string; location?: string | null; categoryId?: string | null }
interface CatOpt { id: string; name: string }

export default function NewTicket() {
  const api = useApi()
  const router = useRouter()
  const { user } = useUser()
  const params = useLocalSearchParams<{ assetId?: string; categoryId?: string }>()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('REPAIR')
  const [priority, setPriority] = useState('MEDIUM')
  const [department, setDepartment] = useState('MAINTENANCE')
  const [assetId, setAssetId] = useState<string | null>(params.assetId ?? null)
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null)
  const [photos, setPhotos] = useState<ImagePickerAsset[]>([])
  const [saving, setSaving] = useState(false)

  const [assets, setAssets] = useState<AssetOpt[]>([])
  const [categories, setCategories] = useState<CatOpt[]>([])

  // Reporter defaults to the signed-in user; toggle reveals editable fields.
  const [onBehalf, setOnBehalf] = useState(false)
  const [reporterName, setReporterName] = useState('')
  const [reporterContact, setReporterContact] = useState('')

  useEffect(() => {
    api.get<any>('/api/assets').then((d) => setAssets(d.assets || [])).catch(() => {})
    api.get<any>('/api/asset-categories').then((d) => setCategories(d.categories || [])).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const assetOptions: Option[] = useMemo(
    () => assets.map((a) => ({ label: `${a.assetNumber ? a.assetNumber + ' — ' : ''}${a.name}`, value: a.id, hint: a.location || undefined })),
    [assets],
  )
  const categoryOptions: Option[] = useMemo(() => categories.map((c) => ({ label: c.name, value: c.id })), [categories])

  const onPickAsset = (id: string) => {
    setAssetId(id)
    const a = assets.find((x) => x.id === id)
    if (a?.categoryId) setCategoryId(a.categoryId) // auto-fill category from asset
  }

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing details', 'Please add a title and description.')
      return
    }
    setSaving(true)
    try {
      const name = onBehalf ? reporterName.trim() : (user?.fullName || '')
      const contact = onBehalf ? reporterContact.trim() : (user?.primaryEmailAddress?.emailAddress || '')
      const form = new FormData()
      form.append('title', title.trim())
      form.append('description', description.trim())
      form.append('type', type)
      form.append('priority', priority)
      form.append('department', department)
      if (assetId) form.append('assetId', assetId)
      if (categoryId) form.append('categoryId', categoryId)
      if (name) form.append('reporterName', name)
      if (contact) form.append('reporterContact', contact)
      photos.forEach((p) => form.append('files', assetToFilePart(p)))
      await api.post('/api/tickets', form)
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Field label="TITLE">
        <TextInput placeholder="Brief summary" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} style={inputStyle} />
      </Field>

      <Field label="DESCRIPTION">
        <TextInput
          placeholder="What's the problem?" placeholderTextColor={colors.textMuted}
          value={description} onChangeText={setDescription} multiline
          style={[inputStyle, { height: 110, textAlignVertical: 'top' }]}
        />
      </Field>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="TYPE"><Dropdown label="Type" value={type} options={TYPES} onChange={setType} /></Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="PRIORITY"><Dropdown label="Priority" value={priority} options={PRIORITIES} onChange={setPriority} /></Field>
        </View>
      </View>

      <Field label="DEPARTMENT">
        <Dropdown label="Department" value={department} options={DEPARTMENTS} onChange={setDepartment} />
      </Field>

      <Field label="RELATED ASSET · OPTIONAL">
        <Dropdown label="Related asset" value={assetId} options={assetOptions} onChange={onPickAsset} placeholder="None selected" searchable />
      </Field>

      <Field label="CATEGORY · OPTIONAL">
        <Dropdown label="Category" value={categoryId} options={categoryOptions} onChange={setCategoryId} placeholder="Select a category" searchable />
      </Field>

      <Field label="PHOTOS">
        <PhotoPicker assets={photos} onChange={setPhotos} />
      </Field>

      <Pressable onPress={() => setOnBehalf((v) => !v)} style={{ paddingVertical: 4 }}>
        <Text style={{ fontFamily: font.sansMedium, fontSize: 13, color: colors.accent }}>
          {onBehalf ? '✓ Someone else reported this' : 'Someone else reported this?'}
        </Text>
      </Pressable>
      {onBehalf && (
        <View style={{ gap: 12 }}>
          <Field label="REPORTER NAME">
            <TextInput placeholder="Full name" placeholderTextColor={colors.textMuted} value={reporterName} onChangeText={setReporterName} style={inputStyle} />
          </Field>
          <Field label="CONTACT">
            <TextInput placeholder="Phone or email" placeholderTextColor={colors.textMuted} autoCapitalize="none" value={reporterContact} onChangeText={setReporterContact} style={inputStyle} />
          </Field>
        </View>
      )}

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
```

Note: the `PHOTOS` field renders the existing `PhotoPicker`; the Camera-left / Library-right split is applied inside that component in Step 2.

- [ ] **Step 2: Split PhotoPicker buttons left/right in `mobile/components/photo-picker.tsx`**

The two buttons currently sit grouped on the left. Make them each half-width so Camera pins left and Library pins right.

Change the button-row container (currently `<View style={{ flexDirection: 'row', gap: 8 }}>` wrapping the two `PickButton`s):

```tsx
<View style={{ flexDirection: 'row', gap: 10 }}>
  <PickButton icon={<Camera color={colors.textTertiary} size={16} strokeWidth={1.8} />} label="Camera" onPress={() => pick(true)} />
  <PickButton icon={<ImagePlus color={colors.textTertiary} size={16} strokeWidth={1.8} />} label="Library" onPress={() => pick(false)} />
</View>
```

And change the `PickButton` wrapper `Pressable` style so each button flexes to fill half the row:

```tsx
style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 40, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}
```

(Key changes: add `flex: 1`, add `justifyContent: 'center'`, drop the fixed `paddingHorizontal: 14`.) Leave the picker logic untouched.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual check (Expo Go)**

Open New ticket. Type/Priority/Department/Asset/Category are dropdowns. Picking an asset auto-selects its category. Create a ticket → returns to list, ticket appears. Toggle "Someone else reported this" reveals name/contact.

- [ ] **Step 5: Commit**

```bash
git add mobile/app/new-ticket.tsx mobile/components/photo-picker.tsx
git commit -m "feat(mobile): full ticket form with dropdowns, asset/category, reporter toggle"
```

---

## Task 7: Asset Register list

**Files:**
- Create: `mobile/app/(tabs)/assets.tsx`

- [ ] **Step 1: Create `mobile/app/(tabs)/assets.tsx`**

```tsx
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
        placeholder="Search assets…" placeholderTextColor={colors.textMuted}
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
        <Card key={a.id} onPress={() => router.push(`/asset/${a.id}`)}>
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check (Expo Go)**

Open the Assets tab. Assets list loads; search filters by name/number; category chips filter. Tapping an asset navigates (detail screen added in Task 8 — until then it will 404; expected).

- [ ] **Step 4: Commit**

```bash
git add mobile/app/(tabs)/assets.tsx
git commit -m "feat(mobile): read-only asset register list with search and category filter"
```

---

## Task 8: Asset detail + repair history

**Files:**
- Create: `mobile/app/asset/[id].tsx`
- Modify: `mobile/app/_layout.tsx` (register the route)

- [ ] **Step 1: Create `mobile/app/asset/[id].tsx`**

```tsx
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
          <Card key={r.id || i} onPress={r.id ? () => router.push(`/ticket/${r.id}`) : undefined}>
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
```

- [ ] **Step 2: Register the route in `mobile/app/_layout.tsx`**

Add a `Stack.Screen` for `asset/[id]` alongside the existing `ticket/[id]` screen, with the same header style. Insert after the `ticket/[id]` `<Stack.Screen>`:

```tsx
<Stack.Screen
  name="asset/[id]"
  options={{ headerShown: true, title: 'Asset', headerBackTitle: 'Back', headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTintColor: colors.textPrimary, headerTitleStyle: { fontFamily: font.sansMedium } }}
/>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Bundle check**

Run: `npx expo export --platform ios --output-dir /tmp/ttp-export-t8`
Expected: "Exported" with exit 0.

- [ ] **Step 5: Manual check (Expo Go)**

Assets tab → tap an asset → detail shows specs + repair history. "Report an issue on this asset" opens New ticket with the asset (and its category) pre-selected.

- [ ] **Step 6: Commit**

```bash
git add mobile/app/asset/[id].tsx mobile/app/_layout.tsx
git commit -m "feat(mobile): asset detail with repair history and report-issue shortcut"
```

---

## Task 9: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the whole app**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full iOS bundle**

Run: `npx expo export --platform ios --output-dir /tmp/ttp-export-final`
Expected: "Exported" with exit 0.

- [ ] **Step 3: End-to-end manual runthrough (Expo Go, end-user login)**

Sign in as `end.user+clerk_test@example.com` (code `424242`) and verify:
- Home: greeting, stats reflect ticket counts, tapping a stat opens the filtered Tickets tab, recent tickets listed. If a ticket is `AWAITING_WORK_APPROVAL`, the approval banner appears.
- Tickets tab: full list, New ticket button.
- New ticket: all dropdowns work; asset selection auto-fills category; ticket creates and appears in list.
- Assets tab: list loads; search + category filter work; tap → detail with repair history; "Report an issue" pre-fills the form.
- Profile tab: unchanged.

- [ ] **Step 4: Contractor regression (optional, if a contractor login is available)**

Confirm a contractor still sees Jobs + Invoices + Profile only (no Home/Tickets/Assets tabs).

- [ ] **Step 5: Final commit (if any tweaks were made)**

```bash
git add -A mobile/
git commit -m "chore(mobile): end-user parity verification tweaks"
```
