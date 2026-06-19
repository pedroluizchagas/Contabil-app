import { useEffect, useState } from 'react'
import { View, Text, Pressable, RefreshControl, ActivityIndicator, SectionList } from 'react-native'
import { SafeAreaView } from 'react-native'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@contabhub/supabase'

type StatusDoc = Database['public']['Views']['v_status_documentos']['Row']
type TipoFiltro = 'todos' | 'holerite' | 'ferias'

const MESES_FULL = [
  '',
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export default function DocumentosScreen() {
  const { funcionario } = useAuth()
  const [docs, setDocs] = useState<StatusDoc[]>([])
  const [filtro, setFiltro] = useState<TipoFiltro>('todos')
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
      .order('ano_referencia', { ascending: false })
      .order('mes_referencia', { ascending: false })

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

      if (!doc.visualizado_em) {
        await supabase.from('eventos_documento').insert({
          documento_id: doc.documento_id,
          funcionario_id: funcionario!.id,
          tipo: 'visualizado',
        })
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

  const filtrados = docs.filter((d) => filtro === 'todos' || d.tipo === filtro)

  // Agrupa por Mês/Ano para SectionList
  const sections = agruparPorMes(filtrados)

  if (carregando) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#7DC82E" size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header fixo */}
      <View className="bg-white border-b border-gray-100 px-4 pt-12 pb-3">
        <Text className="mb-3 text-xl font-bold text-gray-900">Meus Documentos</Text>

        {/* Filtro de tipo */}
        <View className="flex-row gap-2">
          {(['todos', 'holerite', 'ferias'] as TipoFiltro[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setFiltro(t)}
              className={`flex-1 items-center rounded-lg py-2 ${
                filtro === t ? 'bg-brand' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-medium ${filtro === t ? 'text-white' : 'text-gray-600'}`}
              >
                {t === 'todos' ? 'Todos' : t === 'holerite' ? 'Holerites' : 'Férias'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {filtrados.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">📭</Text>
          <Text className="text-sm text-gray-400">Nenhum documento encontrado.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.documento_id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => carregarDocs(true)}
              tintColor="#7DC82E"
            />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderSectionHeader={({ section }) => (
            <View className="mb-2 mt-4 flex-row items-center justify-between">
              <Text className="font-semibold text-gray-700">{section.title}</Text>
              <Text className="text-xs text-gray-400">
                {section.data.length} doc{section.data.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          renderItem={({ item: doc, index, section }) => (
            <Pressable
              onPress={() => abrirDocumento(doc)}
              className={`flex-row items-center bg-white px-4 py-3.5 ${
                index === 0 ? 'rounded-t-2xl' : ''
              } ${
                index === section.data.length - 1 ? 'rounded-b-2xl mb-1' : 'border-b border-gray-50'
              }`}
            >
              {/* Ícone */}
              <View
                className={`mr-3 h-11 w-11 items-center justify-center rounded-xl ${
                  doc.tipo === 'holerite' ? 'bg-blue-50' : 'bg-purple-50'
                }`}
              >
                <Text className="text-xl">{doc.tipo === 'holerite' ? '💵' : '🏖'}</Text>
              </View>

              {/* Info */}
              <View className="flex-1">
                <Text className="font-medium text-gray-900">
                  {doc.tipo === 'holerite' ? 'Holerite' : 'Recibo de Férias'}
                </Text>
                <StatusLinha doc={doc} />
              </View>

              {/* Indicador não lido */}
              {!doc.visualizado_em ? (
                <View className="h-2 w-2 rounded-full bg-amber-500" />
              ) : (
                <Text className="text-gray-300">›</Text>
              )}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}

function StatusLinha({ doc }: { doc: StatusDoc }) {
  if (doc.assinado_em) {
    return (
      <Text className="text-xs text-green-600">
        ✓ Assinado em {new Date(doc.assinado_em).toLocaleDateString('pt-BR')}
      </Text>
    )
  }
  if (doc.visualizado_em) {
    return (
      <Text className="text-xs text-blue-500">
        ✓ Lido em {new Date(doc.visualizado_em).toLocaleDateString('pt-BR')}
      </Text>
    )
  }
  return <Text className="text-xs text-amber-500">● Não visualizado</Text>
}

function agruparPorMes(docs: StatusDoc[]): Array<{ title: string; data: StatusDoc[] }> {
  const mapa = new Map<string, StatusDoc[]>()
  for (const doc of docs) {
    const chave = `${MESES_FULL[doc.mes_referencia]} / ${doc.ano_referencia}`
    const grupo = mapa.get(chave) ?? []
    grupo.push(doc)
    mapa.set(chave, grupo)
  }
  return Array.from(mapa.entries()).map(([title, data]) => ({ title, data }))
}
