import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useApi } from '@/lib/api'

// Show notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // SDK 52+ split shouldShowAlert into banner + list
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null // push only works on physical devices
  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status
  }
  if (status !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const projectId =
    (Constants.expoConfig as any)?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId
  try {
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    return token.data
  } catch {
    return null
  }
}

/**
 * Registers this device's Expo push token with the server and routes taps on a
 * notification to the relevant ticket. Call once inside the authenticated area.
 */
export function usePushNotifications() {
  const api = useApi()
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    getExpoPushToken().then(async (token) => {
      if (!token || !mounted) return
      try {
        await api.post('/api/notifications/device', { token, platform: Platform.OS })
      } catch {
        // non-fatal: retried next launch
      }
    })

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { ticketId?: string }
      if (data?.ticketId) router.push(`/ticket/${data.ticketId}`)
    })

    return () => {
      mounted = false
      sub.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
