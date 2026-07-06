import { View, Text } from 'react-native'
import { useUser, useAuth } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { colors, font } from '@/lib/theme'
import { Screen, Card, Mono, Button } from '@/components/ui'

export default function Profile() {
  const { user } = useUser()
  const { signOut } = useAuth()
  const router = useRouter()
  const meta = (user?.publicMetadata as any) ?? {}

  const onSignOut = async () => {
    await signOut()
    router.replace('/(auth)/sign-in')
  }

  return (
    <Screen>
      <Card>
        <Text style={{ fontFamily: font.sansMedium, fontSize: 16, color: colors.textPrimary }}>{user?.fullName || 'Account'}</Text>
        <Text style={{ fontFamily: font.sans, fontSize: 13.5, color: colors.textSecondary, marginTop: 2 }}>{user?.primaryEmailAddress?.emailAddress}</Text>
        <View style={{ height: 1, backgroundColor: colors.rowSep, marginVertical: 14 }} />
        <Row label="ROLE" value={String(meta.role ?? 'END_USER').replace(/_/g, ' ')} />
        {meta.tenantName ? <Row label="ORGANISATION" value={String(meta.tenantName)} /> : null}
        {meta.branchName ? <Row label="BRANCH" value={String(meta.branchName)} /> : null}
      </Card>

      <Button label="Sign out" variant="ghost" onPress={onSignOut} />
    </Screen>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Mono size={10.5}>{label}</Mono>
      <Text style={{ fontFamily: font.sans, fontSize: 13.5, color: colors.textPrimary }}>{value}</Text>
    </View>
  )
}
