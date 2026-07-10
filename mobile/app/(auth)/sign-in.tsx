import { useState } from 'react'
import { View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native'
import { useSignIn, useAuth } from '@clerk/clerk-expo'
import { Redirect, useRouter } from 'expo-router'
import { colors, radius, font } from '@/lib/theme'
import { Button } from '@/components/ui'

export default function SignIn() {
  const { isSignedIn } = useAuth()
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()
  const [step, setStep] = useState<'password' | 'code'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isSignedIn) return <Redirect href="/(tabs)" />

  const complete = async (sessionId: string | null | undefined) => {
    if (!setActive) return
    await setActive({ session: sessionId })
    router.replace('/(tabs)')
  }

  // Some Clerk instances require an emailed code as a second factor after the
  // password. Prepare it and switch to the code entry step.
  const startEmailCode = async () => {
    const factor = signIn?.supportedSecondFactors?.find((f) => f.strategy === 'email_code')
    if (!factor) return false
    await signIn!.prepareSecondFactor({
      strategy: 'email_code',
      emailAddressId: (factor as any).emailAddressId,
    })
    setStep('code')
    setError(null)
    return true
  }

  const onSubmitPassword = async () => {
    if (!isLoaded) return
    setError(null)
    setLoading(true)
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password })
      if (attempt.status === 'complete') {
        await complete(attempt.createdSessionId)
        return
      }
      if (attempt.status === 'needs_second_factor') {
        if (await startEmailCode()) return
      }
      setError('This account needs a verification method the app doesn’t support yet. Sign in on the web.')
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Sign in failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmitCode = async () => {
    if (!isLoaded) return
    setError(null)
    setLoading(true)
    try {
      const attempt = await signIn.attemptSecondFactor({ strategy: 'email_code', code: code.trim() })
      if (attempt.status === 'complete') {
        await complete(attempt.createdSessionId)
      } else {
        setError('Incorrect or expired code. Try again.')
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Verification failed. Check the code and retry.')
    } finally {
      setLoading(false)
    }
  }

  const onResend = async () => {
    if (!isLoaded) return
    setError(null)
    try {
      await startEmailCode()
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Could not resend the code.')
    }
  }

  const inputStyle = {
    height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control,
    backgroundColor: colors.surface, paddingHorizontal: 14, fontFamily: font.sans, fontSize: 15, color: colors.textPrimary,
  }
  const linkStyle = { fontFamily: font.sansMedium, fontSize: 13, color: colors.accent }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 14 }}>
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontFamily: font.sansMedium, fontSize: 22, color: colors.textPrimary }}>TickTrack Pro</Text>
          <Text style={{ fontFamily: font.sans, fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            {step === 'password' ? 'Sign in to your account' : `Enter the code sent to ${email.trim()}`}
          </Text>
        </View>

        {step === 'password' ? (
          <>
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
            <Button label="Sign in" onPress={onSubmitPassword} loading={loading} disabled={!email || !password} />
          </>
        ) : (
          <>
            <TextInput
              placeholder="6-digit code"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
              maxLength={6}
              style={inputStyle}
            />
            {error ? <Text style={{ color: colors.red, fontFamily: font.sans, fontSize: 13 }}>{error}</Text> : null}
            <Button label="Verify" onPress={onSubmitCode} loading={loading} disabled={code.length < 6} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Pressable onPress={() => { setStep('password'); setCode(''); setError(null) }} hitSlop={8}>
                <Text style={linkStyle}>Back</Text>
              </Pressable>
              <Pressable onPress={onResend} hitSlop={8}>
                <Text style={linkStyle}>Resend code</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
