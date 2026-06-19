import { useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  type TextInput as TextInputType,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'

const TAMANHO = 6

export default function OtpScreen() {
  const { pendingAuth, loginStep2, cancelarLogin } = useAuth()
  const router = useRouter()

  const [digitos, setDigitos] = useState<string[]>(Array(TAMANHO).fill(''))
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [reenviando, setReenviando] = useState(false)

  const inputs = useRef<(TextInputType | null)[]>([])

  function handleDigito(valor: string, indice: number) {
    // Suporta colar o código completo
    if (valor.length > 1) {
      const limpo = valor.replace(/\D/g, '').slice(0, TAMANHO)
      const novos = [...Array(TAMANHO).fill('')]
      limpo.split('').forEach((c, i) => { novos[i] = c })
      setDigitos(novos)
      inputs.current[Math.min(limpo.length, TAMANHO - 1)]?.focus()
      return
    }

    const novos = [...digitos]
    novos[indice] = valor.replace(/\D/g, '')
    setDigitos(novos)

    if (valor && indice < TAMANHO - 1) {
      inputs.current[indice + 1]?.focus()
    }
  }

  function handleBackspace(indice: number) {
    if (!digitos[indice] && indice > 0) {
      const novos = [...digitos]
      novos[indice - 1] = ''
      setDigitos(novos)
      inputs.current[indice - 1]?.focus()
    }
  }

  const codigo = digitos.join('')
  const completo = codigo.length === TAMANHO

  async function handleConfirmar() {
    if (!completo) return
    setErro(null)
    setCarregando(true)
    const erro = await loginStep2(codigo)
    setCarregando(false)
    if (erro) {
      setErro(erro)
      setDigitos(Array(TAMANHO).fill(''))
      inputs.current[0]?.focus()
    }
    // Se deu certo, o AuthContext atualiza a sessão e o redirect acontece no _layout.tsx
  }

  async function handleReenviar() {
    if (!pendingAuth) return
    setReenviando(true)
    setErro(null)
    setDigitos(Array(TAMANHO).fill(''))
    // Reutiliza o estado para reenviar (loginStep1 com os mesmos dados não está disponível aqui)
    // Voltamos para a tela de login
    cancelarLogin()
    router.back()
    setReenviando(false)
  }

  function handleVoltar() {
    cancelarLogin()
    router.back()
  }

  if (!pendingAuth) {
    router.replace('/(auth)/login')
    return null
  }

  return (
    <View className="flex-1 bg-white px-6 py-12">
      {/* Botão voltar */}
      <Pressable onPress={handleVoltar} className="mb-8 self-start">
        <Text className="text-base text-brand-700">← Voltar</Text>
      </Pressable>

      {/* Header */}
      <View className="mb-8">
        <Text className="text-2xl font-bold text-gray-900">Confirme seu código</Text>
        <Text className="mt-2 text-sm text-gray-500">
          {pendingAuth.email_mascarado || 'Enviamos um código de 6 dígitos para seu e-mail.'}
        </Text>
        <Text className="mt-1 text-xs text-gray-400">
          Expira em {pendingAuth.expires_in_minutes} minutos.
        </Text>
      </View>

      {/* Erro */}
      {erro && (
        <View className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <Text className="text-sm text-red-700">{erro}</Text>
        </View>
      )}

      {/* Input OTP */}
      <View className="mb-8 flex-row justify-between gap-2">
        {digitos.map((digito, i) => (
          <TextInput
            key={i}
            ref={(el) => { inputs.current[i] = el }}
            value={digito}
            onChangeText={(v) => handleDigito(v, i)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace') handleBackspace(i)
            }}
            keyboardType="numeric"
            maxLength={TAMANHO} // permite colar
            selectTextOnFocus
            className={`h-14 flex-1 rounded-xl border text-center text-xl font-bold ${
              digito
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-300 bg-gray-50 text-gray-900'
            }`}
          />
        ))}
      </View>

      {/* Confirmar */}
      <Pressable
        onPress={handleConfirmar}
        disabled={!completo || carregando}
        className={`items-center rounded-xl py-4 ${
          completo && !carregando ? 'bg-brand' : 'bg-brand-300'
        }`}
      >
        {carregando ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">Confirmar código</Text>
        )}
      </Pressable>

      {/* Reenviar */}
      <Pressable onPress={handleReenviar} disabled={reenviando} className="mt-6 items-center">
        <Text className="text-sm text-gray-500">
          {reenviando ? 'Aguarde...' : 'Não recebeu? Clique para solicitar novo código'}
        </Text>
      </Pressable>
    </View>
  )
}
