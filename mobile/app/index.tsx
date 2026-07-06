import { Redirect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { Loading } from '@/components/ui'

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return <Loading />
  return <Redirect href={isSignedIn ? '/(tabs)' : '/(auth)/sign-in'} />
}
