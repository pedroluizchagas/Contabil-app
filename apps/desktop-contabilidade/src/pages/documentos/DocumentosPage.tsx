import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@contabhub/supabase'

type StatusDoc = Database['public']['Views']['v_status_documentos']['Row']

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function DocumentosPage() {
  const [documentos, setDocumentos] = useState<StatusDoc[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'nao_visualizado' | 'visualizado' | 'assinado'>('todos')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'holerite' | 'ferias'>('todos')
  const [busca, setBusca] = useState('')

  const [empresas, setEmpresas] = useState<Array<{ id: string; nome: string }>>([])

  useEffect(() => {
    supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => setEmpresas(data ?? []))
    carregarDocumentos()
  }, [])

  async function carregarDocumentos() {
    setCarregando(true)
    const { data } = await supabase
      .from('v_status_documentos')
      .select('*')
      .order('enviado_em', { ascending: false })
      .limit(200)
    setDocumentos((data as StatusDoc[]) ?? [])
    setCarregando(false)
  }

  async function gerarUrlAssinada(storagePath: string) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(storagePath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const filtrados = documentos.filter((d) => {
    if (filtroEmpresa && d.empresa_id !== filtroEmpresa) return false
    if (filtroTipo !== 'todos' && d.tipo !== filtroTipo) return false
    if (busca && !d.funcionario_nome.toLowerCase().includes(busca.toLowerCase()) &&
        !d.funcionario_codigo.toLowerCase().includes(busca.toLowerCase())) return false

    if (filtroStatus === 'nao_visualizado') return !d.visualizado_em
    if (filtroStatus === 'visualizado') return Boolean(d.visualizado_em) && !d.assinado_em
    if (filtroStatus === 'assinado') return Boolean(d.assinado_em)
    return true
  })

  const totais = {
    total: documentos.length,
    naoVisualizado: documentos.filter((d) => !d.visualizado_em).length,
    visualizado: documentos.filter((d) => d.visualizado_em && !d.assinado_em).length,
    assinado: documentos.filter((d) => d.assinado_em).length,
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
        <p className="text-sm text-gray-500">Acompanhe leitura e assinatura por funcionário</p>
      </div>

      {/* Resumo */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Total', valor: totais.total, cor: 'gray' },
          { label: 'Não visualizados', valor: totais.naoVisualizado, cor: 'amber' },
          { label: 'Visualizados', valor: totais.visualizado, cor: 'blue' },
          { label: 'Assinados', valor: totais.assinado, cor: 'green' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-400">{item.label}</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">{item.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar funcionário ou código..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <select
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Todas as empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="todos">Todos os tipos</option>
          <option value="holerite">Holerites</option>
          <option value="ferias">Recibos de Férias</option>
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="todos">Todos os status</option>
          <option value="nao_visualizado">Não visualizados</option>
          <option value="visualizado">Visualizados</option>
          <option value="assinado">Assinados</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {carregando ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">Nenhum documento encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                <th className="px-5 py-3">Funcionário</th>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Leitura</th>
                <th className="px-5 py-3">Assinatura</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((doc) => (
                <tr key={doc.documento_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{doc.funcionario_nome}</p>
                    <p className="text-xs text-gray-400 font-mono">{doc.funcionario_codigo}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{doc.empresa_nome}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      doc.tipo === 'holerite' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {doc.tipo === 'holerite' ? 'Holerite' : 'Férias'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {MESES[doc.mes_referencia]}/{doc.ano_referencia}
                  </td>
                  <td className="px-5 py-3">
                    {doc.visualizado_em ? (
                      <span className="text-xs text-green-600">
                        ✓ {new Date(doc.visualizado_em).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500">Pendente</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {doc.assinado_em ? (
                      <span className="text-xs text-green-600">
                        ✓ {new Date(doc.assinado_em).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => gerarUrlAssinada(doc.storage_path)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
