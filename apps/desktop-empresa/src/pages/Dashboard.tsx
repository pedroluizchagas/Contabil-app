import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Badge, Card, PageHeader, PageSpinner } from '@/components/ui'

interface Stats {
  totalFuncionarios: number
  documentosNaoLidos: number
  documentosLidos: number
  documentosAssinados: number
  ultimosDocumentos: Array<{
    id: string
    funcionario_nome: string
    funcionario_codigo: string
    tipo: string
    mes_referencia: number
    ano_referencia: number
    visualizado_em: string | null
    assinado_em: string | null
  }>
}

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

export function DashboardPage() {
  const { empresa } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!empresa) return
    carregarStats(empresa.id)
  }, [empresa])

  async function carregarStats(empresaId: string) {
    setCarregando(true)
    setErro(null)

    const [funcRes, docsRes] = await Promise.all([
      supabase
        .from('funcionarios')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('ativo', true),
      supabase
        .from('v_status_documentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('enviado_em', { ascending: false })
        .limit(100),
    ])

    if (funcRes.error || docsRes.error) {
      console.error('Erro ao carregar dashboard:', funcRes.error?.message ?? docsRes.error?.message)
      setErro('Não foi possível carregar os dados. Tente novamente.')
      setCarregando(false)
      return
    }

    const docs = docsRes.data ?? []

    setStats({
      totalFuncionarios: funcRes.count ?? 0,
      documentosNaoLidos: docs.filter((d) => !d.visualizado_em).length,
      documentosLidos: docs.filter((d) => d.visualizado_em && !d.assinado_em).length,
      documentosAssinados: docs.filter((d) => d.assinado_em).length,
      ultimosDocumentos: docs.slice(0, 8).map((d) => ({
        id: d.documento_id,
        funcionario_nome: d.funcionario_nome,
        funcionario_codigo: d.funcionario_codigo,
        tipo: d.tipo,
        mes_referencia: d.mes_referencia,
        ano_referencia: d.ano_referencia,
        visualizado_em: d.visualizado_em,
        assinado_em: d.assinado_em,
      })),
    })
    setCarregando(false)
  }

  return (
    <div className="p-8">
      <PageHeader
        titulo="Dashboard"
        subtitulo={`${empresa?.nome ?? ''} · visão geral dos documentos`}
      />

      {carregando ? (
        <PageSpinner />
      ) : erro ? (
        <Card className="py-12 text-center">
          <p className="text-sm text-red-600">{erro}</p>
        </Card>
      ) : (
        <>
          {/* Cards */}
          <div className="mb-8 grid grid-cols-4 gap-4">
            <StatCard label="Funcionários ativos" valor={stats?.totalFuncionarios ?? 0} cor="ink" />
            <StatCard
              label="Docs não visualizados"
              valor={stats?.documentosNaoLidos ?? 0}
              cor="amber"
            />
            <StatCard label="Visualizados" valor={stats?.documentosLidos ?? 0} cor="blue" />
            <StatCard label="Assinados" valor={stats?.documentosAssinados ?? 0} cor="brand" />
          </div>

          {/* Taxa de leitura */}
          {stats &&
            stats.documentosNaoLidos + stats.documentosLidos + stats.documentosAssinados > 0 && (
              <Card className="mb-8 p-5">
                <p className="mb-3 text-sm font-medium text-ink">Taxa de leitura dos documentos</p>
                <TaxaLeitura
                  naoLidos={stats.documentosNaoLidos}
                  lidos={stats.documentosLidos}
                  assinados={stats.documentosAssinados}
                />
              </Card>
            )}

          {/* Ações rápidas */}
          <div className="mb-8 grid grid-cols-2 gap-4">
            <AcaoCard
              titulo="Ver todos os documentos"
              descricao="Acompanhe holerites e recibos de férias"
              href="/documentos"
              icone="📄"
            />
            <AcaoCard
              titulo="Funcionários"
              descricao="Liste e gerencie sua equipe"
              href="/funcionarios"
              icone="👥"
            />
          </div>

          {/* Últimos documentos */}
          <Card>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-ink">Últimos documentos</h2>
              <Link
                to="/documentos"
                className="text-sm font-medium text-brand-dark hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {stats?.ultimosDocumentos.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-faint">
                Nenhum documento disponível ainda.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-ink-faint">
                    <th className="px-6 py-3">Funcionário</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Período</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.ultimosDocumentos.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-ink">{doc.funcionario_nome}</p>
                        <p className="font-mono text-xs text-ink-faint">{doc.funcionario_codigo}</p>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={doc.tipo === 'holerite' ? 'info' : 'purple'}>
                          {doc.tipo === 'holerite' ? 'Holerite' : 'Férias'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-ink-muted">
                        {MESES[doc.mes_referencia]}/{doc.ano_referencia}
                      </td>
                      <td className="px-6 py-3">
                        {doc.assinado_em ? (
                          <Badge variant="success">✓ Assinado</Badge>
                        ) : doc.visualizado_em ? (
                          <Badge variant="info">✓ Lido</Badge>
                        ) : (
                          <Badge variant="warning">Pendente</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  const cores: Record<string, string> = {
    ink: 'text-ink',
    brand: 'text-brand-dark',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
  }
  return (
    <Card className="p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${cores[cor] ?? 'text-ink'}`}>{valor}</p>
    </Card>
  )
}

function AcaoCard({
  titulo,
  descricao,
  href,
  icone,
}: {
  titulo: string
  descricao: string
  href: string
  icone: string
}) {
  return (
    <Link
      to={href}
      className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card transition-shadow hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted text-xl">
        {icone}
      </span>
      <div>
        <p className="font-semibold text-ink">{titulo}</p>
        <p className="text-sm text-ink-muted">{descricao}</p>
      </div>
    </Link>
  )
}

function TaxaLeitura({
  naoLidos,
  lidos,
  assinados,
}: {
  naoLidos: number
  lidos: number
  assinados: number
}) {
  const total = naoLidos + lidos + assinados
  const pctNaoLido = (naoLidos / total) * 100
  const pctLido = (lidos / total) * 100
  const pctAssinado = (assinados / total) * 100

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="bg-amber-400"
          style={{ width: `${pctNaoLido}%` }}
          title={`Não lido: ${naoLidos}`}
        />
        <div className="bg-blue-400" style={{ width: `${pctLido}%` }} title={`Lido: ${lidos}`} />
        <div
          className="bg-brand"
          style={{ width: `${pctAssinado}%` }}
          title={`Assinado: ${assinados}`}
        />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-ink-muted">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />
          Não visualizado ({naoLidos})
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-400" />
          Visualizado ({lidos})
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand" />
          Assinado ({assinados})
        </span>
      </div>
    </div>
  )
}
