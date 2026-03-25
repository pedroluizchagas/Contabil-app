import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Database } from '@contabhub/supabase'
import { Badge, Card, CardHeader, CardContent, PageHeader, EmptyState, PageSpinner } from '@/components/ui'

type LoteRow = Database['public']['Tables']['lotes']['Row']

interface LoteComEmpresa extends LoteRow {
  empresa_nome: string
}

interface DocStatus {
  documento_id: string
  funcionario_nome: string
  funcionario_codigo: string
  storage_path: string
  status_envio: string
  visualizado_em: string | null
  assinado_em: string | null
}

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function statusBadgeLote(status: string) {
  const map: Record<string, { variant: 'success' | 'info' | 'neutral' | 'error'; label: string }> = {
    concluido:   { variant: 'success', label: 'Concluído' },
    processando: { variant: 'info',    label: 'Processando' },
    aguardando:  { variant: 'neutral', label: 'Aguardando' },
    erro:        { variant: 'error',   label: 'Erro' },
  }
  const s = map[status] ?? { variant: 'neutral', label: status }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

async function abrirPdf(storagePath: string) {
  const { data } = await supabase.storage.from('documentos').createSignedUrl(storagePath, 60)
  if (data?.signedUrl) window.open(data.signedUrl, '_blank')
}

export function LoteDetalhesPage() {
  const { loteId } = useParams<{ loteId: string }>()
  const [lote, setLote] = useState<LoteComEmpresa | null>(null)
  const [docs, setDocs] = useState<DocStatus[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!loteId) return
    carregarDados()
  }, [loteId])

  async function carregarDados() {
    setCarregando(true)

    const { data: loteData } = await supabase
      .from('lotes')
      .select('*, empresas(nome)')
      .eq('id', loteId!)
      .single()

    if (!loteData) { setCarregando(false); return }

    const loteComEmpresa: LoteComEmpresa = {
      ...loteData,
      empresa_nome: (loteData.empresas as { nome: string } | null)?.nome ?? '—',
    }
    setLote(loteComEmpresa)

    /* Busca documentos pelo mesmo empresa/tipo/período do lote */
    const { data: docsData } = await supabase
      .from('v_status_documentos')
      .select('*')
      .eq('empresa_id', loteData.empresa_id)
      .eq('tipo', loteData.tipo)
      .eq('mes_referencia', loteData.mes_referencia)
      .eq('ano_referencia', loteData.ano_referencia)
      .order('funcionario_nome')

    setDocs((docsData ?? []) as DocStatus[])
    setCarregando(false)
  }

  const pct = lote?.total_documentos
    ? Math.round((lote.processados / lote.total_documentos) * 100)
    : 0

  if (carregando) {
    return (
      <div className="p-8">
        <PageSpinner />
      </div>
    )
  }

  if (!lote) {
    return (
      <div className="p-8">
        <PageHeader titulo="Lote não encontrado" voltar="/lotes" voltarLabel="Lotes" />
      </div>
    )
  }

  const visualizados = docs.filter((d) => d.visualizado_em).length
  const assinados    = docs.filter((d) => d.assinado_em).length

  return (
    <div className="p-8">
      <PageHeader
        titulo={`${MESES[lote.mes_referencia]} ${lote.ano_referencia}`}
        subtitulo={`${lote.empresa_nome} · ${lote.tipo === 'holerite' ? 'Holerites' : 'Recibos de Férias'}`}
        voltar="/lotes"
        voltarLabel="Lotes"
      />

      {/* ── Info cards ────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-card">
          <p className="text-xs text-ink-faint">Status</p>
          <div className="mt-2">{statusBadgeLote(lote.status)}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-card">
          <p className="text-xs text-ink-faint">Documentos</p>
          <p className="mt-1 text-2xl font-bold text-ink">
            {lote.processados}
            {lote.total_documentos > 0 && (
              <span className="ml-1 text-sm font-normal text-ink-faint">/ {lote.total_documentos}</span>
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-card">
          <p className="text-xs text-ink-faint">Visualizados</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{visualizados}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-card">
          <p className="text-xs text-ink-faint">Assinados</p>
          <p className="mt-1 text-2xl font-bold text-brand">{assinados}</p>
        </div>
      </div>

      {/* Progresso geral */}
      {lote.total_documentos > 0 && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Progresso do processamento</p>
              <span className="text-sm font-semibold text-ink">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            {lote.erros > 0 && (
              <p className="mt-2 text-xs text-red-500">{lote.erros} documento(s) com erro no processamento</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tabela de documentos ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-ink">
            Documentos neste lote
            <span className="ml-2 text-ink-faint font-normal">({docs.length})</span>
          </p>
        </CardHeader>

        {docs.length === 0 ? (
          <EmptyState
            icone="📄"
            titulo="Nenhum documento encontrado para este lote."
            descricao="Os documentos aparecem aqui após o processamento ser concluído."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Funcionário', 'Código', 'Leitura', 'Assinatura', ''].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-xfaint"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr
                  key={doc.documento_id}
                  className="border-b border-gray-50 transition-colors hover:bg-gray-50/60"
                >
                  <td className="px-6 py-3.5 font-medium text-ink">{doc.funcionario_nome}</td>
                  <td className="px-6 py-3.5 font-mono text-xs text-ink-muted">{doc.funcionario_codigo}</td>
                  <td className="px-6 py-3.5">
                    {doc.visualizado_em ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <span className="text-[10px]">✓</span>
                        {new Date(doc.visualizado_em).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500">Pendente</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {doc.assinado_em ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <span className="text-[10px]">✓</span>
                        {new Date(doc.assinado_em).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-xfaint">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <button
                      onClick={() => abrirPdf(doc.storage_path)}
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
