import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Stats {
  totalEmpresas: number
  totalFuncionarios: number
  documentosEnviados: number
  documentosPendentes: number
  lotesRecentes: Array<{
    id: string
    empresa_nome: string
    status: string
    total_documentos: number
    processados: number
    created_at: string
  }>
}

export function DashboardPage() {
  const { tenantId } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!tenantId) return
    carregarStats()
  }, [tenantId])

  async function carregarStats() {
    setCarregando(true)

    const [empresasRes, funcionariosRes, documentosRes, lotesRes] = await Promise.all([
      supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('funcionarios').select('id', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('documentos').select('status_envio', { count: 'exact' }),
      supabase
        .from('lotes')
        .select('id, status, total_documentos, processados, created_at, empresas(nome)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const documentosEnviados = documentosRes.data?.filter((d) => d.status_envio === 'enviado').length ?? 0
    const documentosPendentes = documentosRes.data?.filter((d) => d.status_envio === 'pendente').length ?? 0

    setStats({
      totalEmpresas: empresasRes.count ?? 0,
      totalFuncionarios: funcionariosRes.count ?? 0,
      documentosEnviados,
      documentosPendentes,
      lotesRecentes: (lotesRes.data ?? []).map((l) => ({
        id: l.id,
        empresa_nome: (l.empresas as unknown as { nome: string })?.nome ?? '—',
        status: l.status,
        total_documentos: l.total_documentos,
        processados: l.processados,
        created_at: l.created_at,
      })),
    })

    setCarregando(false)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Visão geral da sua contabilidade</p>
      </div>

      {carregando ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Cards de estatísticas */}
          <div className="mb-8 grid grid-cols-4 gap-4">
            <StatCard label="Empresas ativas" value={stats?.totalEmpresas ?? 0} cor="blue" />
            <StatCard label="Funcionários ativos" value={stats?.totalFuncionarios ?? 0} cor="green" />
            <StatCard label="Documentos enviados" value={stats?.documentosEnviados ?? 0} cor="indigo" />
            <StatCard label="Aguardando envio" value={stats?.documentosPendentes ?? 0} cor="amber" />
          </div>

          {/* Ações rápidas */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <AcaoCard
              titulo="Enviar Lote"
              descricao="Faça upload do PDF de holerites ou férias"
              href="/lotes/upload"
              icone="↑"
            />
            <AcaoCard
              titulo="Cadastrar Empresa"
              descricao="Adicione uma nova empresa cliente"
              href="/empresas/nova"
              icone="+"
            />
            <AcaoCard
              titulo="Ver Documentos"
              descricao="Acompanhe leitura e assinatura"
              href="/documentos"
              icone="📄"
            />
          </div>

          {/* Lotes recentes */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-800">Lotes recentes</h2>
            </div>
            {stats?.lotesRecentes.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">
                Nenhum lote enviado ainda.{' '}
                <Link to="/lotes/upload" className="text-blue-600 hover:underline">
                  Enviar primeiro lote
                </Link>
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-400">
                    <th className="px-6 py-3">Empresa</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Progresso</th>
                    <th className="px-6 py-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.lotesRecentes.map((lote) => (
                    <tr key={lote.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{lote.empresa_nome}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={lote.status} />
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {lote.processados}/{lote.total_documentos} docs
                      </td>
                      <td className="px-6 py-3 text-gray-400">
                        {new Date(lote.created_at).toLocaleDateString('pt-BR')}
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

function StatCard({ label, value, cor }: { label: string; value: number; cor: string }) {
  const cores: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    amber: 'text-amber-600 bg-amber-50',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${cores[cor]?.split(' ')[0] ?? 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function AcaoCard({ titulo, descricao, href, icone }: { titulo: string; descricao: string; href: string; icone: string }) {
  return (
    <Link
      to={href}
      className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-600">
        {icone}
      </span>
      <div>
        <p className="font-semibold text-gray-900">{titulo}</p>
        <p className="text-sm text-gray-500">{descricao}</p>
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    concluido:    'bg-green-100 text-green-700',
    processando:  'bg-blue-100 text-blue-700',
    aguardando:   'bg-gray-100 text-gray-600',
    erro:         'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    concluido: 'Concluído', processando: 'Processando',
    aguardando: 'Aguardando', erro: 'Erro',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${estilos[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}
