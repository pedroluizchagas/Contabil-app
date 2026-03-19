-- ============================================================
-- Migration 0002: Tenants, Planos e Subscriptions
-- ============================================================

-- Planos de assinatura disponíveis
CREATE TABLE planos (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome         text NOT NULL,
  preco_mensal numeric(10, 2) NOT NULL,
  limite_empresas     integer NOT NULL,
  limite_funcionarios integer NOT NULL,
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Tenants = Contabilidades (um por assinante)
CREATE TABLE tenants (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome         text NOT NULL,
  cnpj         text NOT NULL UNIQUE,
  email        text NOT NULL UNIQUE,
  status       text NOT NULL DEFAULT 'trial'
                 CHECK (status IN ('ativo', 'inativo', 'trial', 'inadimplente')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Subscriptions: vínculo entre tenant e plano
CREATE TABLE subscriptions (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plano_id            uuid NOT NULL REFERENCES planos(id),
  status              text NOT NULL DEFAULT 'trial'
                        CHECK (status IN ('trial', 'ativo', 'inadimplente', 'cancelado')),
  proximo_vencimento  date,
  gateway_id          text,                -- ID no Pagar.me
  created_at          timestamptz NOT NULL DEFAULT now()
);
