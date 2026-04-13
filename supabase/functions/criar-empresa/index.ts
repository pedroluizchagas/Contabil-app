/**
 * Edge Function: criar-empresa
 *
 * Cria a empresa no banco E um usuário no Supabase Auth vinculado a ela.
 * Chamada pelo app da contabilidade ao cadastrar uma nova empresa cliente.
 *
 * POST /functions/v1/criar-empresa
 * Body: { tenant_id, nome, cnpj, email, senha }
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
    const { tenant_id, nome, cnpj, email, senha } = await req.json()

    if (!tenant_id || !nome || !cnpj || !email || !senha) {
      return r(400, { error: 'Todos os campos são obrigatórios.' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verifica se o CNPJ já existe no tenant
    const { data: existente } = await supabase
      .from('empresas')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('cnpj', cnpj)
      .maybeSingle()

    if (existente) return r(409, { error: 'CNPJ já cadastrado neste tenant.' })

    // Cria usuário Auth para a empresa
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: `__empresa__${cnpj}__${Date.now()}`, // senha interna — login é via Edge Function
      email_confirm: true,
      user_metadata: { role: 'empresa', tenant_id, nome },
    })

    if (authError) return r(400, { error: `Erro ao criar usuário: ${authError.message}` })

    // Gera hash da senha via pgcrypto
    const { data: senhaHash, error: hashError } = await supabase
      .rpc('hash_texto', { p_texto: senha })

    if (hashError || !senhaHash) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return r(500, { error: `Erro ao gerar hash da senha: ${hashError?.message ?? 'resultado vazio'}` })
    }

    // Cria empresa no banco
    const { error: empresaError } = await supabase.from('empresas').insert({
      tenant_id,
      auth_user_id: authUser.user.id,
      nome,
      cnpj,
      senha_hash: senhaHash,
      email,
    })

    if (empresaError) {
      // Rollback: remove o usuário Auth criado
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return r(500, { error: `Erro ao salvar empresa: ${empresaError.message}` })
    }

    return r(201, { message: 'Empresa criada com sucesso.' })
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
