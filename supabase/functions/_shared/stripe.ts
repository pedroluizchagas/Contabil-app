/**
 * Cliente Stripe compartilhado (Deno).
 *
 * Usa o fetch HTTP client e o SubtleCrypto provider, ambos necessários para
 * rodar o SDK do Stripe em Deno (Edge Functions). A verificação de assinatura
 * de webhook DEVE usar `constructEventAsync` com o `cryptoProvider`.
 */
import Stripe from 'https://esm.sh/stripe@16.12.0?target=deno'

export const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
export const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

/** Provider de cripto para verificação assíncrona de assinatura de webhook. */
export const cryptoProvider = Stripe.createSubtleCryptoProvider()

/**
 * Mapeia o status de uma Subscription do Stripe para o domínio do ContaHub.
 * Mantemos os status internos em pt-BR (subscriptions.status e tenants.status)
 * para não quebrar a UI/RLS existentes.
 */
export function mapearStatus(stripeStatus: string): {
  subscription: 'trial' | 'ativo' | 'inadimplente' | 'cancelado'
  tenant: 'trial' | 'ativo' | 'inadimplente' | 'inativo'
} {
  switch (stripeStatus) {
    case 'trialing':
      return { subscription: 'trial', tenant: 'trial' }
    case 'active':
      return { subscription: 'ativo', tenant: 'ativo' }
    case 'past_due':
    case 'incomplete':
      return { subscription: 'inadimplente', tenant: 'inadimplente' }
    case 'unpaid':
      return { subscription: 'inadimplente', tenant: 'inativo' }
    case 'canceled':
    case 'incomplete_expired':
      return { subscription: 'cancelado', tenant: 'inativo' }
    default:
      return { subscription: 'inadimplente', tenant: 'inadimplente' }
  }
}
