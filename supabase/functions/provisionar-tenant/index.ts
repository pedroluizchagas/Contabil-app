/**
 * Edge Function: provisionar-tenant
 *
 * Onboarding FECHADO: cria um tenant a partir de um `convite` aprovado.
 * Não é pública — deve ser chamada pelo Admin com a service role key.
 *
 * Faz, em ordem:
 *   1. valida o convite (status 'aprovado') e o plano (stripe_price_id)
 *   2. cria/convida o usuário do contador (link para definir senha)
 *   3. cria o tenant (status 'trial')
 *   4. cria Customer + Subscription (trial 30d) no Stripe
 *   5. cria a linha em `subscriptions` e vincula os ids do Stripe
 *   6. marca o convite como 'ativo' e envia o e-mail de boas-vindas (Resend)
 *
 * POST /functions/v1/provisionar-tenant
 * Headers: Authorization: Bearer <service_role_key>
 * Body: { "convite_id": "uuid" }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, resposta } from '../_shared/cors.ts'
import { stripe } from '../_shared/stripe.ts'
import { enviarEmail, templateBoasVindas } from '../_shared/email.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TRIAL_DAYS = 30

/** Confere que o chamador apresentou a service role key. */
function ehServiceRole(authHeader: string | null): boolean {
  const token = (authHeader ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!ehServiceRole(req.headers.get('Authorization'))) {
    return resposta(403, { error: 'Acesso negado. Operação restrita ao Admin.' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const { convite_id } = await req.json()
    if (!convite_id) {
      return resposta(400, { error: 'convite_id é obrigatório.' })
    }

    // ── Convite + plano ───────────────────────────────────────────────────────
    const { data: convite } = await supabase
      .from('convites')
      .select('id, nome, cnpj, email, plano_id, status, tenant_id')
      .eq('id', convite_id)
      .maybeSingle<{
        id: string
        nome: string
        cnpj: string | null
        email: string
        plano_id: string | null
        status: string
        tenant_id: string | null
      }>()

    if (!convite) return resposta(404, { error: 'Convite não encontrado.' })
    if (convite.tenant_id) return resposta(409, { error: 'Convite já provisionado.' })
    if (convite.status !== 'aprovado') {
      return resposta(409, { error: 'O convite precisa estar aprovado para provisionar.' })
    }
    if (!convite.plano_id) {
      return resposta(422, { error: 'Defina um plano no convite antes de provisionar.' })
    }

    const { data: plano } = await supabase
      .from('planos')
      .select('id, nome, stripe_price_id')
      .eq('id', convite.plano_id)
      .maybeSingle<{ id: string; nome: string; stripe_price_id: string | null }>()

    if (!plano?.stripe_price_id) {
      return resposta(422, { error: 'O plano não tem stripe_price_id configurado.' })
    }

    // ── Usuário do contador (convite por e-mail → link para definir senha) ────
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: convite.email,
    })
    if (linkError || !linkData?.user) {
      return resposta(500, { error: `Falha ao criar o usuário: ${linkError?.message}` })
    }
    const authUserId = linkData.user.id
    const linkSenha = linkData.properties?.action_link ?? ''

    // ── Tenant ────────────────────────────────────────────────────────────────
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        auth_user_id: authUserId,
        nome: convite.nome,
        cnpj: convite.cnpj ?? '',
        email: convite.email,
        status: 'trial',
      })
      .select('id')
      .single<{ id: string }>()

    if (tenantError || !tenant) {
      return resposta(500, { error: `Falha ao criar o tenant: ${tenantError?.message}` })
    }

    // ── Stripe: Customer + Subscription (trial) ───────────────────────────────
    const customer = await stripe.customers.create({
      email: convite.email,
      name: convite.nome,
      metadata: { tenant_id: tenant.id },
    })

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: plano.stripe_price_id }],
      trial_period_days: TRIAL_DAYS,
      trial_settings: { end_behavior: { missing_payment_method: 'pause' } },
      payment_behavior: 'default_incomplete',
      metadata: { tenant_id: tenant.id },
    })

    const proximoVencimento = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString().slice(0, 10)
      : null

    await supabase.from('tenants').update({ stripe_customer_id: customer.id }).eq('id', tenant.id)

    await supabase.from('subscriptions').insert({
      tenant_id: tenant.id,
      plano_id: plano.id,
      status: 'trial',
      stripe_subscription_id: subscription.id,
      proximo_vencimento: proximoVencimento,
    })

    // ── Finaliza o convite + e-mail de boas-vindas ────────────────────────────
    await supabase
      .from('convites')
      .update({ status: 'ativo', tenant_id: tenant.id })
      .eq('id', convite.id)

    const email = templateBoasVindas({ nome: convite.nome, linkSenha })
    await enviarEmail({ to: convite.email, ...email })

    return resposta(200, {
      tenant_id: tenant.id,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
    })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err)
    console.error('Erro no provisionamento:', mensagem)
    return resposta(500, { error: mensagem })
  }
})
