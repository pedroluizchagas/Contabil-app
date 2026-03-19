import '../global.css'
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

function RootNavigator() {
  const { session, carregando } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (carregando) return

    const emAuth = segments[0] === '(auth)'

    if (!session && !emAuth) {
      router.replace('/(auth)/login')
    } else if (session && emAuth) {
      router.replace('/(tabs)')
    }
  }, [session, carregando, segments])

  if (carregando) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  )
}
