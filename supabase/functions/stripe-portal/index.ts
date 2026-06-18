/**
 * Edge Function: stripe-portal
 *
 * Gera uma sessão do Stripe Customer Portal para o contador gerenciar
 * pagamento, cartão e faturas. Autenticada: só o próprio contador (perfil
 * 'contabilidade') abre o portal do seu tenant.
 *
 * POST /functions/v1/stripe-portal
 * Headers: Authorization: Bearer <jwt do contador>
 * Body: { "return_url": "https://..." }  // opcional
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, resposta } from '../_shared/cors.ts'
import { stripe } from '../_shared/stripe.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const DEFAULT_RETURN_URL = Deno.env.get('PORTAL_RETURN_URL') ?? 'https://contahub.com.br'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return resposta(401, { error: 'Token ausente.' })
  }

  // Confirma a autenticidade do usuário e o perfil de contabilidade.
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData?.user) {
    return resposta(401, { error: 'Token inválido.' })
  }

  const claims = JSON.parse(
    atob(
      authHeader
        .replace(/^Bearer\s+/i, '')
        .split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
    )
  )
  if (claims.user_role !== 'contabilidade' || !claims.tenant_id) {
    return resposta(403, { error: 'Apenas a contabilidade pode abrir o portal.' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', claims.tenant_id)
    .maybeSingle<{ stripe_customer_id: string | null }>()

  if (!tenant?.stripe_customer_id) {
    return resposta(422, { error: 'Tenant sem cliente Stripe associado.' })
  }

  try {
    const { return_url } = await req.json().catch(() => ({ return_url: undefined }))
    const sessao = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: return_url || DEFAULT_RETURN_URL,
    })
    return resposta(200, { url: sessao.url })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err)
    console.error('Erro ao criar sessão do portal:', mensagem)
    return resposta(500, { error: mensagem })
  }
})
