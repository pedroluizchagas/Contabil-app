import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardContent, Badge, PageSpinner } from '@/components/ui'

interface Stats {
  totalEmpresas: number
  totalFuncionarios: number
  documentosEnviados: number
  documentosPendentes: number
  lotesRecentes: LoteRecente[]
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function statusBadge(status: string) {
  const map: Record<string, { variant: 'success' | 'info' | 'neutral' | 'error'; label: string }> = {
    concluido:   { variant: 'success', label: 'Concluído' },
    processando: { variant: 'info',    label: 'Processando' },
    aguardando:  { variant: 'neutral', label: 'Aguardando' },
    erro:        { variant: 'error',   label: 'Erro' },
  }
  const s = map[status] ?? { variant: 'neutral', label: status }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

/* ── Sub-components ─────────────────────────────────────────────── */
interface StatCardProps {
  label: string
  value: number | string
  accent: string    // tailwind text color class
  bg: string        // tailwind bg color class
  icon: React.ReactNode
}

function StatCard({ label, value, accent, bg, icon }: StatCardProps) {
  return (
    <Card className="flex items-start justify-between gap-4 p-5">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`mt-1.5 text-3xl font-bold ${accent}`}>{value}</p>
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        {icon}
      </div>
    </Card>
  )
}

interface ActionCardProps {
  titulo: string
  descricao: string
  href: string
  icon: React.ReactNode
  accent: string
  bg: string
}

function ActionCard({ titulo, descricao, href, icon, accent, bg }: ActionCardProps) {
  return (
    <Link
      to={href}
      className="group flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} transition-transform group-hover:scale-110`}>
        <span className={accent}>{icon}</span>
      </div>
      <div>
        <p className="font-semibold text-gray-900">{titulo}</p>
        <p className="mt-0.5 text-sm text-gray-500">{descricao}</p>
      </div>
    </Link>
  )
}

/* ── SVG icons ───────────────────────────────────────────────────── */
const IcoUpload = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 13V4M6 8l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 14v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
const IcoPlus = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
const IcoFile = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M11 2H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-5-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M11 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)
const IcoBusiness = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="6" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 6V5a4 4 0 0 1 8 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 12h4M10 10v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)
const IcoUsers = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2 18a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 4a3 3 0 0 1 0 6M18 18a6 6 0 0 0-4-5.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)
const IcoSend = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M17 3L2 9l5 3 2 5 8-14z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M7 12l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)
const IcoClock = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* ── Page ────────────────────────────────────────────────────────── */
export function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [mesData, setMesData] = useState<MesData[]>([])
  const [carregando, setCarregando] = useState(true)

  const [hoje] = useState(() => new Date())
  const diaAtual = hoje.getDate()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()

  const [calMes, setCalMes] = useState(mesHoje)
  const [calAno, setCalAno] = useState(anoHoje)

  const nomeCompleto =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email
      ?.split('@')[0]
      ?.replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) ??
    'Contador'
  const primeiroNome = nomeCompleto.split(' ')[0]
  const emailUsuario = user?.email ?? ''
  const iniciais = nomeCompleto
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  useEffect(() => {
    carregarDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregarDados() {
    setCarregando(true)
    try {
      const [empresasRes, funcionariosRes, documentosRes, lotesRes] = await Promise.all([
        supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('funcionarios').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('documentos').select('created_at, status_envio'),
        supabase
          .from('lotes')
          .select('id, status, total_documentos, processados, created_at, empresas(nome)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const docs = documentosRes.data ?? []
      const documentosEnviados = docs.filter((d) => d.status_envio === 'enviado').length
      const documentosPendentes = docs.filter((d) => d.status_envio === 'pendente').length

    const documentosEnviados  = documentosRes.data?.filter((d) => d.status_envio === 'enviado').length ?? 0
    const documentosPendentes = documentosRes.data?.filter((d) => d.status_envio === 'pendente').length ?? 0

      setStats({
        totalEmpresas: empresasRes.count ?? 0,
        totalFuncionarios: funcionariosRes.count ?? 0,
        documentosEnviados,
        documentosPendentes,
        lotesRecentes: (lotesRes.data ?? []).map((l) => ({
          id: l.id,
          empresa_nome: (l.empresas as { nome: string } | null)?.nome ?? '—',
          status: l.status,
          total_documentos: l.total_documentos,
          processados: l.processados,
          created_at: l.created_at,
        })),
      })
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err)
    } finally {
      setCarregando(false)
    }
  }

  function prevMes() {
    setCalMes((m) => {
      if (m === 0) { setCalAno((y) => y - 1); return 11 }
      return m - 1
    })
  }

  function nextMes() {
    setCalMes((m) => {
      if (m === 11) { setCalAno((y) => y + 1); return 0 }
      return m + 1
    })
  }

  const primeiroDiaMes = new Date(calAno, calMes, 1).getDay()
  const diasNoMes = new Date(calAno, calMes + 1, 0).getDate()
  const calDias: (number | null)[] = [
    ...Array<null>(primeiroDiaMes).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]

  return (
    <div className="p-8">
      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">Visão geral da sua contabilidade</p>
      </div>

      {carregando ? (
        <PageSpinner />
      ) : (
        <>
          {/* ── Cards de métricas ───────────────────────────────────── */}
          <div className="mb-7 grid grid-cols-4 gap-4">
            <StatCard
              label="Empresas ativas"
              value={stats?.totalEmpresas ?? 0}
              accent="text-brand"
              bg="bg-brand-muted"
              icon={<span className="text-brand"><IcoBusiness /></span>}
            />
            <StatCard
              label="Funcionários ativos"
              value={stats?.totalFuncionarios ?? 0}
              accent="text-blue-600"
              bg="bg-blue-50"
              icon={<span className="text-blue-500"><IcoUsers /></span>}
            />
            <StatCard
              label="Documentos enviados"
              value={stats?.documentosEnviados ?? 0}
              accent="text-emerald-600"
              bg="bg-emerald-50"
              icon={<span className="text-emerald-500"><IcoSend /></span>}
            />
            <StatCard
              label="Aguardando envio"
              value={stats?.documentosPendentes ?? 0}
              accent="text-amber-600"
              bg="bg-amber-50"
              icon={<span className="text-amber-500"><IcoClock /></span>}
            />
          </div>

          {/* ── Ações rápidas ───────────────────────────────────────── */}
          <div className="mb-7 grid grid-cols-3 gap-4">
            <ActionCard
              titulo="Enviar Lote"
              descricao="Upload do PDF de holerites ou férias"
              href="/lotes/upload"
              icon={<IcoUpload />}
              accent="text-brand"
              bg="bg-brand-muted"
            />
            <ActionCard
              titulo="Cadastrar Empresa"
              descricao="Adicione uma nova empresa cliente"
              href="/empresas/nova"
              icon={<IcoPlus />}
              accent="text-blue-600"
              bg="bg-blue-50"
            />
            <ActionCard
              titulo="Ver Documentos"
              descricao="Acompanhe leitura e assinatura"
              href="/documentos"
              icon={<IcoFile />}
              accent="text-purple-600"
              bg="bg-purple-50"
            />
          </div>

          {/* ── Lotes recentes ──────────────────────────────────────── */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Lotes recentes</h2>
              <Link to="/lotes/upload" className="text-xs font-medium text-brand hover:text-brand-dark">
                + Enviar lote
              </Link>
            </CardHeader>

            {stats?.lotesRecentes.length === 0 ? (
              <CardContent>
                <p className="py-6 text-center text-sm text-gray-400">
                  Nenhum lote enviado ainda.{' '}
                  <Link to="/lotes/upload" className="font-medium text-brand hover:underline">
                    Enviar primeiro lote
                  </Link>
                </p>
              </CardContent>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Empresa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Progresso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.lotesRecentes.map((lote) => (
                    <tr key={lote.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/60">
                      <td className="px-6 py-3.5 font-medium text-gray-900">{lote.empresa_nome}</td>
                      <td className="px-6 py-3.5">{statusBadge(lote.status)}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-brand transition-all"
                              style={{
                                width: lote.total_documentos
                                  ? `${Math.round((lote.processados / lote.total_documentos) * 100)}%`
                                  : '0%',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">
                            {lote.processados}/{lote.total_documentos}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-gray-400">
                        {new Date(lote.created_at).toLocaleDateString('pt-BR')}
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
