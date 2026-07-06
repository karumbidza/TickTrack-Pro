import { useState } from 'react'
import { View, Text, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { useSignIn, useAuth } from '@clerk/clerk-expo'
import { Redirect, useRouter } from 'expo-router'
import { colors, radius, font } from '@/lib/theme'
import { Button } from '@/components/ui'

export default function SignIn() {
  const { isSignedIn } = useAuth()
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isSignedIn) return <Redirect href="/(tabs)" />

  const onSubmit = async () => {
    if (!isLoaded) return
    setError(null)
    setLoading(true)
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password })
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId })
        router.replace('/(tabs)')
      } else {
        setError('Additional verification required. Please sign in on the web to continue.')
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Sign in failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control,
    backgroundColor: colors.surface, paddingHorizontal: 14, fontFamily: font.sans, fontSize: 15, color: colors.textPrimary,
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 14 }}>
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontFamily: font.sansMedium, fontSize: 22, color: colors.textPrimary }}>TickTrack Pro</Text>
          <Text style={{ fontFamily: font.sans, fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>Sign in to your account</Text>
        </View>

        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={inputStyle}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={inputStyle}
        />

        {error ? <Text style={{ color: colors.red, fontFamily: font.sans, fontSize: 13 }}>{error}</Text> : null}

        <Button label="Sign in" onPress={onSubmit} loading={loading} disabled={!email || !password} />
      </View>
    </KeyboardAvoidingView>
  )
}
