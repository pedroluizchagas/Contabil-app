/**
 * Edge Function: buscar-empresa
 *
 * Endpoint público que resolve CNPJ → { id, nome } para o app mobile.
 * Não expõe dados sensíveis — apenas id e nome da empresa.
 *
 * POST /functions/v1/buscar-empresa
 * Body: { "cnpj": "12345678000195" }
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
    const { cnpj } = await req.json()
    if (!cnpj) return r(400, { error: 'CNPJ é obrigatório.' })

    const cnpjLimpo = String(cnpj).replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) return r(400, { error: 'CNPJ inválido.' })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data } = await supabase
      .from('empresas')
      .select('id, nome')
      .eq('cnpj', cnpjLimpo)
      .eq('ativo', true)
      .single()

    if (!data) return r(404, { error: 'Empresa não encontrada ou inativa.' })

    return r(200, { id: data.id, nome: data.nome })
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
