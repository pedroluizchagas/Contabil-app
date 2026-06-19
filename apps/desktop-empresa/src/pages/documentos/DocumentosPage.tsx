import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@contabhub/supabase'
import { Badge, Card, EmptyState, Input, PageHeader, PageSpinner, Select } from '@/components/ui'

type StatusDoc = Database['public']['Views']['v_status_documentos']['Row']

const MESES = [
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

export function DocumentosPage() {
  const { empresa } = useAuth()
  const [documentos, setDocumentos] = useState<StatusDoc[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'holerite' | 'ferias'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'nao_lido' | 'lido' | 'assinado'>(
    'todos'
  )
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    if (!empresa) return
    carregarDocumentos(empresa.id)
  }, [empresa, filtroAno])

  async function carregarDocumentos(empresaId: string) {
    setCarregando(true)
    setErro(null)
    const { data, error } = await supabase
      .from('v_status_documentos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ano_referencia', filtroAno)
      .order('mes_referencia', { ascending: false })
      .order('funcionario_nome')

    if (error) {
      console.error('Erro ao carregar documentos:', error.message)
      setErro('Não foi possível carregar os documentos. Tente novamente.')
      setDocumentos([])
    } else {
      setDocumentos(data ?? [])
    }
    setCarregando(false)
  }

  async function abrirPdf(storagePath: string) {
    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(storagePath, 120)
    if (error || !data?.signedUrl) {
      console.error('Erro ao gerar link do PDF:', error?.message)
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const filtrados = documentos.filter((d) => {
    if (filtroTipo !== 'todos' && d.tipo !== filtroTipo) return false
    if (
      busca &&
      !(d.funcionario_nome ?? '').toLowerCase().includes(busca.toLowerCase()) &&
      !(d.funcionario_codigo ?? '').toLowerCase().includes(busca.toLowerCase())
    )
      return false
    if (filtroStatus === 'nao_lido') return !d.visualizado_em
    if (filtroStatus === 'lido') return Boolean(d.visualizado_em) && !d.assinado_em
    if (filtroStatus === 'assinado') return Boolean(d.assinado_em)
    return true
  })

  const anoAtual = new Date().getFullYear()
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1]

  return (
    <div className="p-8">
      <PageHeader titulo="Documentos" subtitulo="Holerites e recibos de férias dos funcionários" />

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-64">
          <Input
            type="text"
            placeholder="Buscar funcionário ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <Select
          value={filtroAno}
          onChange={(e) => setFiltroAno(Number(e.target.value))}
          className="w-auto"
        >
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>

        <Select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="w-auto"
        >
          <option value="todos">Todos os tipos</option>
          <option value="holerite">Holerites</option>
          <option value="ferias">Recibos de Férias</option>
        </Select>

        <Select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
          className="w-auto"
        >
          <option value="todos">Todos os status</option>
          <option value="nao_lido">Não visualizados</option>
          <option value="lido">Visualizados</option>
          <option value="assinado">Assinados</option>
        </Select>
      </div>

      {/* Contador */}
      <p className="mb-3 text-sm text-ink-faint">
        {filtrados.length} documento{filtrados.length !== 1 ? 's' : ''} encontrado
        {filtrados.length !== 1 ? 's' : ''}
      </p>

      {/* Tabela agrupada por mês */}
      {carregando ? (
        <PageSpinner />
      ) : erro ? (
        <Card className="py-12 text-center">
          <p className="text-sm text-red-600">{erro}</p>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card>
          <EmptyState
            icone="📄"
            titulo="Nenhum documento encontrado"
            descricao="Ajuste os filtros para ver outros documentos."
          />
        </Card>
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
          <Card key={chave}>
            {/* Header do grupo */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h3 className="font-semibold text-ink">
                {MESES[mes]} / {ano}
              </h3>
              <span className="text-xs text-ink-faint">
                {lidos}/{docs.length} lidos · {assinados} assinados
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase text-ink-faint">
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
                      <p className="font-medium text-ink">{doc.funcionario_nome}</p>
                      <p className="font-mono text-xs text-ink-faint">{doc.funcionario_codigo}</p>
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge variant={doc.tipo === 'holerite' ? 'info' : 'purple'}>
                        {doc.tipo === 'holerite' ? 'Holerite' : 'Férias'}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5">
                      {doc.visualizado_em ? (
                        <span className="text-xs text-brand-dark">
                          ✓ {new Date(doc.visualizado_em).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-500">Não visualizado</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {doc.assinado_em ? (
                        <span className="text-xs text-brand-dark">
                          ✓ {new Date(doc.assinado_em).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <button
                        onClick={() => onAbrirPdf(doc.storage_path)}
                        className="text-xs font-medium text-brand-dark hover:underline"
                      >
                        Ver PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      })}
    </div>
  )
}
