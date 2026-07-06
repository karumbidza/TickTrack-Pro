import { Tabs, Redirect } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { Home, FileText, User } from 'lucide-react-native'
import { colors, font } from '@/lib/theme'
import { Loading } from '@/components/ui'
import { usePushNotifications } from '@/lib/push'

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  // Register for push + handle notification taps (authenticated area only).
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
          title: isContractor ? 'My jobs' : 'My tickets',
          tabBarLabel: isContractor ? 'Jobs' : 'Tickets',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarLabel: 'Invoices',
          // Contractor-only tab; hidden for end-users.
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
