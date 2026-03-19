/**
 * Edge Function: alterar-senha-empresa
 *
 * Altera a senha da empresa após validar a senha atual.
 * Usa pgcrypto via RPC para comparação segura sem expor o hash.
 *
 * POST /functions/v1/alterar-senha-empresa
 * Body: { empresa_id, senha_atual, nova_senha }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { empresa_id, senha_atual, nova_senha } = await req.json()

    if (!empresa_id || !senha_atual || !nova_senha) {
      return r(400, { error: 'Todos os campos são obrigatórios.' })
    }

    if (nova_senha.length < 8) {
      return r(400, { error: 'A nova senha deve ter pelo menos 8 caracteres.' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verifica se a senha atual está correta
    const { data: valido } = await supabase
      .rpc('verificar_senha_empresa_por_id', {
        p_empresa_id: empresa_id,
        p_senha: senha_atual,
      }) as { data: boolean }

    if (!valido) {
      return r(401, { error: 'Senha atual incorreta.' })
    }

    // Gera hash da nova senha
    const { data: novoHash } = await supabase
      .rpc('hash_texto', { p_texto: nova_senha }) as { data: string }

    // Atualiza a senha
    const { error: updateError } = await supabase
      .from('empresas')
      .update({ senha_hash: novoHash })
      .eq('id', empresa_id)

    if (updateError) return r(500, { error: 'Erro ao salvar nova senha.' })

    return r(200, { message: 'Senha alterada com sucesso.' })
  } catch (err) {
    console.error(err)
    return r(500, { error: 'Erro interno.' })
  }
})

function r(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
