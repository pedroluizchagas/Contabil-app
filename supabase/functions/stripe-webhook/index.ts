/**
 * Edge Function: stripe-webhook
 *
 * Recebe eventos do Stripe, valida a assinatura, garante idempotência e
 * sincroniza `subscriptions` / `faturas` + o status do tenant.
 *
 * Configuração no Stripe: endpoint apontando para
 *   POST /functions/v1/stripe-webhook
 * com os eventos: checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted, invoice.paid,
 * invoice.payment_failed.
 *
 * IMPORTANTE: esta função deve ser deployada com `--no-verify-jwt`, pois o
 * Stripe não envia um JWT do Supabase — a autenticidade vem da assinatura do
 * webhook (header Stripe-Signature + STRIPE_WEBHOOK_SECRET).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, resposta } from '../_shared/cors.ts'
import { stripe, cryptoProvider, STRIPE_WEBHOOK_SECRET, mapearStatus } from '../_shared/stripe.ts'
import { enviarEmail, templatePagamentoConfirmado, templateCancelamento } from '../_shared/email.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type Supabase = ReturnType<typeof createClient>

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const assinatura = req.headers.get('Stripe-Signature')
  if (!assinatura) {
    return resposta(400, { error: 'Assinatura ausente.' })
  }

  const corpo = await req.text()

  // ── Verifica a assinatura do webhook ──────────────────────────────────────
  let evento
  try {
    evento = await stripe.webhooks.constructEventAsync(
      corpo,
      assinatura,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.error('Assinatura inválida:', err instanceof Error ? err.message : String(err))
    return resposta(400, { error: 'Assinatura inválida.' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // ── Idempotência ──────────────────────────────────────────────────────────
  // Registra o evento (ignora se já existe) e só processa quando ainda NÃO foi
  // concluído (processado_em nulo). Assim, um evento cujo processamento falhou
  // pode ser reprocessado no retry do Stripe — sem reprocessar os que deram
  // certo.
  await supabase.from('webhook_eventos').upsert(
    {
      gateway: 'stripe',
      event_id: evento.id,
      tipo: evento.type,
      payload: evento as unknown as Record<string, unknown>,
    },
    { onConflict: 'gateway,event_id', ignoreDuplicates: true }
  )

  const { data: registro } = await supabase
    .from('webhook_eventos')
    .select('processado_em')
    .eq('gateway', 'stripe')
    .eq('event_id', evento.id)
    .maybeSingle()

  if ((registro as { processado_em: string | null } | null)?.processado_em) {
    return resposta(200, { received: true, duplicate: true })
  }

  // ── Processa o evento ─────────────────────────────────────────────────────
  try {
    await processarEvento(supabase, evento)
    await supabase
      .from('webhook_eventos')
      .update({ processado_em: new Date().toISOString() })
      .eq('gateway', 'stripe')
      .eq('event_id', evento.id)
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err)
    console.error(`Erro ao processar ${evento.type}:`, mensagem)
    await supabase
      .from('webhook_eventos')
      .update({ erro: mensagem })
      .eq('gateway', 'stripe')
      .eq('event_id', evento.id)
    // Responde 500 para o Stripe reenviar (a idempotência cobre o reprocesso).
    return resposta(500, { error: 'Falha ao processar evento.' })
  }

  return resposta(200, { received: true })
})

// deno-lint-ignore no-explicit-any
async function processarEvento(supabase: Supabase, evento: any): Promise<void> {
  switch (evento.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await sincronizarSubscription(supabase, evento.data.object, evento.type)
      break
    case 'invoice.paid':
    case 'invoice.payment_failed':
      await sincronizarFatura(supabase, evento.data.object, evento.type)
      break
    case 'checkout.session.completed':
      // A vinculação principal vem de customer.subscription.created; aqui é no-op.
      break
    default:
      console.log('Evento ignorado:', evento.type)
  }
}

/** Atualiza subscriptions + status do tenant a partir de uma Subscription do Stripe. */
// deno-lint-ignore no-explicit-any
async function sincronizarSubscription(supabase: Supabase, sub: any, tipo: string): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  const tenant = await tenantPorCustomer(supabase, customerId)
  if (!tenant) {
    console.warn('Tenant não encontrado para customer', customerId)
    return
  }

  const status =
    tipo === 'customer.subscription.deleted' ? mapearStatus('canceled') : mapearStatus(sub.status)
  const proximoVencimento = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10)
    : null

  await supabase
    .from('subscriptions')
    .update({
      stripe_subscription_id: sub.id,
      status: status.subscription,
      proximo_vencimento: proximoVencimento,
    })
    .eq('tenant_id', tenant.id)

  await supabase.from('tenants').update({ status: status.tenant }).eq('id', tenant.id)

  if (tipo === 'customer.subscription.deleted') {
    await enviarEmail({ to: tenant.email, ...templateCancelamento({ nome: tenant.nome }) })
  }
}

/** Espelha uma invoice do Stripe em `faturas` e ajusta o status do tenant. */
// deno-lint-ignore no-explicit-any
async function sincronizarFatura(supabase: Supabase, invoice: any, tipo: string): Promise<void> {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  const tenant = await tenantPorCustomer(supabase, customerId)
  if (!tenant) {
    console.warn('Tenant não encontrado para customer', customerId)
    return
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  await supabase.from('faturas').upsert(
    {
      tenant_id: tenant.id,
      subscription_id: (subscription as { id: string } | null)?.id ?? null,
      stripe_invoice_id: invoice.id,
      valor: (invoice.amount_due ?? 0) / 100,
      vencimento: invoice.due_date
        ? new Date(invoice.due_date * 1000).toISOString().slice(0, 10)
        : null,
      status: invoice.status,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      paga_em: invoice.status === 'paid' ? new Date().toISOString() : null,
    },
    { onConflict: 'stripe_invoice_id' }
  )

  if (tipo === 'invoice.paid') {
    await supabase.from('tenants').update({ status: 'ativo' }).eq('id', tenant.id)
    await enviarEmail({ to: tenant.email, ...templatePagamentoConfirmado({ nome: tenant.nome }) })
  } else if (tipo === 'invoice.payment_failed') {
    await supabase.from('tenants').update({ status: 'inadimplente' }).eq('id', tenant.id)
  }
}

async function tenantPorCustomer(
  supabase: Supabase,
  customerId: string | undefined
): Promise<{ id: string; nome: string; email: string } | null> {
  if (!customerId) return null
  const { data } = await supabase
    .from('tenants')
    .select('id, nome, email')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return (data as { id: string; nome: string; email: string } | null) ?? null
}
