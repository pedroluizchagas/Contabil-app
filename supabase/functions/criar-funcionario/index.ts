/**
 * Edge Function: criar-funcionario
 *
 * Cria o funcionário no banco com CPF e data de nascimento hasheados via pgcrypto.
 * Cria também o usuário no Supabase Auth para que o funcionário possa se autenticar.
 *
 * POST /functions/v1/criar-funcionario
 * Body: { tenant_id, empresa_id, nome, cpf, data_nascimento, codigo, email }
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
    const { tenant_id, empresa_id, nome, cpf, data_nascimento, codigo, email } = await req.json()

    if (!tenant_id || !empresa_id || !nome || !cpf || !data_nascimento || !codigo || !email) {
      return r(400, { error: 'Todos os campos são obrigatórios.' })
    }

    const cpfLimpo = String(cpf).replace(/\D/g, '')
    if (cpfLimpo.length !== 11) return r(400, { error: 'CPF inválido.' })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verifica código único no tenant
    const { data: codigoExistente } = await supabase
      .from('funcionarios')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('codigo', codigo.toUpperCase())
      .maybeSingle()

    if (codigoExistente) return r(409, { error: `Código "${codigo}" já está em uso neste tenant.` })

    // Gera hashes via pgcrypto
    const [{ data: cpfHash }, { data: dataNascHash }] = await Promise.all([
      supabase.rpc('hash_texto', { p_texto: cpfLimpo }) as Promise<{ data: string }>,
      supabase.rpc('hash_texto', { p_texto: data_nascimento }) as Promise<{ data: string }>,
    ])

    // Cria usuário Auth para o funcionário
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: `__func__${cpfLimpo}__${Date.now()}`, // senha interna — login via OTP
      email_confirm: true,
      user_metadata: { role: 'funcionario', tenant_id, empresa_id, nome },
    })

    if (authError) return r(400, { error: `Erro ao criar usuário: ${authError.message}` })

    // Cria funcionário
    const { error: funcError } = await supabase.from('funcionarios').insert({
      tenant_id,
      empresa_id,
      auth_user_id: authUser.user.id,
      nome,
      cpf_hash: cpfHash,
      data_nascimento_hash: dataNascHash,
      codigo: codigo.toUpperCase().trim(),
      email,
    })

    if (funcError) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return r(500, { error: `Erro ao salvar funcionário: ${funcError.message}` })
    }

    return r(201, { message: 'Funcionário criado com sucesso.' })
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
