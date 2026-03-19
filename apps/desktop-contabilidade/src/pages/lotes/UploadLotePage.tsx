/**
 * Página de upload de lote de holerites/férias.
 *
 * Fluxo:
 * 1. Seleciona empresa + tipo + mês/ano
 * 2. Seleciona o PDF (drag & drop)
 * 3. Faz upload no bucket 'lotes'
 * 4. Cria registro na tabela 'lotes'
 * 5. Chama a Edge Function process-lote
 * 6. Acompanha o progresso em tempo real via Supabase Realtime
 */

import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@contabhub/supabase'

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
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

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

  // Supabase Realtime: escuta atualizações do lote em processamento
  useEffect(() => {
    if (!progresso?.id || etapa !== 'processando') return

    const canal = supabase
      .channel(`lote-${progresso.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lotes', filter: `id=eq.${progresso.id}` },
        (payload) => {
          const novo = payload.new as LoteProgresso
          setProgresso(novo)
          if (novo.status === 'concluido' || novo.status === 'erro') {
            setEtapa(novo.status === 'concluido' ? 'concluido' : 'erro')
          }
        }
      )
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

    // 1. Upload do PDF no Storage
    const storagePath = `${tenantId}/${empresaId}/${Date.now()}_${arquivo.name}`

    const { error: uploadError } = await supabase.storage
      .from('lotes')
      .upload(storagePath, arquivo, {
        contentType: 'application/pdf',
        upsert: false,
        // Supabase JS não suporta onUploadProgress nativamente — simula via intervalo
      })

    // Simula progresso de upload (fallback visual)
    const timer = setInterval(() => setUploadPct((p) => Math.min(p + 10, 90)), 200)

    if (uploadError) {
      clearInterval(timer)
      setErroMsg(`Erro no upload: ${uploadError.message}`)
      setEtapa('erro')
      return
    }

    clearInterval(timer)
    setUploadPct(100)

    // 2. Cria registro na tabela lotes
    const { data: lote, error: loteError } = await supabase
      .from('lotes')
      .insert({
        tenant_id: tenantId,
        empresa_id: empresaId,
        storage_path_original: storagePath,
        status: 'aguardando',
      })
      .select('id, status, total_documentos, processados, erros')
      .single()

    if (loteError || !lote) {
      setErroMsg('Erro ao registrar o lote. Tente novamente.')
      setEtapa('erro')
      return
    }

    setProgresso(lote as LoteProgresso)
    setEtapa('processando')

    // 3. Dispara o processamento via Edge Function
    const { error: fnError } = await supabase.functions.invoke('process-lote', {
      body: {
        lote_id: lote.id,
        tipo,
        mes_referencia: mes,
        ano_referencia: ano,
      },
    })

    if (fnError) {
      setErroMsg(`Erro ao iniciar processamento: ${fnError.message}`)
      setEtapa('erro')
    }
    // O progresso real chega via Realtime (useEffect acima)
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Enviar Lote de Documentos</h1>
        <p className="text-sm text-gray-500">
          Faça upload do PDF gerado pelo software contábil. O sistema identificará automaticamente cada funcionário.
        </p>
      </div>

      {/* ── Formulário de upload ─────────────────────────────────────────── */}
      {etapa === 'form' && (
        <div className="max-w-xl space-y-5 rounded-xl border border-gray-200 bg-white p-8">
          {/* Empresa */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Empresa *</label>
            <select
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Selecione a empresa...</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipo de documento *</label>
            <div className="flex gap-3">
              {(['holerite', 'ferias'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    tipo === t
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t === 'holerite' ? 'Holerite' : 'Recibo de Férias'}
                </button>
              ))}
            </div>
          </div>

          {/* Mês/Ano */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Mês *</label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                {MESES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Ano *</label>
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dropzone de PDF */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Arquivo PDF *</label>
            {arquivo ? (
              <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-green-800">{arquivo.name}</p>
                  <p className="text-xs text-green-600">{(arquivo.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={() => setArquivo(null)} className="text-green-600 hover:text-green-800 text-lg">×</button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-3xl mb-2">📄</p>
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive ? 'Solte o PDF aqui' : 'Arraste o PDF ou clique para selecionar'}
                </p>
                <p className="mt-1 text-xs text-gray-400">Apenas arquivos .pdf (máx. 50 MB)</p>
              </div>
            )}
          </div>

          <button
            onClick={handleEnviar}
            disabled={!arquivo || !empresaId}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Enviar e processar lote
          </button>
        </div>
      )}

      {/* ── Progresso de upload ──────────────────────────────────────────── */}
      {etapa === 'enviando' && (
        <ProgressoCard titulo="Enviando PDF..." subtitulo={`${uploadPct}% carregado`}>
          <BarraProgresso valor={uploadPct} cor="blue" />
        </ProgressoCard>
      )}

      {/* ── Progresso de processamento ───────────────────────────────────── */}
      {etapa === 'processando' && (
        <ProgressoCard titulo="Processando documentos..." subtitulo="Identificando funcionários e gerando PDFs individuais">
          <BarraProgresso valor={pctProcessado} cor="indigo" />
          {progresso && (
            <p className="mt-2 text-center text-sm text-gray-500">
              {progresso.processados} de {progresso.total_documentos} documentos
              {progresso.erros > 0 && <span className="ml-2 text-red-500">({progresso.erros} erros)</span>}
            </p>
          )}
        </ProgressoCard>
      )}

      {/* ── Concluído ────────────────────────────────────────────────────── */}
      {etapa === 'concluido' && progresso && (
        <ProgressoCard titulo="Lote processado com sucesso!" subtitulo="">
          <div className="text-center space-y-2">
            <p className="text-5xl">✅</p>
            <p className="text-sm text-gray-600">
              <strong>{progresso.processados}</strong> documentos enviados para os funcionários
              {progresso.erros > 0 && (
                <span className="text-red-500"> · {progresso.erros} com erro</span>
              )}
            </p>
          </div>
          <button
            onClick={reiniciar}
            className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Enviar outro lote
          </button>
        </ProgressoCard>
      )}

      {/* ── Erro ─────────────────────────────────────────────────────────── */}
      {etapa === 'erro' && (
        <ProgressoCard titulo="Erro no processamento" subtitulo={erroMsg ?? 'Tente novamente.'}>
          <p className="text-center text-4xl">❌</p>
          <button
            onClick={reiniciar}
            className="mt-4 w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Tentar novamente
          </button>
        </ProgressoCard>
      )}
    </div>
  )
}

function ProgressoCard({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 space-y-4">
      <div>
        <p className="font-semibold text-gray-900">{titulo}</p>
        {subtitulo && <p className="text-sm text-gray-500">{subtitulo}</p>}
      </div>
      {children}
    </div>
  )
}

function BarraProgresso({ valor, cor }: { valor: number; cor: 'blue' | 'indigo' }) {
  const cores = { blue: 'bg-blue-600', indigo: 'bg-indigo-600' }
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className={`h-full rounded-full transition-all duration-500 ${cores[cor]}`}
        style={{ width: `${valor}%` }}
      />
    </div>
  )
}
