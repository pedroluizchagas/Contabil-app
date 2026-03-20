import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, Badge, PageSpinner } from '@/components/ui'

/* ── Types ───────────────────────────────────────────────────────── */
interface LoteRecente {
  id: string
  empresa_nome: string
  status: string
  total_documentos: number
  processados: number
  created_at: string
}

interface Stats {
  totalEmpresas: number
  totalFuncionarios: number
  documentosEnviados: number
  documentosPendentes: number
  lotesRecentes: LoteRecente[]
}

interface MesData {
  label: string
  valor: number
  mes: number
  ano: number
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_EXT   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['D','S','T','Q','Q','S','S']

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

/* ── SVG icons ───────────────────────────────────────────────────── */
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
const IcoUpload = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M10 13V4M6 8l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 14v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
const IcoPlus = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
const IcoFile = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M11 2H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-5-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M11 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

/* ── Sub-components ─────────────────────────────────────────────── */
interface StatCardProps {
  label: string
  value: number
  accent: string
  bg: string
  icon: React.ReactNode
}

function StatCard({ label, value, accent, bg, icon }: StatCardProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
        <p className={`mt-2 text-[2rem] font-bold leading-none ${accent}`}>{value.toLocaleString('pt-BR')}</p>
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        {icon}
      </div>
    </div>
  )
}

/* ── Bar Chart ───────────────────────────────────────────────────── */
function BarChart({ dados }: { dados: MesData[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const maxVal = Math.max(...dados.map((d) => d.valor), 1)
  const chartH = 120
  const barW   = 28
  const gap    = 14
  const paddingX = 8
  const svgW = dados.length * (barW + gap) - gap + paddingX * 2

  return (
    <svg
      viewBox={`0 0 ${svgW} ${chartH + 32}`}
      className="w-full"
      style={{ overflow: 'visible' }}
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={0} y1={Math.round(chartH * (1 - frac))}
          x2={svgW} y2={Math.round(chartH * (1 - frac))}
          stroke="#f3f4f6" strokeWidth="1"
        />
      ))}

      {/* Bars */}
      {dados.map((d, i) => {
        const barH = Math.max((d.valor / maxVal) * chartH, d.valor > 0 ? 4 : 0)
        const x = paddingX + i * (barW + gap)
        const y = chartH - barH
        const isHover = hover === i
        return (
          <g
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'default' }}
          >
            {/* Background bar (hover) */}
            <rect
              x={x - 4} y={0}
              width={barW + 8} height={chartH}
              rx={6} fill={isHover ? '#f9fafb' : 'transparent'}
            />
            {/* Actual bar */}
            <rect
              x={x} y={y}
              width={barW} height={barH}
              rx={5}
              fill="#7DC82E"
              opacity={isHover ? 1 : 0.82}
            />
            {/* Tooltip */}
            {isHover && d.valor > 0 && (
              <g>
                <rect
                  x={x + barW / 2 - 18} y={y - 26}
                  width={36} height={20}
                  rx={5} fill="#111214"
                />
                <text
                  x={x + barW / 2} y={y - 12}
                  textAnchor="middle" fontSize="10" fontWeight="600"
                  fill="white"
                >
                  {d.valor}
                </text>
              </g>
            )}
            {/* X label */}
            <text
              x={x + barW / 2} y={chartH + 18}
              textAnchor="middle" fontSize="10" fontWeight="500"
              fill={isHover ? '#6B7280' : '#C4C9D4'}
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Mini Calendar ───────────────────────────────────────────────── */
interface CalendarProps {
  mes: number
  ano: number
  diaAtual: number
  mesHoje: number
  anoHoje: number
  onPrev: () => void
  onNext: () => void
}

function MiniCalendar({ mes, ano, diaAtual, mesHoje, anoHoje, onPrev, onNext }: CalendarProps) {
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate()
  const calDias: (number | null)[] = [
    ...Array<null>(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]
  const eHoje = mes === mesHoje && ano === anoHoje

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">
          {MESES_EXT[mes]} {ano}
        </p>
        <div className="flex gap-1">
          <button
            onClick={onPrev}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-gray-100 hover:text-ink"
          >
            ‹
          </button>
          <button
            onClick={onNext}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-gray-100 hover:text-ink"
          >
            ›
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="mb-1.5 grid grid-cols-7 text-center">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i} className="text-[10px] font-semibold text-ink-xfaint">{d}</span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {calDias.map((dia, i) => {
          if (dia === null) return <span key={i} />
          const ehHoje = eHoje && dia === diaAtual
          return (
            <span
              key={i}
              className={[
                'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium transition-colors',
                ehHoje
                  ? 'bg-brand text-white'
                  : 'text-ink hover:bg-gray-100',
              ].join(' ')}
            >
              {dia}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/* ── Action shortcut ─────────────────────────────────────────────── */
function Atalho({
  href, label, descricao, icon, accentClass, bgClass,
}: {
  href: string; label: string; descricao: string
  icon: React.ReactNode; accentClass: string; bgClass: string
}) {
  return (
    <Link
      to={href}
      className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bgClass} transition-transform group-hover:scale-105`}>
        <span className={accentClass}>{icon}</span>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        <p className="text-[11px] text-ink-faint">{descricao}</p>
      </div>
    </Link>
  )
}

/* ── Page ────────────────────────────────────────────────────────── */
export function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [mesData, setMesData] = useState<MesData[]>([])
  const [carregando, setCarregando] = useState(true)

  const [hoje] = useState(() => new Date())
  const diaAtual = hoje.getDate()
  const mesHoje  = hoje.getMonth()
  const anoHoje  = hoje.getFullYear()

  const [calMes, setCalMes] = useState(mesHoje)
  const [calAno, setCalAno] = useState(anoHoje)

  /* Nome de exibição */
  const nomeCompleto =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email
      ?.split('@')[0]
      ?.replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) ??
    'Contador'
  const primeiroNome = nomeCompleto.split(' ')[0]
  const iniciais = nomeCompleto
    .split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()

  useEffect(() => { carregarDados() }, [])

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
      const documentosEnviados  = docs.filter((d) => d.status_envio === 'enviado').length
      const documentosPendentes = docs.filter((d) => d.status_envio === 'pendente').length

      /* Montar série histórica: últimos 7 meses */
      const ultimos7: MesData[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hoje)
        d.setDate(1)
        d.setMonth(d.getMonth() - (6 - i))
        return { label: MESES_ABREV[d.getMonth()], mes: d.getMonth(), ano: d.getFullYear(), valor: 0 }
      })
      docs.forEach((doc) => {
        const d = new Date(doc.created_at)
        const entry = ultimos7.find((m) => m.mes === d.getMonth() && m.ano === d.getFullYear())
        if (entry) entry.valor++
      })
      setMesData(ultimos7)

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
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setCarregando(false)
    }
  }

  function prevMes() {
    setCalMes((m) => { if (m === 0) { setCalAno((y) => y - 1); return 11 } return m - 1 })
  }
  function nextMes() {
    setCalMes((m) => { if (m === 11) { setCalAno((y) => y + 1); return 0 } return m + 1 })
  }

  const dataFormatada = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-8">

      {/* ── Saudação ─────────────────────────────────────────────── */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Olá, {primeiroNome}!</h1>
          <p className="mt-0.5 capitalize text-sm text-ink-muted">{dataFormatada}</p>
        </div>
        {/* Avatar */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-ink">{nomeCompleto}</p>
            <p className="text-[11px] text-ink-faint">{user?.email}</p>
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: '#7DC82E' }}
          >
            {iniciais}
          </div>
        </div>
      </div>

      {carregando ? (
        <PageSpinner />
      ) : (
        <>
          {/* ── Stat cards ───────────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-4 gap-4">
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

          {/* ── Gráfico + Calendário ─────────────────────────────── */}
          <div className="mb-6 grid grid-cols-3 gap-4">

            {/* Gráfico de barras */}
            <Card className="col-span-2 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Documentos por mês</p>
                  <p className="text-[11px] text-ink-faint">Histórico dos últimos 7 meses</p>
                </div>
              </div>
              {mesData.every((m) => m.valor === 0) ? (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-sm text-ink-xfaint">Nenhum documento enviado ainda</p>
                </div>
              ) : (
                <div className="px-1 pt-2">
                  <BarChart dados={mesData} />
                </div>
              )}
            </Card>

            {/* Calendário */}
            <Card className="p-5">
              <MiniCalendar
                mes={calMes}
                ano={calAno}
                diaAtual={diaAtual}
                mesHoje={mesHoje}
                anoHoje={anoHoje}
                onPrev={prevMes}
                onNext={nextMes}
              />
            </Card>
          </div>

          {/* ── Atalhos rápidos ──────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Atalho
              href="/lotes/upload"
              label="Enviar Lote"
              descricao="Upload do PDF de holerites ou férias"
              icon={<IcoUpload />}
              accentClass="text-brand"
              bgClass="bg-brand-muted"
            />
            <Atalho
              href="/empresas/nova"
              label="Cadastrar Empresa"
              descricao="Adicione uma nova empresa cliente"
              icon={<IcoPlus />}
              accentClass="text-blue-600"
              bgClass="bg-blue-50"
            />
            <Atalho
              href="/documentos"
              label="Ver Documentos"
              descricao="Acompanhe leitura e assinatura"
              icon={<IcoFile />}
              accentClass="text-purple-600"
              bgClass="bg-purple-50"
            />
          </div>

          {/* ── Lotes recentes ────────────────────────────────────── */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Lotes recentes</p>
              <Link to="/lotes/upload" className="text-xs font-medium text-brand hover:text-brand-dark">
                + Enviar lote
              </Link>
            </CardHeader>

            {!stats?.lotesRecentes.length ? (
              <div className="px-6 py-8 text-center text-sm text-ink-faint">
                Nenhum lote enviado ainda.{' '}
                <Link to="/lotes/upload" className="font-medium text-brand hover:underline">
                  Enviar primeiro lote
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Empresa', 'Status', 'Progresso', 'Data'].map((col) => (
                      <th key={col} className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-xfaint">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.lotesRecentes.map((lote) => (
                    <tr key={lote.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/60">
                      <td className="px-6 py-3.5 font-medium text-ink">{lote.empresa_nome}</td>
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
                          <span className="text-xs text-ink-faint">
                            {lote.processados}/{lote.total_documentos}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-ink-faint">
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
