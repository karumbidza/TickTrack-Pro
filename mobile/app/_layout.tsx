import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts, DMSans_300Light, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans'
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono'
import { View, ActivityIndicator } from 'react-native'
import { tokenCache } from '@/lib/token-cache'
import { colors, font } from '@/lib/theme'

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMMono_400Regular,
    DMMono_500Medium,
  })

  if (!publishableKey) {
    throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Set it in mobile/.env')
  }

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="ticket/[id]"
            options={{ headerShown: true, title: 'Ticket', headerBackTitle: 'Back', headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTintColor: colors.textPrimary, headerTitleStyle: { fontFamily: font.sansMedium } }}
          />
          <Stack.Screen
            name="new-ticket"
            options={{ presentation: 'modal', headerShown: true, title: 'New ticket', headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTintColor: colors.textPrimary, headerTitleStyle: { fontFamily: font.sansMedium } }}
          />
          <Stack.Screen
            name="rate/[id]"
            options={{ presentation: 'modal', headerShown: true, title: 'Rate service', headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTintColor: colors.textPrimary, headerTitleStyle: { fontFamily: font.sansMedium } }}
          />
        </Stack>
      </ClerkLoaded>
    </ClerkProvider>
  )
}
