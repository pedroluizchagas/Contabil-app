/**
 * Tela inicial: documentos recentes + pendentes de leitura.
 */

import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import type { Database } from '@contabhub/supabase'

type StatusDoc = Database['public']['Views']['v_status_documentos']['Row']

const MESES = [
  '',
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

export default function HomeScreen() {
  const { funcionario } = useAuth()
  const router = useRouter()
  useNotifications() // Registra token push ao entrar na tela logada

  const [docs, setDocs] = useState<StatusDoc[]>([])
  const [carregando, setCarregando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!funcionario) return
    carregarDocs()
  }, [funcionario])

  async function carregarDocs(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setCarregando(true)

    const { data } = await supabase
      .from('v_status_documentos')
      .select('*')
      .eq('funcionario_id', funcionario!.id)
      .order('enviado_em', { ascending: false })
      .limit(20)

    setDocs((data as StatusDoc[]) ?? [])
    if (isRefresh) setRefreshing(false)
    else setCarregando(false)
  }

  async function abrirDocumento(doc: StatusDoc) {
    const { data } = await supabase.storage
      .from('documentos')
      .createSignedUrl(doc.storage_path, 300)

    if (data?.signedUrl) {
      await Linking.openURL(data.signedUrl)

      // Registra evento de visualização se ainda não visualizou
      if (!doc.visualizado_em) {
        await supabase.from('eventos_documento').insert({
          documento_id: doc.documento_id,
          funcionario_id: funcionario!.id,
          tipo: 'visualizado',
        })
        // Atualiza local
        setDocs((prev) =>
          prev.map((d) =>
            d.documento_id === doc.documento_id
              ? { ...d, visualizado_em: new Date().toISOString() }
              : d
          )
        )
      }
    }
  }

  const naoLidos = docs.filter((d) => !d.visualizado_em)
  const anoAtual = new Date().getFullYear()
  const docsAnoAtual = docs.filter((d) => d.ano_referencia === anoAtual)

  if (carregando) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#7DC82E" size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => carregarDocs(true)}
            tintColor="#7DC82E"
          />
        }
      >
        {/* Header */}
        <View className="bg-brand px-5 pb-8 pt-12">
          <Text className="text-sm text-white/80">Olá,</Text>
          <Text className="text-xl font-bold text-white">{funcionario?.nome.split(' ')[0]}</Text>
          <Text className="text-sm text-white/80">{funcionario?.empresa_nome}</Text>
        </View>

        <View className="-mt-4 px-4">
          {/* Card de pendentes */}
          {naoLidos.length > 0 && (
            <Pressable
              onPress={() => router.push('/(tabs)/documentos')}
              className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-4"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Text className="text-lg">⚠️</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-amber-900">
                    {naoLidos.length} documento{naoLidos.length > 1 ? 's' : ''} pendente
                    {naoLidos.length > 1 ? 's' : ''}
                  </Text>
                  <Text className="text-xs text-amber-700">Toque para visualizar</Text>
                </View>
                <Text className="text-amber-500">›</Text>
              </View>
            </Pressable>
          )}

          {/* Documentos recentes */}
          <View className="mb-4 rounded-2xl bg-white border border-gray-100 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
              <Text className="font-semibold text-gray-800">Documentos recentes</Text>
              <Pressable onPress={() => router.push('/(tabs)/documentos')}>
                <Text className="text-sm text-brand-700">Ver todos</Text>
              </Pressable>
            </View>

            {docs.length === 0 ? (
              <View className="items-center py-10">
                <Text className="text-3xl mb-2">📭</Text>
                <Text className="text-sm text-gray-400">Nenhum documento ainda</Text>
              </View>
            ) : (
              docs.slice(0, 6).map((doc, i) => (
                <Pressable
                  key={doc.documento_id}
                  onPress={() => abrirDocumento(doc)}
                  className={`flex-row items-center px-4 py-3.5 ${
                    i < docs.slice(0, 6).length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  {/* Ícone */}
                  <View
                    className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${
                      doc.tipo === 'holerite' ? 'bg-blue-50' : 'bg-purple-50'
                    }`}
                  >
                    <Text className="text-lg">{doc.tipo === 'holerite' ? '💵' : '🏖'}</Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">
                      {doc.tipo === 'holerite' ? 'Holerite' : 'Recibo de Férias'} —{' '}
                      {MESES[doc.mes_referencia]}/{doc.ano_referencia}
                    </Text>
                    <StatusLine doc={doc} />
                  </View>

                  {/* Badge não lido */}
                  {!doc.visualizado_em && <View className="h-2 w-2 rounded-full bg-amber-500" />}
                </Pressable>
              ))
            )}
          </View>

          {/* Resumo do ano */}
          {docsAnoAtual.length > 0 && (
            <View className="mb-6 rounded-2xl bg-white border border-gray-100 p-4">
              <Text className="mb-3 font-semibold text-gray-800">Resumo {anoAtual}</Text>
              <View className="flex-row gap-3">
                <ResumoItem label="Enviados" valor={docsAnoAtual.length} cor="text-gray-700" />
                <ResumoItem
                  label="Lidos"
                  valor={docsAnoAtual.filter((d) => d.visualizado_em).length}
                  cor="text-blue-600"
                />
                <ResumoItem
                  label="Assinados"
                  valor={docsAnoAtual.filter((d) => d.assinado_em).length}
                  cor="text-green-600"
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatusLine({ doc }: { doc: StatusDoc }) {
  if (doc.assinado_em) {
    return <Text className="text-xs text-green-600">✓ Assinado</Text>
  }
  if (doc.visualizado_em) {
    return <Text className="text-xs text-blue-500">✓ Lido</Text>
  }
  return <Text className="text-xs text-amber-500">● Não lido</Text>
}

function ResumoItem({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <View className="flex-1 items-center rounded-xl bg-gray-50 py-3">
      <Text className={`text-xl font-bold ${cor}`}>{valor}</Text>
      <Text className="text-xs text-gray-400">{label}</Text>
    </View>
  )
}
