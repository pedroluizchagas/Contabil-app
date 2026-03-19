import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@contabhub/supabase'

type StatusDoc = Database['public']['Views']['v_status_documentos']['Row']

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function DocumentosPage() {
  const { empresa } = useAuth()
  const [documentos, setDocumentos] = useState<StatusDoc[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'holerite' | 'ferias'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'nao_lido' | 'lido' | 'assinado'>('todos')
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    if (!empresa) return
    carregarDocumentos()
  }, [empresa, filtroAno])

  async function carregarDocumentos() {
    setCarregando(true)
    const { data } = await supabase
      .from('v_status_documentos')
      .select('*')
      .eq('empresa_id', empresa!.id)
      .eq('ano_referencia', filtroAno)
      .order('mes_referencia', { ascending: false })
      .order('funcionario_nome')
    setDocumentos((data as StatusDoc[]) ?? [])
    setCarregando(false)
  }

  async function abrirPdf(storagePath: string) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(storagePath, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const filtrados = documentos.filter((d) => {
    if (filtroTipo !== 'todos' && d.tipo !== filtroTipo) return false
    if (busca && !d.funcionario_nome.toLowerCase().includes(busca.toLowerCase()) &&
        !d.funcionario_codigo.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroStatus === 'nao_lido') return !d.visualizado_em
    if (filtroStatus === 'lido') return Boolean(d.visualizado_em) && !d.assinado_em
    if (filtroStatus === 'assinado') return Boolean(d.assinado_em)
    return true
  })

  const anoAtual = new Date().getFullYear()
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
        <p className="text-sm text-gray-500">Holerites e recibos de férias dos funcionários</p>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar funcionário ou código..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />

        <select
          value={filtroAno}
          onChange={(e) => setFiltroAno(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option value="todos">Todos os tipos</option>
          <option value="holerite">Holerites</option>
          <option value="ferias">Recibos de Férias</option>
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option value="todos">Todos os status</option>
          <option value="nao_lido">Não visualizados</option>
          <option value="lido">Visualizados</option>
          <option value="assinado">Assinados</option>
        </select>
      </div>

      {/* Contador */}
      <p className="mb-3 text-sm text-gray-400">
        {filtrados.length} documento{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
      </p>

      {/* Tabela agrupada por mês */}
      {carregando ? (
        <div className="flex justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <p className="text-sm text-gray-400">Nenhum documento encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <DocumentosAgrupados documentos={filtrados} onAbrirPdf={abrirPdf} />
      )}
    </div>
  )
}

function DocumentosAgrupados({
  documentos,
  onAbrirPdf,
}: {
  documentos: StatusDoc[]
  onAbrirPdf: (path: string) => void
}) {
  // Agrupa por mês/ano
  const grupos = new Map<string, StatusDoc[]>()
  for (const doc of documentos) {
    const chave = `${doc.ano_referencia}-${String(doc.mes_referencia).padStart(2, '0')}`
    const grupo = grupos.get(chave) ?? []
    grupo.push(doc)
    grupos.set(chave, grupo)
  }

  return (
    <div className="space-y-4">
      {Array.from(grupos.entries()).map(([chave, docs]) => {
        const [ano, mesStr] = chave.split('-')
        const mes = parseInt(mesStr, 10)
        const lidos = docs.filter((d) => d.visualizado_em).length
        const assinados = docs.filter((d) => d.assinado_em).length

        return (
          <div key={chave} className="rounded-xl border border-gray-200 bg-white">
            {/* Header do grupo */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h3 className="font-semibold text-gray-800">
                {MESES[mes]} / {ano}
              </h3>
              <span className="text-xs text-gray-400">
                {lidos}/{docs.length} lidos · {assinados} assinados
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase text-gray-400">
                  <th className="px-5 py-2">Funcionário</th>
                  <th className="px-5 py-2">Tipo</th>
                  <th className="px-5 py-2">Visualizado em</th>
                  <th className="px-5 py-2">Assinado em</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.documento_id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-gray-900">{doc.funcionario_nome}</p>
                      <p className="text-xs font-mono text-gray-400">{doc.funcionario_codigo}</p>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        doc.tipo === 'holerite' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {doc.tipo === 'holerite' ? 'Holerite' : 'Férias'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      {doc.visualizado_em ? (
                        <span className="text-xs text-green-600">
                          ✓ {new Date(doc.visualizado_em).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-500">Não visualizado</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {doc.assinado_em ? (
                        <span className="text-xs text-green-600">
                          ✓ {new Date(doc.assinado_em).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <button
                        onClick={() => onAbrirPdf(doc.storage_path)}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        Ver PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
