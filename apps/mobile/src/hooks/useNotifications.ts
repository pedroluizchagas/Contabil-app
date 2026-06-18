/**
 * Hook: useNotifications
 *
 * Registra o token de push do Expo no Supabase (tabela expo_push_tokens)
 * na primeira vez que o funcionário abre o app após autenticar.
 *
 * Executado na HomeScreen para garantir que o token esteja atualizado.
 */

import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Configuração global: mostra notificações mesmo com app em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export function useNotifications() {
  const { funcionario, session } = useAuth()

  useEffect(() => {
    if (!funcionario || !session) return
    registrarToken()
  }, [funcionario?.id, session?.access_token])

  async function registrarToken() {
    // Verifica se está em dispositivo físico (push não funciona em emulador)
    if (!Constants.isDevice) return

    // Pede permissão
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return

    // Obtém o Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })
    const token = tokenData.data

    if (!token) return

    // Salva/atualiza no banco. A unique key é (funcionario_id, token),
    // permitindo múltiplos dispositivos por funcionário; reativa o token
    // caso já exista para este dispositivo.
    await supabase.from('expo_push_tokens').upsert(
      {
        funcionario_id: funcionario!.id,
        token,
        ativo: true,
      },
      { onConflict: 'funcionario_id,token' }
    )

    // Canal de notificação para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('documentos', {
        name: 'Novos Documentos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0d9488',
      })
    }
  }
}
