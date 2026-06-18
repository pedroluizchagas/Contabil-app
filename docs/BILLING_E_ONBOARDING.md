# 💳 Billing & Onboarding — ContaHub

> Fonte da verdade do modelo de cobrança (Stripe) e do onboarding fechado.
> Complementa `CLAUDE.md`, `ROADMAP.md` (Fase 6/7) e `docs/IMPLEMENTATION_PLAN.md`.
>
> **Decisões (jun/2026, owner):**
>
> 1. **Onboarding fechado (invite-only).** Não há cadastro público. A landing
>    page é só marketing, **sem nenhuma conexão com o backend**. As
>    contabilidades são qualificadas e aprovadas manualmente; o provisionamento
>    é feito pelo Admin SaaS. Objetivo: proteger a plataforma e curar quem assina.
> 2. **Stripe** no lugar do Pagar.me (melhores taxas e ecossistema).
> 3. **UI hosted:** Stripe Checkout (pagamento) + Customer Portal (gestão).
> 4. **Dunning delegado ao Stripe** (Smart Retries + e-mails do Stripe).

---

## 1. Visão geral

ContaHub é um SaaS B2B com **assinatura mensal recorrente por contabilidade
(tenant)**, cobrada via Stripe. Como o público é curado e de baixo volume
(100–1.000 tenants), apoiamo-nos no que o Stripe já faz nativamente para
**minimizar código próprio de billing** e reduzir superfície de risco/PCI.

| Necessidade                  | Solução                                           |
| ---------------------------- | ------------------------------------------------- |
| Página de pagamento          | **Stripe Checkout** (hosted)                      |
| Trocar cartão / ver faturas  | **Stripe Customer Portal** (hosted)               |
| Cobrança em atraso (dunning) | **Stripe Smart Retries** + e-mails do Stripe      |
| Trial 30 dias                | `trial_period_days` nativo do Stripe              |
| Cadastro de tenant           | **Admin** provisiona (sem endpoint público)       |
| Sincronizar acesso ↔ pagto   | `stripe-webhook` (idempotente) → status do tenant |

---

## 2. Onboarding fechado

### 2.1 Princípios

- **Sem signup público.** `enable_signup = false` no Supabase Auth.
- **Landing desacoplada.** Framer/estático, CTA "fale conosco"
  (WhatsApp/form externo tipo Tally). **Zero chamadas ao Supabase.**
- **Provisionamento curado.** Só o owner cria tenants, a partir de um
  `convite` (lead) aprovado.

### 2.2 Funil (tabela `convites`)

```
lead → contatado → aprovado → ativo
                         └────→ recusado
```

O Admin tem um módulo "Convites" para registrar leads, anotar a qualificação
e disparar o provisionamento quando aprovado.

### 2.3 Fluxo de provisionamento

```
Lead chega pela landing (WhatsApp/form)  ── sem backend ──┐
                                                          ▼
Owner registra/qualifica no Admin → status "aprovado"
                                                          ▼
Admin: ação "Provisionar"  →  Edge Function provisionar-tenant
   ├─ cria tenants (status: trial) + convites.tenant_id
   ├─ cria auth.users do contador (service role; sem signup público)
   ├─ Stripe: Customer + Subscription (trial_period_days: 30)
   │    grava stripe_customer_id / stripe_subscription_id
   └─ Resend: e-mail de boas-vindas com
        (a) link para DEFINIR SENHA (convite Supabase)
        (b) link de pagamento (Checkout) / Customer Portal
                                                          ▼
Contador define a senha, instala o desktop e começa a usar
```

---

## 3. Modelo de dados (deltas)

```sql
-- Vínculo com o Stripe
ALTER TABLE tenants ADD COLUMN stripe_customer_id text UNIQUE;
ALTER TABLE planos  ADD COLUMN stripe_price_id    text;   -- Price recorrente

-- subscriptions: usar stripe_subscription_id (em vez de gateway_id) e
-- status alinhado ao Stripe:
--   trialing | active | past_due | canceled | unpaid

-- Idempotência de webhooks (Stripe e Autentique)
CREATE TABLE webhook_eventos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway       text NOT NULL CHECK (gateway IN ('stripe','autentique')),
  event_id      text NOT NULL,                 -- Stripe event.id
  tipo          text NOT NULL,                 -- ex.: invoice.paid
  payload       jsonb NOT NULL,
  processado_em timestamptz,
  erro          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gateway, event_id)
);

-- Faturas (espelho das invoices do Stripe)
CREATE TABLE faturas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id    uuid NOT NULL REFERENCES subscriptions(id),
  stripe_invoice_id  text NOT NULL UNIQUE,
  valor              numeric(10,2) NOT NULL,
  vencimento         date,
  status             text NOT NULL,            -- draft|open|paid|uncollectible|void
  hosted_invoice_url text,
  paga_em            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Funil de onboarding (CRM leve)
CREATE TABLE convites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  cnpj       text,
  email      text NOT NULL,
  plano_id   uuid REFERENCES planos(id),
  status     text NOT NULL DEFAULT 'lead'
             CHECK (status IN ('lead','contatado','aprovado','ativo','recusado')),
  notas      text,
  tenant_id  uuid REFERENCES tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

> `planos.preco_mensal` segue como referência de exibição; a cobrança usa o
> `Price` do Stripe apontado por `planos.stripe_price_id`. Manter os dois em
> sincronia ao criar/editar planos.

---

## 4. Edge Functions

| Função               | Acesso                      | Responsabilidade                                                              |
| -------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `provisionar-tenant` | Admin (autenticado)         | cria tenant + contador + Customer/Subscription(trial) + e-mail de boas-vindas |
| `stripe-webhook`     | Público (assinatura Stripe) | idempotência + sincroniza `subscriptions`/`faturas` + status do tenant        |
| `stripe-portal`      | Contador (autenticado)      | cria sessão do Customer Portal e devolve a URL                                |
| `enviar-email`       | Interno                     | wrapper Resend (boas-vindas, pagamento confirmado, cancelamento)              |

> **Removido do plano original:** `criar-subscription` (público) e `cron-billing`
> (dunning próprio). O provisionamento virou ação do Admin e o dunning é do Stripe.

### 4.1 `stripe-webhook` — mapeamento de eventos

| Evento Stripe                   | Efeito no ContaHub                              |
| ------------------------------- | ----------------------------------------------- |
| `checkout.session.completed`    | vincula Customer/Subscription ao tenant         |
| `customer.subscription.created` | tenant `trial`/`ativo` conforme status          |
| `invoice.paid`                  | tenant `ativo` + upsert em `faturas` (paid)     |
| `invoice.payment_failed`        | tenant `inadimplente` (grace; Stripe faz retry) |
| `customer.subscription.updated` | sincroniza status (`past_due`, `canceled`…)     |
| `customer.subscription.deleted` | tenant `inativo`                                |

**Idempotência:** todo evento é gravado em `webhook_eventos`; `UNIQUE
(gateway, event_id)` garante que um reenvio do mesmo `event.id` não duplica
efeito. **Assinatura:** validar o header `Stripe-Signature` com
`STRIPE_WEBHOOK_SECRET` antes de processar (rejeitar com 400 se inválida).

### 4.2 Estados do tenant ↔ Stripe

| Status Stripe (subscription) | `tenants.status` | Acesso no app             |
| ---------------------------- | ---------------- | ------------------------- |
| `trialing`                   | `trial`          | completo                  |
| `active`                     | `ativo`          | completo                  |
| `past_due`                   | `inadimplente`   | leitura; sem upload       |
| `unpaid` / `canceled`        | `inativo`        | bloqueado (dados retidos) |

---

## 5. Mapeamento de planos → Stripe

1. Para cada plano em `planos`, criar um **Product** + **Price** recorrente
   mensal (BRL) no Stripe e gravar o `price_id` em `planos.stripe_price_id`.
2. Mudança de plano = trocar o `Price` da Subscription (proration conforme
   política definida).
3. Limites (`limite_empresas`, `limite_funcionarios`) são enforced no ContaHub
   (DB + API), independentes do Stripe.

---

## 6. Variáveis de ambiente

```env
# Stripe (billing) — secret server-only
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# Só se algum dia usarmos Stripe.js no cliente (não necessário no modelo hosted)
STRIPE_PUBLISHABLE_KEY=

# E-mails transacionais
RESEND_API_KEY=
```

As chaves do Stripe **nunca** vão para o cliente (apenas Edge Functions). O
`STRIPE_WEBHOOK_SECRET` é o signing secret do endpoint configurado no Stripe.

---

## 7. Pré-requisitos operacionais

- [ ] Conta **Stripe Brasil** em BRL, com **Pix e Boleto habilitados** (cartão
      vem por padrão). Confirmar elegibilidade da entidade/CNPJ.
- [ ] Products/Prices criados para cada plano.
- [ ] Endpoint do `stripe-webhook` registrado no Stripe + signing secret salvo.
- [ ] Templates de e-mail no Resend (boas-vindas, pagamento confirmado, cancelamento).
- [ ] Landing page (marketing) publicada **sem** integração com o backend.

---

## 8. Definition of Done (Fase 6)

- ✅ Owner aprova um `convite` → `provisionar-tenant` cria tenant + assinatura
  trial no Stripe (test mode) → contador define senha e paga via Checkout.
- ✅ `invoice.paid` mantém o tenant ativo; `payment_failed` +
  `subscription.updated(past_due)` bloqueia uploads em até 60s.
- ✅ Webhook idempotente (reenvio do mesmo `event.id` não duplica efeito).
- ✅ Customer Portal acessível pelo app da contabilidade.
- ✅ E-mails de boas-vindas/confirmação chegam pelo Resend.
- ✅ Nenhum caminho de signup público existe (auditado).

---

_Documento vivo. Atualizar quando uma decisão de billing/onboarding mudar._
