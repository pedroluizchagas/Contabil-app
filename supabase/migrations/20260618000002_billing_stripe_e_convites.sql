-- ============================================================
-- Migration 0014: Billing (Stripe) e funil de convites
--
-- Onboarding fechado (invite-only) + Stripe como gateway.
-- Ver docs/BILLING_E_ONBOARDING.md.
-- ============================================================

-- ------------------------------------------------------------
-- Vínculo com o Stripe
-- ------------------------------------------------------------
ALTER TABLE tenants ADD COLUMN stripe_customer_id text UNIQUE;
ALTER TABLE planos ADD COLUMN stripe_price_id text;

-- subscriptions: gateway_id genérico → stripe_subscription_id.
-- O `status` permanece no domínio pt-BR (trial|ativo|inadimplente|cancelado);
-- o `stripe-webhook` mapeia os status do Stripe para esses valores, mantendo a
-- UI do admin (StatusSubscription) e o RLS existentes sem mudanças.
ALTER TABLE subscriptions RENAME COLUMN gateway_id TO stripe_subscription_id;
CREATE INDEX idx_subscriptions_stripe ON subscriptions (stripe_subscription_id);

-- ------------------------------------------------------------
-- webhook_eventos: idempotência de webhooks (Stripe / Autentique)
-- ------------------------------------------------------------
CREATE TABLE webhook_eventos (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway       text NOT NULL CHECK (gateway IN ('stripe', 'autentique')),
  event_id      text NOT NULL, -- ID do evento no gateway (Stripe: event.id)
  tipo          text NOT NULL, -- ex.: invoice.paid
  payload       jsonb NOT NULL,
  processado_em timestamptz,
  erro          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_eventos_gateway_event_unique UNIQUE (gateway, event_id)
);

ALTER TABLE webhook_eventos ENABLE ROW LEVEL SECURITY;
-- Sem policy: apenas service_role (Edge Functions / owner via Admin).

-- ------------------------------------------------------------
-- faturas: espelho das invoices do Stripe
-- ------------------------------------------------------------
CREATE TABLE faturas (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id    uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id  text NOT NULL UNIQUE,
  valor              numeric(10, 2) NOT NULL,
  vencimento         date,
  -- status cru do Stripe: draft|open|paid|uncollectible|void
  status             text NOT NULL,
  hosted_invoice_url text,
  paga_em            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_faturas_tenant ON faturas (tenant_id);

ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;

-- Contabilidade lê as próprias faturas (admin lê via service role).
CREATE POLICY "fatura_contabilidade_select" ON faturas
  FOR SELECT USING (
    tenant_id = public.jwt_tenant_id()
    AND public.jwt_user_role() = 'contabilidade'
  );

-- ------------------------------------------------------------
-- convites: funil de onboarding fechado (CRM leve)
-- ------------------------------------------------------------
CREATE TABLE convites (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       text NOT NULL,
  cnpj       text,
  email      text NOT NULL,
  plano_id   uuid REFERENCES planos(id),
  status     text NOT NULL DEFAULT 'lead'
               CHECK (status IN ('lead', 'contatado', 'aprovado', 'ativo', 'recusado')),
  notas      text,
  tenant_id  uuid REFERENCES tenants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_convites_status ON convites (status);

ALTER TABLE convites ENABLE ROW LEVEL SECURITY;
-- Sem policy: apenas o owner via Admin (service role). Onboarding é fechado.
