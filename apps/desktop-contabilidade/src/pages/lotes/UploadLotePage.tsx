/**
 * Upload de lote de holerites/férias.
 * Fluxo: form → enviando → processando → concluido | erro
 */

import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@contabhub/supabase'
import { Button, Card, CardContent, PageHeader, Select } from '@/components/ui'

type Empresa = Pick<Database['public']['Tables']['empresas']['Row'], 'id' | 'nome'>
type StatusLote = Database['public']['Tables']['lotes']['Row']['status']

interface LoteProgresso {
  id: string
  status: StatusLote
  total_documentos: number
  processados: number
  erros: number
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

/* ── Barra de progresso ─────────────────────────────────────────── */
function BarraProgresso({ valor, cor = 'brand' }: { valor: number; cor?: 'brand' | 'blue' }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${cor === 'brand' ? 'bg-brand' : 'bg-blue-500'}`}
        style={{ width: `${valor}%` }}
      />
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────── */
export function UploadLotePage() {
  const { tenantId } = useAuth()
  const anoAtual = new Date().getFullYear()

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [tipo, setTipo] = useState<'holerite' | 'ferias'>('holerite')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(anoAtual)
  const [arquivo, setArquivo] = useState<File | null>(null)

  const [etapa, setEtapa] = useState<'form' | 'enviando' | 'processando' | 'concluido' | 'erro'>('form')
  const [progresso, setProgresso] = useState<LoteProgresso | null>(null)
  const [erroMsg, setErroMsg] = useState<string | null>(null)
  const [uploadPct, setUploadPct] = useState(0)

  useEffect(() => {
    if (!tenantId) return
    supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => setEmpresas(data ?? []))
  }, [tenantId])

  useEffect(() => {
    if (!progresso?.id || etapa !== 'processando') return
    const canal = supabase
      .channel(`lote-${progresso.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lotes', filter: `id=eq.${progresso.id}` },
        (payload) => {
          const novo = payload.new as LoteProgresso
          setProgresso(novo)
          if (novo.status === 'concluido' || novo.status === 'erro')
            setEtapa(novo.status === 'concluido' ? 'concluido' : 'erro')
        })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [progresso?.id, etapa])

  const onDrop = useCallback((arquivos: File[]) => {
    if (arquivos[0]) setArquivo(arquivos[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  })

  async function handleEnviar() {
    if (!arquivo || !empresaId || !tenantId) return
    setEtapa('enviando')
    setErroMsg(null)
    setUploadPct(0)

    const storagePath = `${tenantId}/${empresaId}/${Date.now()}_${arquivo.name}`
    const timer = setInterval(() => setUploadPct((p) => Math.min(p + 12, 85)), 250)

    const { error: uploadError } = await supabase.storage
      .from('lotes')
      .upload(storagePath, arquivo, { contentType: 'application/pdf', upsert: false })

    clearInterval(timer)
    if (uploadError) {
      setErroMsg(`Erro no upload: ${uploadError.message}`)
      setEtapa('erro')
      return
    }
    setUploadPct(100)

    const { data: lote, error: loteError } = await supabase
      .from('lotes')
      .insert({ tenant_id: tenantId, empresa_id: empresaId, storage_path_original: storagePath, status: 'aguardando' })
      .select('id, status, total_documentos, processados, erros')
      .single()

    if (loteError || !lote) {
      setErroMsg('Erro ao registrar o lote. Tente novamente.')
      setEtapa('erro')
      return
    }

    setProgresso(lote as LoteProgresso)
    setEtapa('processando')

    const { error: fnError } = await supabase.functions.invoke('process-lote', {
      body: { lote_id: lote.id, tipo, mes_referencia: mes, ano_referencia: ano },
    })
    if (fnError) {
      setErroMsg(`Erro ao iniciar processamento: ${fnError.message}`)
      setEtapa('erro')
    }
  }

  function reiniciar() {
    setArquivo(null)
    setProgresso(null)
    setErroMsg(null)
    setUploadPct(0)
    setEtapa('form')
  }

  const pctProcessado = progresso?.total_documentos
    ? Math.round((progresso.processados / progresso.total_documentos) * 100)
    : 0

  return (
    <div className="p-8">
      <PageHeader
        titulo="Enviar Lote de Documentos"
        subtitulo="Faça upload do PDF gerado pelo software contábil. O sistema identificará automaticamente cada funcionário."
      />

      {/* ── Formulário ────────────────────────────────────────────── */}
      {etapa === 'form' && (
        <Card className="max-w-xl">
          <CardContent className="space-y-5">
            {/* Empresa */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Empresa *</label>
              <Select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
              >
                <option value="">Selecione a empresa...</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </Select>
            </div>

            {/* Tipo */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipo de documento *</label>
              <div className="grid grid-cols-2 gap-3">
                {(['holerite', 'ferias'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={[
                      'rounded-xl border py-3 text-sm font-medium transition-colors',
                      tipo === t
                        ? 'border-brand bg-brand-light text-brand-darker'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {t === 'holerite' ? '🧾 Holerite' : '🏖️ Recibo de Férias'}
                  </button>
                ))}
              </div>
            </div>

            {/* Mês / Ano */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Mês *</label>
                <Select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                  {MESES.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Ano *</label>
                <Select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                  {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Dropzone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Arquivo PDF *</label>
              {arquivo ? (
                <div className="flex items-center justify-between rounded-xl border border-brand/40 bg-brand-muted px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-brand-darker">{arquivo.name}</p>
                    <p className="text-xs text-brand">{(arquivo.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={() => setArquivo(null)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-brand transition-colors hover:bg-brand/10"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={[
                    'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                    isDragActive
                      ? 'border-brand bg-brand-light'
                      : 'border-gray-200 hover:border-brand/50 hover:bg-brand-muted',
                  ].join(' ')}
                >
                  <input {...getInputProps()} />
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
                    📄
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {isDragActive ? 'Solte o PDF aqui' : 'Arraste o PDF ou clique para selecionar'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">Apenas .pdf · máx. 50 MB</p>
                </div>
              )}
            </div>

            <Button
              onClick={handleEnviar}
              disabled={!arquivo || !empresaId}
              className="w-full justify-center"
              size="lg"
            >
              Enviar e processar lote
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Estados de progresso ─────────────────────────────────── */}
      {(etapa === 'enviando' || etapa === 'processando' || etapa === 'concluido' || etapa === 'erro') && (
        <Card className="max-w-md">
          <CardContent className="space-y-5">
            {etapa === 'enviando' && (
              <>
                <div>
                  <p className="font-semibold text-gray-900">Enviando PDF...</p>
                  <p className="text-sm text-gray-500">{uploadPct}% carregado</p>
                </div>
                <BarraProgresso valor={uploadPct} cor="blue" />
              </>
            )}

            {etapa === 'processando' && (
              <>
                <div>
                  <p className="font-semibold text-gray-900">Processando documentos...</p>
                  <p className="text-sm text-gray-500">Identificando funcionários e gerando PDFs individuais</p>
                </div>
                <BarraProgresso valor={pctProcessado} />
                {progresso && (
                  <p className="text-center text-sm text-gray-500">
                    {progresso.processados} de {progresso.total_documentos} documentos
                    {progresso.erros > 0 && (
                      <span className="ml-2 text-red-500">({progresso.erros} erros)</span>
                    )}
                  </p>
                )}
              </>
            )}

            {etapa === 'concluido' && progresso && (
              <>
                <div className="text-center">
                  <div className="mb-3 text-5xl">✅</div>
                  <p className="font-semibold text-gray-900">Lote processado com sucesso!</p>
                  <p className="mt-1 text-sm text-gray-500">
                    <strong>{progresso.processados}</strong> documentos enviados para os funcionários
                    {progresso.erros > 0 && (
                      <span className="text-red-500"> · {progresso.erros} com erro</span>
                    )}
                  </p>
                </div>
                <Button onClick={reiniciar} className="w-full justify-center">
                  Enviar outro lote
                </Button>
              </>
            )}

            {etapa === 'erro' && (
              <>
                <div className="text-center">
                  <div className="mb-3 text-5xl">❌</div>
                  <p className="font-semibold text-gray-900">Erro no processamento</p>
                  {erroMsg && <p className="mt-1 text-sm text-gray-500">{erroMsg}</p>}
                </div>
                <Button variant="secondary" onClick={reiniciar} className="w-full justify-center">
                  Tentar novamente
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
