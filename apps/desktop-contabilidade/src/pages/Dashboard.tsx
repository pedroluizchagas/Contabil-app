import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Stats {
  totalEmpresas: number
  totalFuncionarios: number
  documentosEnviados: number
  documentosPendentes: number
  lotesRecentes: LoteRecente[]
}

interface LoteRecente {
  id: string
  empresa_nome: string
  status: string
  total_documentos: number
  processados: number
  created_at: string
}

interface MesData {
  mesAbrev: string
  enviadosPct: number
  pendentesPct: number
  enviadosAbs: number
  pendentesAbs: number
}

const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_NOMES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_ABREV = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']

// --- Icones ---

function IconEmpresas() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function IconFuncionarios() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function IconDocEnviados() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
    </svg>
  )
}

function IconPendentes() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function IconDoc() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

// --- Componente Principal ---

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

      const meses = Array.from({ length: 12 }, () => ({ enviados: 0, pendentes: 0 }))
      docs.forEach((d) => {
        const dt = new Date(d.created_at)
        if (dt.getFullYear() === anoHoje) {
          const m = dt.getMonth()
          if (d.status_envio === 'enviado') meses[m].enviados++
          else meses[m].pendentes++
        }
      })
      const maxVal = Math.max(...meses.map((m) => m.enviados + m.pendentes), 1)
      setMesData(
        meses.map((m, i) => ({
          mesAbrev: MESES_ABREV[i],
          enviadosPct: Math.round((m.enviados / maxVal) * 90),
          pendentesPct: Math.round((m.pendentes / maxVal) * 90),
          enviadosAbs: m.enviados,
          pendentesAbs: m.pendentes,
        }))
      )

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
    <div className="flex flex-col gap-4 p-6">

      {/* Top Bar */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-bold leading-tight text-ink">Ola, {primeiroNome}!</h1>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">Aqui esta o resumo da sua contabilidade</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[#eaeaea] bg-card text-[#999] transition-colors hover:text-[#666]">
            <IconBell />
          </button>
          <Link
            to="/lotes/upload"
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-[#111] transition-opacity hover:opacity-90"
          >
            <IconUpload />
            Enviar Lote
          </Link>
          <div className="flex items-center gap-2.5 rounded-full bg-card py-[5px] pl-[5px] pr-3.5 shadow-topbar">
            <div
              className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #9de84a 0%, #5CA618 100%)' }}
            >
              {iniciais}
            </div>
            <div>
              <div className="text-[11.5px] font-semibold leading-tight text-ink">{nomeCompleto}</div>
              <div className="text-[10px] text-ink-xfaint">{emailUsuario}</div>
            </div>
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-3">
            <KpiCard label="Empresas Ativas" value={stats?.totalEmpresas ?? 0} delta="+0" deltaDir="up" deltaSub="do mes passado" icon={<IconEmpresas />} />
            <KpiCard label="Funcionarios Ativos" value={stats?.totalFuncionarios ?? 0} delta="+0" deltaDir="up" deltaSub="do mes passado" icon={<IconFuncionarios />} />
            <KpiCard label="Documentos Enviados" value={stats?.documentosEnviados ?? 0} delta="+0" deltaDir="up" deltaSub="do mes passado" icon={<IconDocEnviados />} />
            <KpiCard label="Aguardando Envio" value={stats?.documentosPendentes ?? 0} delta="0" deltaDir={stats?.documentosPendentes ? 'down' : 'up'} deltaSub="pendentes agora" icon={<IconPendentes />} />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-[1fr_268px] gap-3">

            {/* Coluna esquerda */}
            <div className="flex flex-col gap-3">

              {/* Grafico de barras */}
              <div className="rounded-card bg-card shadow-card px-5 pb-3.5 pt-[18px]">
                <div className="mb-3.5 flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-ink">Documentos por Mes</span>
                  <button className="flex cursor-pointer items-center gap-1.5 rounded-[7px] border-none bg-[#f5f5f5] px-3 py-[5px] font-[inherit] text-[11.5px] text-[#666]">
                    {MESES_NOMES[mesHoje]}
                    <IconChevronDown />
                  </button>
                </div>
                <div className="relative ml-7">
                  {/* Labels eixo Y */}
                  <div className="absolute -left-7 bottom-[22px] top-0 flex flex-col-reverse justify-between">
                    <span className="text-[9px] leading-none text-[#ccc]">0</span>
                    <span className="text-[9px] leading-none text-[#ccc]">25%</span>
                    <span className="text-[9px] leading-none text-[#ccc]">50%</span>
                    <span className="text-[9px] leading-none text-[#ccc]">75%</span>
                    <span className="text-[9px] leading-none text-[#ccc]">Max</span>
                  </div>
                  {/* Barras */}
                  <div className="flex h-[120px] items-end gap-[5px]">
                    {mesData.map((m, i) => (
                      <div key={i} className="relative flex flex-1 items-end gap-0.5">
                        {i === mesHoje && (
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 gap-3.5 whitespace-nowrap rounded-[10px] bg-[#1e1e1e] px-3 py-2 text-[10px] text-white">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8.5px] uppercase tracking-[0.05em] text-[#666]">Enviados</span>
                              <span className="text-[13px] font-bold text-brand">{m.enviadosAbs}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8.5px] uppercase tracking-[0.05em] text-[#666]">Pendentes</span>
                              <span className="text-[13px] font-bold">{m.pendentesAbs}</span>
                            </div>
                            <div
                              className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 translate-y-full"
                              style={{
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: '6px solid #1e1e1e',
                              }}
                            />
                          </div>
                        )}
                        <div
                          className="min-w-[7px] flex-1 rounded-t-[4px] bg-brand"
                          style={{ height: `${Math.max(m.enviadosPct, 4)}%` }}
                        />
                        <div
                          className="min-w-[7px] flex-1 rounded-t-[4px] bg-[#EBEBEB]"
                          style={{ height: `${Math.max(m.pendentesPct, 4)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Labels eixo X */}
                  <div className="mt-0.5 flex gap-[5px] border-t border-[#f2f2f2] pt-1.5">
                    {mesData.map((m, i) => (
                      <div key={i} className="flex-1 text-center text-[9px] text-[#c0c0c0]">
                        {m.mesAbrev}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lotes Recentes */}
              <div className="rounded-card bg-card shadow-card">
                <div className="flex items-center justify-between border-b border-[#f5f5f5] px-5 py-4">
                  <span className="text-[13.5px] font-semibold text-ink">Lotes Recentes</span>
                  <span className="cursor-pointer text-[18px] leading-none tracking-widest text-[#ccc]">···</span>
                </div>
                {!stats || stats.lotesRecentes.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[12px] text-ink-faint">
                    Nenhum lote enviado ainda.{' '}
                    <Link to="/lotes/upload" className="text-brand hover:underline">
                      Enviar primeiro lote
                    </Link>
                  </p>
                ) : (
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-[#f5f5f5] text-left">
                        <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-ink-xfaint">Empresa</th>
                        <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-ink-xfaint">Status</th>
                        <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-ink-xfaint">Progresso</th>
                        <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-ink-xfaint">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.lotesRecentes.map((lote) => (
                        <tr key={lote.id} className="border-b border-[#f9f9f9] transition-colors hover:bg-[#fafafa]">
                          <td className="px-5 py-3 font-medium text-ink">{lote.empresa_nome}</td>
                          <td className="px-5 py-3">
                            <StatusBadge status={lote.status} />
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#f0f0f0]">
                                <div
                                  className="h-full rounded-full bg-brand"
                                  style={{
                                    width:
                                      lote.total_documentos > 0
                                        ? `${Math.round((lote.processados / lote.total_documentos) * 100)}%`
                                        : '0%',
                                  }}
                                />
                              </div>
                              <span className="text-[11px] text-ink-faint">
                                {lote.processados}/{lote.total_documentos}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-ink-xfaint">
                            {new Date(lote.created_at).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Coluna direita */}
            <div className="flex flex-col gap-3">

              {/* Calendario */}
              <div className="rounded-card bg-card px-[18px] py-4 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[13.5px] font-semibold text-ink">
                    {MESES_NOMES[calMes]} {calAno}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={prevMes}
                      className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-[#f5f5f5] text-[#888]"
                    >
                      <IconChevronLeft />
                    </button>
                    <button
                      onClick={nextMes}
                      className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-[#f5f5f5] text-[#888]"
                    >
                      <IconChevronRight />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7">
                  {DIAS_ABREV.map((d) => (
                    <div key={d} className="pb-1.5 pt-0.5 text-center text-[9.5px] font-medium text-[#ccc]">
                      {d}
                    </div>
                  ))}
                  {calDias.map((dia, i) => {
                    const isToday = dia === diaAtual && calMes === mesHoje && calAno === anoHoje
                    return (
                      <div
                        key={i}
                        className={`mx-auto my-0.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[11.5px] transition-colors ${
                          dia === null
                            ? ''
                            : isToday
                            ? 'bg-brand font-bold text-[#111]'
                            : 'text-[#555] hover:bg-[#f5f5f5]'
                        }`}
                      >
                        {dia}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Acoes Rapidas */}
              <div className="flex flex-col rounded-card bg-card shadow-card">
                <div className="flex items-center justify-between border-b border-[#f5f5f5] px-[18px] py-4">
                  <span className="text-[13.5px] font-semibold text-ink">Acoes Rapidas</span>
                  <span className="cursor-pointer text-[18px] leading-none tracking-widest text-[#ccc]">···</span>
                </div>
                <AcaoItem
                  titulo="Enviar Lote de Holerites"
                  descricao="Upload do PDF consolidado"
                  href="/lotes/upload"
                  icon={<IconUpload />}
                />
                <AcaoItem
                  titulo="Cadastrar Empresa"
                  descricao="Adicione nova empresa cliente"
                  href="/empresas/nova"
                  icon={<IconPlus />}
                />
                <AcaoItem
                  titulo="Ver Documentos"
                  descricao="Acompanhe leitura e assinatura"
                  href="/documentos"
                  icon={<IconDoc />}
                  last
                />
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}

// --- Sub-componentes ---

interface KpiCardProps {
  label: string
  value: number
  delta: string
  deltaDir: 'up' | 'down'
  deltaSub: string
  icon: JSX.Element
}

function KpiCard({ label, value, delta, deltaDir, deltaSub, icon }: KpiCardProps) {
  return (
    <div className="rounded-card bg-card px-4 py-[15px] shadow-card">
      <div className="mb-[5px] flex items-center justify-between">
        <span className="text-[11px] font-medium text-ink-muted">{label}</span>
        <div className="flex h-[27px] w-[27px] items-center justify-center rounded-full bg-[#f7f7f7]">
          {icon}
        </div>
      </div>
      <div className="mb-[5px] text-[22px] font-bold leading-tight text-ink">
        {value.toLocaleString('pt-BR')}
      </div>
      <div
        className={`flex items-center gap-1 text-[10.5px] ${
          deltaDir === 'up' ? 'text-brand-dark' : 'text-danger'
        }`}
      >
        {deltaDir === 'up' ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/>
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 13 12 18 7 13"/><line x1="12" y1="18" x2="12" y2="6"/>
          </svg>
        )}
        {delta}{' '}
        <span className="text-[10px] text-ink-xfaint">{deltaSub}</span>
      </div>
    </div>
  )
}

interface AcaoItemProps {
  titulo: string
  descricao: string
  href: string
  icon: JSX.Element
  last?: boolean
}

function AcaoItem({ titulo, descricao, href, icon, last = false }: AcaoItemProps) {
  return (
    <Link
      to={href}
      className={`flex items-center gap-2.5 px-[18px] py-3 transition-colors hover:bg-[#fafafa] ${
        !last ? 'border-b border-[#f5f5f5]' : ''
      }`}
    >
      <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[11.5px] font-semibold text-ink">{titulo}</div>
        <div className="text-[10px] text-ink-muted">{descricao}</div>
      </div>
      <div className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-brand text-[#111]">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    concluido:   'bg-brand-muted text-brand-dark',
    processando: 'bg-blue-50 text-blue-600',
    aguardando:  'bg-[#f5f5f5] text-[#888]',
    erro:        'bg-red-50 text-danger',
  }
  const labels: Record<string, string> = {
    concluido:   'Concluido',
    processando: 'Processando',
    aguardando:  'Aguardando',
    erro:        'Erro',
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
        estilos[status] ?? 'bg-[#f5f5f5] text-[#888]'
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}
