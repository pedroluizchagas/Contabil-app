/**
 * Edge Function: auth-funcionario
 *
 * Autenticação em 2 etapas para Funcionários:
 *   Etapa 1 (step: "verify") — CPF + data de nascimento + empresa_id
 *     → verifica credenciais e envia código OTP por e-mail
 *   Etapa 2 (step: "confirm") — empresa_id + CPF + código OTP
 *     → valida o código e retorna sessão Supabase
 *
 * POST /functions/v1/auth-funcionario
 *
 * Etapa 1:
 *   Body: { "step": "verify", "empresa_id": "uuid", "cpf": "11144477735", "data_nascimento": "1990-05-15" }
 *   Response: { "message": "Código enviado para o e-mail." }
 *
 * Etapa 2:
 *   Body: { "step": "confirm", "empresa_id": "uuid", "cpf": "11144477735", "codigo": "123456" }
 *   Response: { "session": { ... } }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OTP_EXPIRY_MINUTES = 10

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Gera código OTP numérico de 6 dígitos */
function gerarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/** Mascara e-mail para exibição: j***@exemplo.com */
function mascararEmail(email: string): string {
  const [local, domain] = email.split('@')
  return `${local[0]}***@${domain}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { step } = body

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ─── ETAPA 1: Verificar credenciais e enviar OTP ─────────────────────────
    if (step === 'verify') {
      const { empresa_id, cpf, data_nascimento } = body

      if (!empresa_id || !cpf || !data_nascimento) {
        return resposta(400, { error: 'empresa_id, cpf e data_nascimento são obrigatórios.' })
      }

      const cpfLimpo = cpf.replace(/\D/g, '')
      const dataNormalizada = data_nascimento.trim() // espera YYYY-MM-DD

      // Verifica CPF + data de nascimento via função SECURITY DEFINER
      const { data: funcionarios, error: rpcError } = await supabaseAdmin.rpc(
        'verificar_credenciais_funcionario',
        {
          p_empresa_id: empresa_id,
          p_cpf: cpfLimpo,
          p_data_nascimento: dataNormalizada,
        }
      )

      if (rpcError) {
        console.error('Erro RPC:', rpcError)
        return resposta(500, { error: 'Erro interno.' })
      }

      const funcionario = funcionarios?.[0]

      if (!funcionario) {
        return resposta(401, { error: 'Credenciais inválidas.' })
      }

      if (!funcionario.ativo) {
        return resposta(403, { error: 'Acesso inativo. Contate sua empresa.' })
      }

      // Invalida códigos anteriores não utilizados
      await supabaseAdmin
        .from('auth_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('funcionario_id', funcionario.id)
        .is('used_at', null)

      // Gera novo OTP e salva o hash
      const codigo = gerarCodigo()
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

      // Hash do código via RPC (usa pgcrypto)
      const { data: hashData } = (await supabaseAdmin.rpc('hash_texto', { p_texto: codigo })) as {
        data: string
      }

      await supabaseAdmin.from('auth_codes').insert({
        funcionario_id: funcionario.id,
        code_hash: hashData,
        expires_at: expiresAt,
      })

      // Envia e-mail com o código via Supabase Auth (magic link approach)
      // Para MVP: usamos o sistema de e-mail do Supabase diretamente
      const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: funcionario.email,
        options: {
          // Em produção, usar um template customizado via Resend
          data: { otp_code: codigo },
        },
      })

      if (emailError) {
        // Fallback: log o código no dev (nunca em produção)
        if (SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1')) {
          console.log(`[DEV] Código OTP para ${funcionario.email}: ${codigo}`)
        } else {
          console.error('Erro ao enviar e-mail:', emailError)
          return resposta(500, { error: 'Erro ao enviar código por e-mail.' })
        }
      }

      return resposta(200, {
        message: `Código enviado para ${mascararEmail(funcionario.email)}.`,
        expires_in_minutes: OTP_EXPIRY_MINUTES,
      })
    }

    // ─── ETAPA 2: Confirmar OTP e criar sessão ───────────────────────────────
    if (step === 'confirm') {
      const { empresa_id, cpf, codigo } = body

      if (!empresa_id || !cpf || !codigo) {
        return resposta(400, { error: 'empresa_id, cpf e codigo são obrigatórios.' })
      }

      const cpfLimpo = cpf.replace(/\D/g, '')

      // Resolve o funcionário por (empresa_id, CPF). Isso permite filtrar os
      // códigos OTP por funcionario_id em vez de varrer os códigos ativos de
      // todo o banco (B3): elimina vazamento por timing e a falha sob logins
      // concorrentes. A verificação do CPF na etapa "confirm" também impede
      // que um código de outra empresa seja aceito.
      const { data: funcionarios } = await supabaseAdmin.rpc('buscar_funcionario_id_por_cpf', {
        p_empresa_id: empresa_id,
        p_cpf: cpfLimpo,
      })

      const funcionario = funcionarios?.[0] as
        | { id: string; auth_user_id: string | null; ativo: boolean }
        | undefined

      if (!funcionario || !funcionario.ativo) {
        return resposta(401, { error: 'Credenciais inválidas.' })
      }

      // Busca apenas os códigos ativos DESTE funcionário.
      const { data: codigosAtivos } = await supabaseAdmin
        .from('auth_codes')
        .select('id, code_hash')
        .eq('funcionario_id', funcionario.id)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (!codigosAtivos?.length) {
        return resposta(401, { error: 'Nenhum código válido encontrado. Solicite um novo.' })
      }

      // Verifica o código informado contra os hashes via pgcrypto.
      let codigoValidoId: string | null = null

      for (const c of codigosAtivos) {
        const { data: valid } = (await supabaseAdmin.rpc('verificar_hash', {
          p_texto: codigo,
          p_hash: c.code_hash,
        })) as { data: boolean }

        if (valid) {
          codigoValidoId = c.id
          break
        }
      }

      if (!codigoValidoId) {
        return resposta(401, { error: 'Código inválido ou expirado.' })
      }

      // Marca o código como usado
      await supabaseAdmin
        .from('auth_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', codigoValidoId)

      if (!funcionario.auth_user_id) {
        return resposta(400, { error: 'Conta não configurada. Contate sua empresa.' })
      }

      // Cria sessão para o funcionário
      const { data: sessionData, error: sessionError } =
        await supabaseAdmin.auth.admin.createSession({
          user_id: funcionario.auth_user_id,
        })

      if (sessionError) {
        console.error('Erro ao criar sessão:', sessionError)
        return resposta(500, { error: 'Erro ao criar sessão.' })
      }

      return resposta(200, { session: sessionData.session })
    }

    return resposta(400, { error: 'Parâmetro "step" inválido. Use "verify" ou "confirm".' })
  } catch (err) {
    console.error('Erro inesperado:', err)
    return resposta(500, { error: 'Erro interno.' })
  }
})

function resposta(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
