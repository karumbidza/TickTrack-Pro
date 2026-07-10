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
