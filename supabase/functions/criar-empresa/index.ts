/**
 * Edge Function: criar-empresa
 *
 * Cria a empresa no banco E um usuário no Supabase Auth vinculado a ela.
 * Chamada pelo app da contabilidade ao cadastrar uma nova empresa cliente.
 *
 * POST /functions/v1/criar-empresa
 * Body: { nome, cnpj, email, senha }
 *
 * Autenticação: Bearer token do usuário logado (contabilidade).
 * O tenant_id é derivado do usuário autenticado — não vem do body.
 *
 * Nota: verify_jwt está desabilitado no gateway (config.toml) porque o
 * custom_access_token_hook pode produzir JWTs que o Edge Runtime rejeita.
 * A verificação é feita aqui via supabase.auth.getUser(token).
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
    // 1. Verificar autenticação: extrair e validar o JWT do caller
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!token) return r(401, { error: 'Autenticação obrigatória.' })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // auth.getUser(token) envia o JWT ao serviço de Auth para verificação —
    // não depende do Edge Runtime verificar a assinatura localmente.
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return r(401, { error: 'Token inválido ou sessão expirada.' })

    // 2. Confirmar que o usuário é uma Contabilidade (tenant)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!tenant) return r(403, { error: 'Acesso negado: conta não é uma contabilidade.' })
    const tenant_id = tenant.id

    // 3. Validar campos do body
    const { nome, cnpj, email, senha } = await req.json()

    if (!nome || !cnpj || !email || !senha) {
      return r(400, { error: 'Todos os campos são obrigatórios.' })
    }

    // 4. Verificar se o CNPJ já existe no tenant
    const { data: existente } = await supabase
      .from('empresas')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('cnpj', cnpj)
      .maybeSingle()

    if (existente) return r(409, { error: 'CNPJ já cadastrado neste tenant.' })

    // 5. Criar usuário Auth para a empresa
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: `__empresa__${cnpj}__${Date.now()}`,
      email_confirm: true,
      user_metadata: { role: 'empresa', tenant_id, nome },
    })

    if (authError) return r(400, { error: `Erro ao criar usuário: ${authError.message}` })

    // 6. Gerar hash da senha via pgcrypto
    const { data: senhaHash, error: hashError } = await supabase.rpc('hash_texto', {
      p_texto: senha,
    })

    if (hashError || !senhaHash) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return r(500, {
        error: `Erro ao gerar hash da senha: ${hashError?.message ?? 'resultado vazio'}`,
      })
    }

    // 7. Criar empresa no banco
    const { error: empresaError } = await supabase.from('empresas').insert({
      tenant_id,
      auth_user_id: authUser.user.id,
      nome,
      cnpj,
      senha_hash: senhaHash,
      email,
    })

    if (empresaError) {
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
