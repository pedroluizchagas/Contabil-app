import { View, Text, Pressable, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'

export default function PerfilScreen() {
  const { funcionario, logout } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    Alert.alert(
      'Sair',
      'Deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        {/* Header */}
        <View className="bg-white px-5 pt-12 pb-6 border-b border-gray-100">
          <Text className="text-xl font-bold text-gray-900">Perfil</Text>
        </View>

        {/* Avatar + nome */}
        <View className="mx-4 mt-4 rounded-2xl bg-white border border-gray-100 p-5">
          <View className="items-center mb-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-teal-100 mb-3">
              <Text className="text-2xl font-bold text-teal-700">
                {funcionario?.nome.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text className="text-lg font-semibold text-gray-900">{funcionario?.nome}</Text>
            <Text className="text-sm text-gray-500">{funcionario?.empresa_nome}</Text>
          </View>

          <View className="space-y-3">
            <InfoItem icone="📧" label="E-mail" valor={funcionario?.email ?? '—'} />
            <InfoItem icone="🔖" label="Código" valor={funcionario?.codigo ?? '—'} mono />
          </View>
        </View>

        {/* Sobre o app */}
        <View className="mx-4 mt-4 rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <Text className="px-4 py-3 text-xs font-semibold uppercase text-gray-400 border-b border-gray-100">
            Sobre
          </Text>
          <MenuItem icone="ℹ️" label="Versão do app" valor="1.0.0" />
          <MenuItem icone="🔒" label="Privacidade e LGPD" onPress={() => {}} />
        </View>

        {/* Sair */}
        <View className="mx-4 mt-4 mb-8">
          <Pressable
            onPress={handleLogout}
            className="items-center rounded-2xl border border-red-200 bg-red-50 py-4"
          >
            <Text className="text-base font-semibold text-red-600">Sair da conta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function InfoItem({
  icone,
  label,
  valor,
  mono,
}: {
  icone: string
  label: string
  valor: string
  mono?: boolean
}) {
  return (
    <View className="flex-row items-center gap-3 py-1">
      <Text className="text-lg w-6 text-center">{icone}</Text>
      <View className="flex-1">
        <Text className="text-xs text-gray-400">{label}</Text>
        <Text className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{valor}</Text>
      </View>
    </View>
  )
}

function MenuItem({
  icone,
  label,
  valor,
  onPress,
}: {
  icone: string
  label: string
  valor?: string
  onPress?: () => void
}) {
  const inner = (
    <View className="flex-row items-center px-4 py-3.5 border-b border-gray-50">
      <Text className="mr-3 text-lg">{icone}</Text>
      <Text className="flex-1 text-sm text-gray-800">{label}</Text>
      {valor ? (
        <Text className="text-sm text-gray-400">{valor}</Text>
      ) : (
        <Text className="text-gray-300">›</Text>
      )}
    </View>
  )

  if (onPress) return <Pressable onPress={onPress}>{inner}</Pressable>
  return inner
}
