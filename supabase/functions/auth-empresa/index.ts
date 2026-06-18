/**
 * Edge Function: auth-empresa
 *
 * Autenticação customizada para Empresas via CNPJ + senha.
 *
 * Fluxo:
 * 1. Recebe { cnpj, senha } no body
 * 2. Verifica a senha usando pgcrypto (via RPC) sem expor o hash
 * 3. Retorna uma sessão Supabase válida via auth.admin.createSession
 *
 * POST /functions/v1/auth-empresa
 * Body: { "cnpj": "12345678000195", "senha": "MinhaSenh@" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cnpj, senha } = await req.json()

    if (!cnpj || !senha) {
      return new Response(JSON.stringify({ error: 'CNPJ e senha são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Remove máscara do CNPJ (aceita "12.345.678/0001-95" ou "12345678000195")
    const cnpjLimpo = cnpj.replace(/\D/g, '')

    // Cliente com service role para bypassar RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verifica CNPJ + senha via função SECURITY DEFINER (pgcrypto)
    const { data: empresas, error: rpcError } = await supabaseAdmin.rpc('verificar_senha_empresa', {
      p_cnpj: cnpjLimpo,
      p_senha: senha,
    })

    if (rpcError) {
      console.error('Erro RPC verificar_senha_empresa:', rpcError)
      return new Response(JSON.stringify({ error: 'Erro interno.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const empresa = empresas?.[0]

    if (!empresa) {
      // Mensagem genérica para não revelar se o CNPJ existe
      return new Response(JSON.stringify({ error: 'CNPJ ou senha inválidos.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!empresa.ativo) {
      return new Response(
        JSON.stringify({ error: 'Empresa inativa. Contate sua contabilidade.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!empresa.auth_user_id) {
      return new Response(
        JSON.stringify({ error: 'Conta não configurada. Contate sua contabilidade.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cria sessão para o auth_user_id da empresa
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession(
      {
        user_id: empresa.auth_user_id,
      }
    )

    if (sessionError) {
      console.error('Erro ao criar sessão:', sessionError)
      return new Response(JSON.stringify({ error: 'Erro ao criar sessão.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ session: sessionData.session }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Erro inesperado:', err)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
