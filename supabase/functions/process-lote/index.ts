/**
 * Edge Function: process-lote
 *
 * Responsável pelo split do PDF de holerites/férias em documentos individuais.
 *
 * Fluxo completo:
 * 1. Recebe { lote_id, estrategia? } via POST
 * 2. Carrega o lote e valida o status
 * 3. Busca os funcionários ativos da empresa
 * 4. Baixa o PDF original do Storage
 * 5. Extrai texto por página e associa páginas a funcionários
 * 6. Gera PDFs individuais e faz upload no bucket 'documentos'
 * 7. Cria registros em documentos e eventos_documento
 * 8. Envia push notifications via Expo
 * 9. Atualiza o lote com totais e status final
 *
 * POST /functions/v1/process-lote
 * Headers: Authorization: Bearer <service_role_key>
 * Body: {
 *   "lote_id": "uuid",
 *   "tipo": "holerite" | "ferias",
 *   "mes_referencia": 3,
 *   "ano_referencia": 2026,
 *   "estrategia": { "tipo": "codigo" }  // opcional, padrão: codigo
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extrairTextoPorPagina, extrairPaginas, contarPaginas } from './pdf-utils.ts'
import { associarPaginasFuncionarios } from './funcionario-matcher.ts'
import { enviarNotificacoes, montarMensagem } from './notificador.ts'
import type { LoteRow, FuncionarioRow, ResultadoDocumento, EstrategiaParser } from './tipos.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const {
      lote_id,
      tipo,
      mes_referencia,
      ano_referencia,
      estrategia = { tipo: 'codigo' } as EstrategiaParser,
    } = await req.json()

    // ── Validação básica ──────────────────────────────────────────────────────
    if (!lote_id || !tipo || !mes_referencia || !ano_referencia) {
      return resposta(400, {
        error: 'lote_id, tipo, mes_referencia e ano_referencia são obrigatórios.',
      })
    }

    if (!['holerite', 'ferias'].includes(tipo)) {
      return resposta(400, { error: 'tipo deve ser "holerite" ou "ferias".' })
    }

    // ── Carrega o lote ────────────────────────────────────────────────────────
    const { data: lote, error: loteError } = await supabase
      .from('lotes')
      .select('*')
      .eq('id', lote_id)
      .single<LoteRow>()

    if (loteError || !lote) {
      return resposta(404, { error: 'Lote não encontrado.' })
    }

    if (lote.status === 'processando') {
      return resposta(409, { error: 'Lote já está sendo processado.' })
    }

    if (lote.status === 'concluido') {
      return resposta(409, { error: 'Lote já foi processado.' })
    }

    // Marca como "processando"
    await supabase.from('lotes').update({ status: 'processando' }).eq('id', lote_id)

    // ── Carrega funcionários ativos da empresa ────────────────────────────────
    const { data: funcionarios, error: funcError } = await supabase
      .from('funcionarios')
      .select('id, empresa_id, tenant_id, auth_user_id, nome, codigo, email, ativo')
      .eq('empresa_id', lote.empresa_id)
      .eq('ativo', true)

    if (funcError || !funcionarios?.length) {
      await finalizarLoteComErro(
        supabase,
        lote_id,
        'Nenhum funcionário ativo encontrado para esta empresa.'
      )
      return resposta(422, { error: 'Nenhum funcionário ativo encontrado.' })
    }

    // ── Carrega a empresa (para notificações) ─────────────────────────────────
    const { data: empresa } = await supabase
      .from('empresas')
      .select('nome')
      .eq('id', lote.empresa_id)
      .single<{ nome: string }>()

    // ── Baixa o PDF original do Storage ──────────────────────────────────────
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('lotes')
      .download(lote.storage_path_original)

    if (downloadError || !pdfData) {
      await finalizarLoteComErro(supabase, lote_id, `Erro ao baixar PDF: ${downloadError?.message}`)
      return resposta(500, { error: 'Erro ao baixar o PDF original.' })
    }

    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer())

    // ── Extrai texto por página ───────────────────────────────────────────────
    let textosPorPagina: string[]
    let totalPaginas: number

    try {
      textosPorPagina = extrairTextoPorPagina(pdfBytes)
      totalPaginas = await contarPaginas(pdfBytes)

      // Garante que temos o mesmo número de entradas que páginas reais
      while (textosPorPagina.length < totalPaginas) {
        textosPorPagina.push('')
      }
      textosPorPagina = textosPorPagina.slice(0, totalPaginas)
    } catch (err) {
      console.error('Erro na extração de texto:', err)
      // Fallback: usa estratégia de páginas fixas
      totalPaginas = await contarPaginas(pdfBytes)
      textosPorPagina = Array(totalPaginas).fill('')
      estrategia.tipo = 'paginas-fixas'
      estrategia.paginas_por_funcionario = Math.floor(totalPaginas / funcionarios.length) || 1
    }

    console.log(
      `PDF carregado: ${totalPaginas} páginas, ${funcionarios.length} funcionários, estratégia: ${estrategia.tipo}`
    )

    // ── Associa páginas a funcionários ────────────────────────────────────────
    const associacoes = associarPaginasFuncionarios(
      textosPorPagina,
      funcionarios as FuncionarioRow[],
      estrategia
    )

    if (associacoes.length === 0) {
      await finalizarLoteComErro(
        supabase,
        lote_id,
        'Nenhuma página pôde ser associada a funcionários. Verifique os códigos no PDF.'
      )
      return resposta(422, { error: 'Falha na associação de páginas a funcionários.' })
    }

    // ── Processa cada funcionário ─────────────────────────────────────────────
    const resultados: ResultadoDocumento[] = []
    const tokensParaNotificacao: string[] = []
    const idsParaNotificacao: string[] = []

    await supabase.from('lotes').update({ total_documentos: associacoes.length }).eq('id', lote_id)

    for (const associacao of associacoes) {
      const resultado = await processarDocumentoFuncionario({
        supabase,
        lote,
        funcionario: associacao.funcionario,
        indicesPagina: associacao.indices_pagina,
        pdfBytes,
        tipo,
        mes_referencia,
        ano_referencia,
      })

      resultados.push(resultado)

      if (resultado.sucesso) {
        // Incrementa contador de processados
        await supabase.rpc('incrementar_processados_lote', { p_lote_id: lote_id })
        idsParaNotificacao.push(associacao.funcionario.id)
      } else {
        await supabase.rpc('incrementar_erros_lote', { p_lote_id: lote_id })
      }
    }

    // ── Envia push notifications ──────────────────────────────────────────────
    if (idsParaNotificacao.length > 0) {
      const { data: tokens } = await supabase
        .from('expo_push_tokens')
        .select('token, funcionario_id')
        .in('funcionario_id', idsParaNotificacao)
        .eq('ativo', true)

      if (tokens?.length) {
        const mensagens = tokens.map((t: { token: string; funcionario_id: string }) =>
          montarMensagem(
            tipo,
            mes_referencia,
            ano_referencia,
            empresa?.nome ?? '',
            t.token,
            t.funcionario_id
          )
        )

        const resultadosPush = await enviarNotificacoes(mensagens)
        const tokensInvalidos = resultadosPush
          .filter((r) => !r.sucesso && r.erro?.includes('DeviceNotRegistered'))
          .map((r) => r.token)

        // Desativa tokens inválidos
        if (tokensInvalidos.length > 0) {
          await supabase
            .from('expo_push_tokens')
            .update({ ativo: false })
            .in('token', tokensInvalidos)
        }
      }
    }

    // ── Finaliza o lote ───────────────────────────────────────────────────────
    const totalErros = resultados.filter((r) => !r.sucesso).length
    const statusFinal = totalErros === resultados.length ? 'erro' : 'concluido'

    await supabase.from('lotes').update({ status: statusFinal }).eq('id', lote_id)

    const resumo = {
      lote_id,
      total: associacoes.length,
      processados: resultados.filter((r) => r.sucesso).length,
      erros: totalErros,
      status: statusFinal,
    }

    console.log('Lote finalizado:', resumo)
    return resposta(200, resumo)
  } catch (err) {
    console.error('Erro inesperado no process-lote:', err)
    return resposta(500, { error: 'Erro interno no processamento.' })
  }
})

// ─── Processamento individual de um funcionário ───────────────────────────────

interface ProcessarDocumentoParams {
  supabase: ReturnType<typeof createClient>
  lote: LoteRow
  funcionario: FuncionarioRow
  indicesPagina: number[]
  pdfBytes: Uint8Array
  tipo: 'holerite' | 'ferias'
  mes_referencia: number
  ano_referencia: number
}

async function processarDocumentoFuncionario({
  supabase,
  lote,
  funcionario,
  indicesPagina,
  pdfBytes,
  tipo,
  mes_referencia,
  ano_referencia,
}: ProcessarDocumentoParams): Promise<ResultadoDocumento> {
  try {
    // Extrai as páginas do funcionário
    const pdfFuncionario = await extrairPaginas(pdfBytes, indicesPagina)

    // Define o caminho no Storage
    const docId = crypto.randomUUID()
    const tipoNome = tipo === 'holerite' ? 'holerite' : 'ferias'
    const storagePath = `documentos/${lote.tenant_id}/${lote.empresa_id}/${funcionario.id}/${docId}_${tipoNome}_${ano_referencia}_${String(mes_referencia).padStart(2, '0')}.pdf`

    // Upload no bucket 'documentos'
    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(storagePath, pdfFuncionario, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`)
    }

    // Cria registro na tabela documentos
    const { data: documento, error: docError } = await supabase
      .from('documentos')
      .insert({
        funcionario_id: funcionario.id,
        empresa_id: lote.empresa_id,
        tenant_id: lote.tenant_id,
        tipo,
        mes_referencia,
        ano_referencia,
        storage_path: storagePath,
        status_envio: 'enviado',
      })
      .select('id')
      .single()

    if (docError || !documento) {
      throw new Error(`Erro ao criar documento: ${docError?.message}`)
    }

    // Registra evento de envio
    await supabase.from('eventos_documento').insert({
      documento_id: documento.id,
      funcionario_id: funcionario.id,
      tipo: 'visualizado',
      // evento inicial registrado pelo sistema (não pelo funcionário)
    })

    return { funcionario_id: funcionario.id, sucesso: true, storage_path: storagePath }
  } catch (err) {
    const mensagemErro = err instanceof Error ? err.message : String(err)
    console.error(
      `Erro ao processar funcionário ${funcionario.id} (${funcionario.nome}):`,
      mensagemErro
    )
    return { funcionario_id: funcionario.id, sucesso: false, erro: mensagemErro }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function finalizarLoteComErro(
  supabase: ReturnType<typeof createClient>,
  loteId: string,
  mensagem: string
): Promise<void> {
  console.error(`Lote ${loteId} finalizado com erro:`, mensagem)
  await supabase.from('lotes').update({ status: 'erro' }).eq('id', loteId)
}

function resposta(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
