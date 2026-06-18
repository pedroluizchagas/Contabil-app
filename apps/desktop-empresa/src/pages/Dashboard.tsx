import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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

  useEffect(() => {
    if (!empresa) return
    carregarStats()
  }, [empresa])

  async function carregarStats() {
    setCarregando(true)

    const [funcRes, docsRes] = await Promise.all([
      supabase
        .from('funcionarios')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresa!.id)
        .eq('ativo', true),
      supabase
        .from('v_status_documentos')
        .select('*')
        .eq('empresa_id', empresa!.id)
        .order('enviado_em', { ascending: false })
        .limit(100),
    ])

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">{empresa?.nome} · visão geral dos documentos</p>
      </div>

      {carregando ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Cards */}
          <div className="mb-8 grid grid-cols-4 gap-4">
            <StatCard
              label="Funcionários ativos"
              valor={stats?.totalFuncionarios ?? 0}
              cor="gray"
            />
            <StatCard
              label="Docs não visualizados"
              valor={stats?.documentosNaoLidos ?? 0}
              cor="amber"
            />
            <StatCard label="Visualizados" valor={stats?.documentosLidos ?? 0} cor="blue" />
            <StatCard label="Assinados" valor={stats?.documentosAssinados ?? 0} cor="green" />
          </div>

          {/* Taxa de leitura */}
          {stats &&
            stats.documentosNaoLidos + stats.documentosLidos + stats.documentosAssinados > 0 && (
              <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
                <p className="mb-3 text-sm font-medium text-gray-700">
                  Taxa de leitura dos documentos
                </p>
                <TaxaLeitura
                  naoLidos={stats.documentosNaoLidos}
                  lidos={stats.documentosLidos}
                  assinados={stats.documentosAssinados}
                />
              </div>
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
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-800">Últimos documentos</h2>
              <Link to="/documentos" className="text-sm text-emerald-600 hover:underline">
                Ver todos
              </Link>
            </div>
            {stats?.ultimosDocumentos.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                Nenhum documento disponível ainda.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
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
                        <p className="font-medium text-gray-900">{doc.funcionario_nome}</p>
                        <p className="text-xs text-gray-400 font-mono">{doc.funcionario_codigo}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            doc.tipo === 'holerite'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {doc.tipo === 'holerite' ? 'Holerite' : 'Férias'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {MESES[doc.mes_referencia]}/{doc.ano_referencia}
                      </td>
                      <td className="px-6 py-3">
                        {doc.assinado_em ? (
                          <span className="text-xs text-green-600">✓ Assinado</span>
                        ) : doc.visualizado_em ? (
                          <span className="text-xs text-blue-500">✓ Lido</span>
                        ) : (
                          <span className="text-xs text-amber-500">Pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  const cores: Record<string, string> = {
    gray: 'text-gray-900',
    green: 'text-green-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${cores[cor] ?? 'text-gray-900'}`}>{valor}</p>
    </div>
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
      className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-xl text-emerald-600">
        {icone}
      </span>
      <div>
        <p className="font-semibold text-gray-900">{titulo}</p>
        <p className="text-sm text-gray-500">{descricao}</p>
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
          className="bg-emerald-500"
          style={{ width: `${pctAssinado}%` }}
          title={`Assinado: ${assinados}`}
        />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1" />
          Não visualizado ({naoLidos})
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400 mr-1" />
          Visualizado ({lidos})
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" />
          Assinado ({assinados})
        </span>
      </div>
    </div>
  )
}
