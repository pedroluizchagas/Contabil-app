import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button, Badge, Card, PageHeader, EmptyState, PageSpinner, Select } from '@/components/ui'

interface Lote {
  id: string
  empresa_id: string
  empresa_nome: string
  status: string
  total_documentos: number
  processados: number
  erros: number
  created_at: string
}

const STATUS_OPTS = [
  { value: '', label: 'Todos os status' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'processando', label: 'Processando' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'erro', label: 'Erro' },
]

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

export function LotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([])
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    Promise.all([carregarLotes(), carregarEmpresas()])
  }, [])

  async function carregarLotes() {
    setCarregando(true)
    const { data } = await supabase
      .from('lotes')
      .select('id, empresa_id, status, total_documentos, processados, erros, created_at, empresas(nome)')
      .order('created_at', { ascending: false })
      .limit(200)
    setLotes(
      (data ?? []).map((l) => ({
        id: l.id,
        empresa_id: l.empresa_id,
        empresa_nome: (l.empresas as { nome: string } | null)?.nome ?? '—',
        status: l.status,
        total_documentos: l.total_documentos,
        processados: l.processados,
        erros: l.erros,
        created_at: l.created_at,
      })),
    )
    setCarregando(false)
  }

  async function carregarEmpresas() {
    const { data } = await supabase.from('empresas').select('id, nome').order('nome')
    setEmpresas(data ?? [])
  }

  const filtrados = lotes.filter((l) => {
    if (filtroEmpresa && l.empresa_id !== filtroEmpresa) return false
    if (filtroStatus && l.status !== filtroStatus) return false
    return true
  })

  const totalConcluidos = lotes.filter((l) => l.status === 'concluido').length
  const totalErros = lotes.filter((l) => l.status === 'erro').length

  return (
    <div className="p-8">
      <PageHeader
        titulo="Lotes"
        subtitulo={`${lotes.length} lotes enviados · ${totalConcluidos} concluídos · ${totalErros} com erro`}
        acao={
          <Link
            to="/lotes/upload"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Enviar novo lote
          </Link>
        }
      />

      {/* Filtros */}
      <div className="mb-4 flex items-center gap-3">
        <Select
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="max-w-[220px]"
        >
          <option value="">Todas as empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </Select>

        <Select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="max-w-[180px]"
        >
          {STATUS_OPTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>

        {(filtroEmpresa || filtroStatus) && (
          <button
            onClick={() => { setFiltroEmpresa(''); setFiltroStatus('') }}
            className="text-[11px] text-ink-xfaint transition-colors hover:text-ink-muted"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <Card>
        {carregando ? (
          <PageSpinner />
        ) : filtrados.length === 0 ? (
          <EmptyState
            icone="📦"
            titulo={
              filtroEmpresa || filtroStatus
                ? 'Nenhum lote encontrado com esses filtros.'
                : 'Nenhum lote enviado ainda.'
            }
            acao={
              !filtroEmpresa && !filtroStatus && (
                <Link to="/lotes/upload">
                  <Button size="sm">Enviar primeiro lote</Button>
                </Link>
              )
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Empresa', 'Status', 'Progresso', 'Documentos', 'Erros', 'Data'].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((lote) => {
                const pct = lote.total_documentos
                  ? Math.round((lote.processados / lote.total_documentos) * 100)
                  : 0
                return (
                  <tr
                    key={lote.id}
                    className="border-b border-gray-50 transition-colors hover:bg-gray-50/60"
                  >
                    <td className="px-6 py-3.5 font-medium text-ink">{lote.empresa_nome}</td>
                    <td className="px-6 py-3.5">{statusBadge(lote.status)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-brand transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-ink-faint">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-ink-muted">
                      {lote.processados}
                      {lote.total_documentos > 0 && (
                        <span className="text-ink-xfaint"> / {lote.total_documentos}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {lote.erros > 0 ? (
                        <span className="text-xs font-medium text-red-500">{lote.erros}</span>
                      ) : (
                        <span className="text-xs text-ink-xfaint">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-ink-muted">
                      {new Date(lote.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
