import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginScreen() {
  const { loginStep1 } = useAuth()
  const router = useRouter()

  const [cnpj, setCnpj] = useState('')
  const [cpf, setCpf] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  function formatarCnpj(v: string): string {
    const s = v.replace(/\D/g, '').slice(0, 14)
    if (s.length <= 2) return s
    if (s.length <= 5) return `${s.slice(0, 2)}.${s.slice(2)}`
    if (s.length <= 8) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5)}`
    if (s.length <= 12) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8)}`
    return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
  }

  function formatarCpf(v: string): string {
    const s = v.replace(/\D/g, '').slice(0, 11)
    if (s.length <= 3) return s
    if (s.length <= 6) return `${s.slice(0, 3)}.${s.slice(3)}`
    if (s.length <= 9) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6)}`
    return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`
  }

  function formatarData(v: string): string {
    const s = v.replace(/\D/g, '').slice(0, 8)
    if (s.length <= 2) return s
    if (s.length <= 4) return `${s.slice(0, 2)}/${s.slice(2)}`
    return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}`
  }

  function dataParaIso(v: string): string {
    // DD/MM/AAAA → AAAA-MM-DD
    const [d, m, a] = v.split('/')
    return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  const podeContinuar =
    cnpj.replace(/\D/g, '').length === 14 &&
    cpf.replace(/\D/g, '').length === 11 &&
    dataNascimento.replace(/\D/g, '').length === 8

  async function handleContinuar() {
    if (!podeContinuar) return
    setErro(null)
    setCarregando(true)
    const erro = await loginStep1(cnpj, cpf, dataParaIso(dataNascimento))
    setCarregando(false)
    if (erro) {
      setErro(erro)
    } else {
      router.push('/(auth)/otp')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Header */}
          <View className="mb-10 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-brand">
              <Text className="text-3xl font-bold text-white">C</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">ContaHub</Text>
            <Text className="mt-1 text-sm text-gray-500">Acesse seus documentos</Text>
          </View>

          {/* Erro */}
          {erro && (
            <View className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <Text className="text-sm text-red-700">{erro}</Text>
            </View>
          )}

          {/* Formulário */}
          <View className="space-y-4">
            <View>
              <Text className="mb-1.5 text-sm font-medium text-gray-700">CNPJ da Empresa</Text>
              <TextInput
                value={cnpj}
                onChangeText={(v) => setCnpj(formatarCnpj(v))}
                placeholder="00.000.000/0001-00"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                className="rounded-xl border border-gray-300 px-4 py-3.5 text-base text-gray-900 font-mono"
              />
            </View>

            <View>
              <Text className="mb-1.5 text-sm font-medium text-gray-700">Seu CPF</Text>
              <TextInput
                value={cpf}
                onChangeText={(v) => setCpf(formatarCpf(v))}
                placeholder="000.000.000-00"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                className="rounded-xl border border-gray-300 px-4 py-3.5 text-base text-gray-900 font-mono"
              />
            </View>

            <View>
              <Text className="mb-1.5 text-sm font-medium text-gray-700">Data de Nascimento</Text>
              <TextInput
                value={dataNascimento}
                onChangeText={(v) => setDataNascimento(formatarData(v))}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                className="rounded-xl border border-gray-300 px-4 py-3.5 text-base text-gray-900 font-mono"
              />
            </View>

            <Pressable
              onPress={handleContinuar}
              disabled={!podeContinuar || carregando}
              className={`mt-2 items-center rounded-xl py-4 ${
                podeContinuar && !carregando ? 'bg-brand' : 'bg-brand-300'
              }`}
            >
              {carregando ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-semibold text-white">Continuar</Text>
              )}
            </Pressable>
          </View>

          <Text className="mt-8 text-center text-xs text-gray-400">
            Credenciais fornecidas pela sua empresa.{'\n'}
            Em caso de dúvidas, contate o RH.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
