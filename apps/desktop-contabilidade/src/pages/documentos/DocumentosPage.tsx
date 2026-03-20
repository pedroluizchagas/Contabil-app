import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@contabhub/supabase'
import { Badge, Card, CardHeader, PageHeader, EmptyState, PageSpinner, Input, Select } from '@/components/ui'

type StatusDoc = Database['public']['Views']['v_status_documentos']['Row']

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function DocumentosPage() {
  const [documentos, setDocumentos] = useState<StatusDoc[]>([])
  const [carregando, setCarregando] = useState(true)
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
    if (busca &&
      !d.funcionario_nome.toLowerCase().includes(busca.toLowerCase()) &&
      !d.funcionario_codigo.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroStatus === 'nao_visualizado') return !d.visualizado_em
    if (filtroStatus === 'visualizado')    return Boolean(d.visualizado_em) && !d.assinado_em
    if (filtroStatus === 'assinado')       return Boolean(d.assinado_em)
    return true
  })

  const totais = {
    total:         documentos.length,
    naoVis:        documentos.filter((d) => !d.visualizado_em).length,
    visualizado:   documentos.filter((d) => d.visualizado_em && !d.assinado_em).length,
    assinado:      documentos.filter((d) => d.assinado_em).length,
  }

  return (
    <div className="p-8">
      <PageHeader
        titulo="Documentos"
        subtitulo="Acompanhe leitura e assinatura por funcionário"
      />

      {/* ── Resumo ────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Total',           valor: totais.total,      accent: 'text-ink' },
          { label: 'Não visualizados', valor: totais.naoVis,    accent: 'text-amber-600' },
          { label: 'Visualizados',    valor: totais.visualizado, accent: 'text-blue-600' },
          { label: 'Assinados',       valor: totais.assinado,   accent: 'text-brand' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-card">
            <p className="text-xs text-ink-faint">{item.label}</p>
            <p className={`mt-1 text-2xl font-bold ${item.accent}`}>{item.valor}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ───────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar funcionário ou código..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-56"
          leftIcon={
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />

        <Select
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="w-48"
        >
          <option value="">Todas as empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </Select>

        <Select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="w-44"
        >
          <option value="todos">Todos os tipos</option>
          <option value="holerite">Holerites</option>
          <option value="ferias">Recibos de Férias</option>
        </Select>

        <Select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
          className="w-44"
        >
          <option value="todos">Todos os status</option>
          <option value="nao_visualizado">Não visualizados</option>
          <option value="visualizado">Visualizados</option>
          <option value="assinado">Assinados</option>
        </Select>
      </div>

      {/* ── Tabela ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">
            {filtrados.length} documento{filtrados.length !== 1 ? 's' : ''}
          </p>
        </CardHeader>

        {carregando ? (
          <PageSpinner />
        ) : filtrados.length === 0 ? (
          <EmptyState icone="📄" titulo="Nenhum documento encontrado." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Funcionário', 'Empresa', 'Tipo', 'Período', 'Leitura', 'Assinatura', ''].map((col) => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((doc) => (
                <tr key={doc.documento_id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink">{doc.funcionario_nome}</p>
                    <p className="font-mono text-xs text-ink-faint">{doc.funcionario_codigo}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted">{doc.empresa_nome}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={doc.tipo === 'holerite' ? 'info' : 'purple'}>
                      {doc.tipo === 'holerite' ? 'Holerite' : 'Férias'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted">
                    {MESES[doc.mes_referencia]}/{doc.ano_referencia}
                  </td>
                  <td className="px-5 py-3.5">
                    {doc.visualizado_em ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <span className="text-[10px]">✓</span>
                        {new Date(doc.visualizado_em).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500">Pendente</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {doc.assinado_em ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <span className="text-[10px]">✓</span>
                        {new Date(doc.assinado_em).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-xfaint">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => gerarUrlAssinada(doc.storage_path)}
                      className="text-xs font-medium text-brand transition-colors hover:text-brand-dark"
                    >
                      Ver PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
