# 📐 ContaHub — Plano de Implementação

> Documento técnico que consolida o estado atual do projeto e descreve, de
> ponta a ponta, o que ainda falta para entregar o MVP de forma profissional
> e escalável (100 → 1.000 tenants).
>
> Leitura obrigatória para qualquer dev (humano ou assistente de IA) que vá
> contribuir com o repositório. Complementa, não substitui, o `CLAUDE.md` e o
> `ROADMAP.md`.

---

## 1. Sumário Executivo

ContaHub é um SaaS multi-tenant para contabilidades enviarem holerites e
recibos de férias individualizados aos funcionários, com rastreabilidade de
leitura e assinatura digital. O monorepo já tem **as fundações de
infraestrutura, banco, auth e os 4 apps consumindo o Supabase**.

| Bloco                                         | Estado      | Comentário                                          |
| --------------------------------------------- | ----------- | --------------------------------------------------- |
| Monorepo, Turbo, lint, type-check, CI         | ✅ Pronto   | GitHub Actions só roda lint + type + format         |
| Schema Postgres + RLS + JWT hook + Storage    | ✅ Pronto   | 14 migrations, view de status, índices              |
| Edge Functions de auth (3 perfis)             | ✅ Pronto   | Empresa via CNPJ+senha; funcionário via CPF+DOB+OTP |
| Engine de split de PDF (`process-lote`)       | 🟡 Parcial  | Funciona, **não testado com PDFs reais**            |
| App Desktop Contabilidade                     | 🟡 Quase    | CRUDs + upload + dashboard prontos; falta polimento |
| App Desktop Empresa                           | 🟡 Parcial  | Login, dashboard, documentos; faltam fluxos de auth |
| App Mobile Funcionário                        | 🟡 Parcial  | Login OTP + push + listagem; **falta assinatura**   |
| Admin SaaS (Next.js)                          | 🟡 Parcial  | Dashboard, tenants, planos, subscriptions           |
| Billing (Stripe) + e-mails (Resend)           | ❌ Faltando | Onboarding fechado; UI hosted (Checkout/Portal)     |
| Assinatura digital (Autentique)               | ❌ Faltando | Integração inexistente                              |
| Observabilidade (Sentry, logs, métricas)      | ❌ Faltando | Apenas `console.log`                                |
| Testes (unit / e2e / regressão)               | ❌ Faltando | Nenhum suite configurado                            |
| LGPD (consentimento, retenção, DSAR)          | ❌ Faltando | Apenas rascunho em comentários                      |
| Distribuição (Tauri sign + Play + TestFlight) | ❌ Faltando | Bundles não assinados, sem update server            |

O caminho crítico até o MVP cobrado é **completar a Fase 5 (assinatura no mobile)**,
**implementar a Fase 6 (billing)** e fechar gaps de qualidade (testes, observabilidade,
LGPD) antes do go-live. Detalhes nas seções 4–10.

---

## 2. Inventário Detalhado

### 2.1 Estrutura do repositório

```
apps/
  admin/                   Next.js 14 — painel do owner
  desktop-contabilidade/   Tauri v2 + React + Vite + Tailwind
  desktop-empresa/         Tauri v2 + React + Vite + Tailwind
  mobile/                  Expo SDK 54 + Expo Router + NativeWind
packages/
  shared/                  formatadores, validadores (CPF/CNPJ), constantes
  supabase/                client singleton + auth helpers + database.types.ts
  ui/                      design system web (Button, Card, Badge, Input, …)
supabase/
  migrations/              14 migrations (timestamp 0319 e 0325 e 0412)
  functions/               7 Edge Functions (Deno)
  seed.sql                 ~200 linhas com tenant, empresas, funcionários demo
.github/workflows/ci.yml   lint + type-check + format-check em PR para main
```

### 2.2 Banco de dados (Supabase / Postgres 15)

Tabelas em produção: `tenants`, `planos`, `subscriptions`, `empresas`,
`funcionarios`, `documentos`, `eventos_documento`, `lotes`, `auth_codes`,
`expo_push_tokens`. View: `v_status_documentos` (com `security_invoker = on`
após migration 0011).

**Pontos fortes:**

- RLS habilitado em todas as tabelas com `tenant_id`; policies separadas
  por `user_role` (contabilidade, empresa, funcionario) — ver migration 0005.
- JWT hook `custom_access_token_hook` injeta `tenant_id`, `user_role`,
  `empresa_id`, `funcionario_id`. Tem `SET search_path` e `EXCEPTION WHEN
OTHERS` (migration 0012) — robusto contra falhas.
- Storage isolado: `lotes/{tenant_id}/{lote_id}/...` e
  `documentos/{tenant_id}/{empresa_id}/{funcionario_id}/...` com policies
  por nível de hierarquia.
- Índices estratégicos em `cpf_hash`, `tenant_id`, `empresa_id`, período.
- Hashes via `pgcrypto` (`crypt(... gen_salt('bf', 10))`) — bcrypt cost 10.

**Pontos de atenção:**

- `eventos_documento` não tem índice composto `(documento_id, tipo, created_at)`
  — relatórios podem ficar lentos em escala (1k tenants × 500 funcionários × 12 meses).
- Tabela `auth_codes` cresce indefinidamente — falta cron de limpeza
  (`DELETE FROM auth_codes WHERE expires_at < now() - interval '7 days'`).
- Sem `updated_at` automático em nenhuma tabela. Recomendo trigger
  `moddatetime` ao menos em `tenants`, `empresas`, `funcionarios`,
  `subscriptions`, `documentos`.
- Não há tabela `webhook_eventos` (idempotência de webhooks Stripe/Autentique).
- Não há tabela `assinaturas_autentique` (referência ao documento na Autentique).

### 2.3 Edge Functions (Deno)

| Função                     | Linhas | Função                                               |
| -------------------------- | -----: | ---------------------------------------------------- |
| `auth-empresa`             |    108 | CNPJ + senha → `auth.admin.createSession`            |
| `auth-funcionario`         |    237 | 2 etapas: verify (envia OTP) + confirm (cria sessão) |
| `criar-empresa`            |     90 | cria empresa + usuário Auth ligado                   |
| `criar-funcionario`        |     91 | cria funcionário + Auth user                         |
| `buscar-empresa`           |     54 | resolve empresa pelo CNPJ (público)                  |
| `alterar-senha-empresa`    |     72 | troca senha (autenticado)                            |
| `process-lote`             |    342 | core do split de PDF                                 |
| `process-lote/pdf-utils`   |    149 | extrai texto e fatia páginas (`pdf-lib`)             |
| `process-lote/matcher`     |    159 | matching por código (regex) + fallback fixo          |
| `process-lote/notificador` |    122 | Expo Push API em lotes de 100                        |

**Importante:** `process-lote/pdf-utils.ts` usa **parsing manual** de
streams `BT...ET` em vez de `pdfjs-dist` (que conflita com Deno). Funciona
em PDFs com texto plano, mas falha em streams `FlateDecode` comprimidas —
caso muito comum em PDFs corporativos. Ver bug B2 na seção 3.

### 2.4 Apps

#### desktop-contabilidade (mais maduro)

Páginas: `Login`, `Dashboard`, `Empresas` (lista + form), `Funcionarios`
(lista + form + importação Excel `xlsx`), `Lotes` (lista, detalhe, upload com
Realtime e barra de progresso), `Documentos`, `Configuracoes`. Componentes
UI próprios em `src/components/ui/` (Card, Button, Badge, EmptyState, Modal,
PageHeader, etc.). Já consome `@contabhub/ui`, `@contabhub/shared`,
`@contabhub/supabase`.

#### desktop-empresa (esqueleto funcional)

Páginas: `Login` (CNPJ+senha via `loginEmpresa`), `Dashboard`, `Documentos`
(usa view `v_status_documentos` com filtros e signed URLs), `Funcionarios`,
`Conta`. **Não há fluxo de primeiro acesso/redefinição de senha pela UI.**

#### mobile (Expo)

Estrutura Expo Router: `(auth)/login.tsx`, `(auth)/otp.tsx`,
`(tabs)/index.tsx`, `(tabs)/documentos.tsx`, `(tabs)/perfil.tsx`. Hook
`useNotifications` registra token Expo. Não há tela de visualização inline
de PDF — abre via `Linking.openURL` na URL assinada. **Não há fluxo de
assinatura digital implementado.**

#### admin

Next.js 14 com `(dashboard)` group route protegido por middleware. Páginas:
`Dashboard` (MRR, contadores, lotes recentes), `Tenants` (lista + detalhe
com `AlterarStatusTenant`), `Planos` (CRUD via `PlanoForm`), `Subscriptions`.
Autorização via `user_metadata.role === 'admin'` (não há tabela
`admin_users` própria).

### 2.5 Packages

- `@contabhub/shared`: formatadores (CPF/CNPJ/moeda/data), validadores
  (algoritmo de dígitos), constantes (meses, labels de status).
- `@contabhub/supabase`: `client.ts` (singleton), `auth.ts` (login dos 3
  perfis), `database.types.ts` (≈ 500 linhas gerados pelo Supabase CLI).
- `@contabhub/ui`: 6 componentes shadcn-like (`Badge`, `Button`, `Card`,
  `Input`, `Label`, `StatusBadge`).

### 2.6 CI/CD atual

`.github/workflows/ci.yml` faz `pnpm install --frozen-lockfile`, depois
`pnpm lint` e `pnpm type-check`, e em outro job `pnpm format:check`. Roda em
push e PR para `main`. **Não há build de produção, testes, segurança,
deploy ou release automatizado.**

---

## 3. Bugs e Achados Críticos

### B1 — Tabela errada no registro de push token (HIGH)

`apps/mobile/src/hooks/useNotifications.ts:58` faz upsert em `expo_tokens`,
mas a migration 0009 cria `expo_push_tokens`. O `process-lote` já lê de
`expo_push_tokens` (linhas 196 e 214). **Push notifications nunca chegam ao
funcionário no estado atual.**

→ Renomear o `from('expo_tokens')` para `from('expo_push_tokens')` e usar
o conflict key correto (`funcionario_id,token`, pois a migration permite
múltiplos dispositivos por funcionário).

### B2 — Evento "visualizado" registrado no envio (HIGH)

`supabase/functions/process-lote/index.ts:310-316` insere
`eventos_documento{tipo:'visualizado'}` no momento em que o documento é
gerado. Isso **destrói a métrica de leitura** — todo documento já nasce com
um evento de visualização do "sistema".

→ Não inserir evento nessa etapa. O `status_envio` na tabela `documentos`
já cobre o "foi gerado". O evento "visualizado" só deve ser inserido pelo
app mobile/web quando o funcionário/empresa abre o PDF.

### B3 — Confirmação de OTP varre todos os códigos ativos (MEDIUM)

`supabase/functions/auth-funcionario/index.ts:165-188` busca os 20 OTPs
ativos mais recentes do **banco inteiro** e chama `verificar_hash` em
loop. Em escala isso:

1. Vaza informação por canal lateral (timing);
2. Aumenta latência;
3. Falha quando há mais de 20 logins concorrentes.

→ Filtrar `auth_codes` por `funcionario_id` (que pode ser resolvido via
`empresa_id + cpf_limpo` na própria query — fazer a verificação do CPF na
etapa `confirm` também, em vez de assumir).

### B4 — `process-lote` aceita lote_id sem validar tenant (MEDIUM, segurança)

`index.ts:42-87` recebe `lote_id` e confia que o caller tem acesso. Como a
função roda com `service_role`, qualquer caller com a chave pode disparar
o processamento de qualquer lote.

→ Validar `Authorization` do request: extrair o JWT, conferir que o
`tenant_id` da claim bate com `lote.tenant_id`. Ou exigir que a função só
seja chamada a partir do próprio backend Supabase via secret compartilhado.

### B5 — `desktop-empresa` não consegue redefinir senha (MEDIUM, UX)

Não há tela nem endpoint de fluxo "esqueci minha senha" para a empresa. A
única forma hoje é a contabilidade chamar `alterar-senha-empresa` por fora.

→ Implementar fluxo de recuperação (e-mail com link assinado de troca).

### B6 — `auth-empresa` retorna mensagem genérica mas registra `console.error` (LOW)

Em produção o `console.error` vaza CNPJ no log do Supabase. Não é
catastrófico, mas é PII — melhor logar apenas hash do CNPJ ou ID interno.

### B7 — Não há retry/queue em `process-lote` (LOW agora, HIGH em escala)

A Edge Function processa síncronamente todos os funcionários do lote.
Lote com 500 funcionários × upload + insert pode estourar o timeout de 60s
da Edge Function. Recomendo enfileirar via tabela `lote_tasks` e processar
em jobs menores (worker dedicado ou pg_cron + função SQL).

### B8 — Tipos do banco apontam para `expo_push_tokens` mas hook usa singular (consequência de B1)

`packages/supabase/src/database.types.ts:420` lista `expo_push_tokens`.
TypeScript não pega B1 porque `from()` aceita string genérica para tabelas
ausentes. Considerar gerar types com `--schema public` e quebrar build se
algum app referenciar tabela inexistente.

### B9 — Workflow do CI conflita com `packageManager` no package.json (HIGH, infra)

`.github/workflows/ci.yml` passava `pnpm/action-setup@v4` com
`version: 9`. Em conjunto com `package.json: "packageManager": "pnpm@9.15.0"`,
a versão atual da action aborta com "Multiple versions of pnpm specified" —
**bloqueia todos os jobs antes de executar lint/type-check/prettier**.

→ Corrigido no commit `8e2f1ef` (remover o input `version`); a action passa
a ler `packageManager` do `package.json`.

### B10 — Repositório com 75 arquivos fora do padrão Prettier (LOW, qualidade)

`pnpm format:check` reprova 75 arquivos espalhados pelos 4 apps + 3 packages

- Edge Functions + `CLAUDE.md` + `ROADMAP.md`. Antes do fix do B9, isso
  estava mascarado pelo erro do pnpm. Não é regressão deste PR — é dívida
  acumulada.

→ Abrir PR separado `chore: prettier --write` rodando o formatador em todo
o repositório. Recomendo congelar outros PRs durante o merge para reduzir
conflitos.

### B11 — 2 imports não usados quebram o `pnpm lint` (LOW, qualidade)

- `apps/mobile/app/(tabs)/documentos.tsx:5` importa `ScrollView` sem usar.
- `apps/mobile/app/(auth)/otp.tsx:16` declara `loginStep1` sem usar.

→ PR separado `chore: cleanup unused imports`. Trivial.

### B12 — Admin lê env vars com nomes inconsistentes (MEDIUM, build/runtime)

No `apps/admin`:

- `src/middleware.ts` e `src/lib/supabase/server.ts` usam `process.env.SUPABASE_URL`
  e `process.env.SUPABASE_ANON_KEY` (sem prefixo — só funcionam server-side).
- `src/lib/supabase/client.ts` usa `process.env.NEXT_PUBLIC_SUPABASE_URL` e
  `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` (com prefixo — necessário para
  client components).

Se o Vercel tiver apenas as variáveis sem prefixo configuradas, o cliente
browser recebe `undefined` e a hidratação falha; se tiver apenas com
prefixo, o middleware morre. Suspeita forte para a falha atual do deploy
Vercel — checks pré-existentes mostram "Deployment has failed" em todos os
commits, inclusive os do main antes deste PR.

→ Padronizar para `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
em todos os pontos do admin (são valores públicos, podem ir para o cliente).
Manter `SUPABASE_SERVICE_ROLE_KEY` sem prefixo (segredo). Configurar as 3
variáveis no Vercel Project Settings antes do próximo deploy.

→ PR separado sugerido: `fix(admin): padroniza env vars do Supabase`.

---

## 4. Plano de Implementação por Fase

A numeração continua o ROADMAP existente. Cada fase tem **escopo**,
**critério de pronto (DoD)** e **tarefas atômicas** prontas para virarem
issues.

### Fase 2.1 — Endurecer o Engine de Split de PDF

**Estimativa:** 1 semana após coletar amostras reais.

**Escopo**

1. Coletar 5+ PDFs reais (mín. 1 por software: Domínio, Alterdata, Questor,
   Folha Matic, SCI). Salvar em `supabase/functions/process-lote/fixtures/`
   anonimizados.
2. Substituir o parser manual de `BT…ET` por uma extração robusta
   (`pdfjs-dist` rodando em Deno via `@cmaas/pdfjs-dist` ou um worker
   externo Cloud Run/Lambda chamado por HTTP). Testar com FlateDecode.
3. Adicionar testes unitários do `funcionario-matcher.ts` cobrindo:
   código no início da página, código no rodapé, código com hífen,
   página de continuação sem código.
4. Acrescentar um modo `--dry-run` que devolve um JSON com a previsão de
   matching sem gravar nada — para auditar PDFs novos.
5. Endurecer `process-lote/index.ts`:
   - validar tenant via JWT (resolve B4);
   - parar de inserir evento `visualizado` no envio (B2);
   - usar `Authorization: Bearer` do caller para os inserts (assim o RLS
     valida em vez do service role bypassar tudo);
   - enfileirar processamento em jobs de até 50 funcionários (mitiga B7).

**DoD**

- ✅ `pnpm --filter @contabhub/process-lote test` passa em 100 % dos
  fixtures.
- ✅ Lote real de cada software contábil processado em ambiente staging
  sem intervenção manual.
- ✅ Métrica de "leituras" mostra 0 antes do funcionário abrir o doc.

### Fase 4.1 — Fechar App Desktop Empresa

**Estimativa:** 4–5 dias.

**Tarefas**

- [ ] Tela "Primeiro acesso" — empresa entra com CNPJ + senha temporária e
      é forçada a trocar.
- [ ] Tela "Esqueci minha senha" (envio de link assinado por e-mail via
      Resend) — depende da Fase 6.
- [ ] Realtime: assinar canal `documentos` filtrado por `empresa_id` e
      mostrar toast quando um novo doc chega.
- [ ] Filtros granulares na página `Documentos`: por funcionário, por
      lote, por status com counts.
- [ ] Auto-updater Tauri: subir endpoint em `apps/admin` (`/api/updater/empresa`)
      e configurar `tauri.conf.json` com `pubkey` + URL.
- [ ] Tela de exportação CSV dos eventos (auditoria para o jurídico).

**DoD**

- ✅ E2E manual: empresa entra pela primeira vez, troca senha, recebe
  doc novo via Realtime, abre PDF.
- ✅ `tauri build` gera bundle assinado para Windows.

### Fase 5.1 — Fechar App Mobile Funcionário

**Estimativa:** 1,5 a 2 semanas.

**Tarefas**

- [ ] **Bug B1**: corrigir `useNotifications` para usar `expo_push_tokens`
      com `onConflict: 'funcionario_id,token'`.
- [ ] Tela de visualização de PDF inline (`react-native-pdf` ou WebView)
      — abrir externalmente é UX ruim e atrasa o evento de visualização.
- [ ] Registrar evento `visualizado` **só** depois que a página
      efetivamente renderiza.
- [ ] Integração Autentique: - nova Edge Function `iniciar-assinatura` (cria documento no
      Autentique, devolve URL/`signer_token`); - tela de revisão + clique em "Assinar agora" → abre Autentique; - webhook `autentique-webhook` que insere `eventos_documento{tipo:'assinado'}`
      e marca `documentos.assinado_em` (sugiro adicionar coluna).
- [ ] Termo de consentimento LGPD no primeiro login (telinha com aceite
      armazenado em `funcionarios.consentimento_em`).
- [ ] Tela `Perfil`: editar e-mail (com verificação via OTP novo) e
      desativar push.
- [ ] EAS build para Android + iOS, `eas.json` com profiles `dev`,
      `preview`, `production`.
- [ ] Push notification deep link: `data.documento_id` → abrir direto na
      tela do documento.

**DoD**

- ✅ Funcionário recebe push, abre app, lê doc, assina, evento aparece
  no admin do contador.
- ✅ App publicado no Internal Testing da Play Store e no TestFlight.

### Fase 6 — Billing (Stripe) e E-mails Transacionais

**Estimativa:** 1 semana.

> **Decisões (jun/2026):** gateway **Stripe** (no lugar do Pagar.me — melhores
> taxas e ecossistema). **UI hosted** (Stripe Checkout + Customer Portal).
> **Dunning delegado ao Stripe** (Smart Retries + e-mails do Stripe).
> **Onboarding fechado** (sem self-service — provisionamento pelo Admin).
> Fonte da verdade detalhada: `docs/BILLING_E_ONBOARDING.md`.

#### 6.1 Schema novo

```sql
-- Vínculo com o Stripe
ALTER TABLE tenants  ADD COLUMN stripe_customer_id text UNIQUE;
ALTER TABLE planos   ADD COLUMN stripe_price_id    text;  -- Price recorrente
-- subscriptions: usar stripe_subscription_id (em vez de gateway_id) e status
-- alinhado ao Stripe (trialing|active|past_due|canceled|unpaid).

-- Webhooks recebidos (idempotência) — Stripe e Autentique
CREATE TABLE webhook_eventos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway       text NOT NULL CHECK (gateway IN ('stripe','autentique')),
  event_id      text NOT NULL,        -- ID do evento no gateway (Stripe event.id)
  tipo          text NOT NULL,        -- ex.: invoice.paid
  payload       jsonb NOT NULL,
  processado_em timestamptz,
  erro          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gateway, event_id)
);

-- Faturas (espelho das invoices do Stripe)
CREATE TABLE faturas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id   uuid NOT NULL REFERENCES subscriptions(id),
  stripe_invoice_id text NOT NULL UNIQUE,
  valor             numeric(10,2) NOT NULL,
  vencimento        date,
  status            text NOT NULL,    -- draft|open|paid|uncollectible|void
  hosted_invoice_url text,            -- link da fatura hospedada no Stripe
  paga_em           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Funil de onboarding fechado (CRM leve)
CREATE TABLE convites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  cnpj       text,
  email      text NOT NULL,
  plano_id   uuid REFERENCES planos(id),
  status     text NOT NULL DEFAULT 'lead'
             CHECK (status IN ('lead','contatado','aprovado','ativo','recusado')),
  notas      text,
  tenant_id  uuid REFERENCES tenants(id),  -- preenchido após provisionar
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### 6.2 Edge Functions novas

- `provisionar-tenant` (**Admin, autenticado — não público**): a partir de um
  `convite` aprovado, cria `tenants` + usuário Auth do contador + `Customer` e
  `Subscription` (com `trial_period_days: 30`) no Stripe; grava
  `stripe_customer_id`/`stripe_subscription_id`; dispara e-mail de boas-vindas
  (Resend) com link para definir a senha + link de pagamento (Checkout/Portal).
- `stripe-webhook` (**público, assinatura verificada**): valida `Stripe-Signature`
  com o signing secret, registra em `webhook_eventos` (idempotência por
  `event.id`), e sincroniza `subscriptions`/`faturas` + o status do tenant.
- `stripe-portal` (**contador, autenticado**): cria uma sessão do Stripe
  Customer Portal e devolve a URL.
- `enviar-email`: wrapper sobre a API Resend (templates: boas-vindas/convite,
  pagamento-confirmado, cancelado). _Cobrança/inadimplência fica por conta dos
  e-mails do próprio Stripe._

#### 6.3 Mapeamento de eventos (Stripe → estado do tenant)

| Evento Stripe                   | Efeito                                            |
| ------------------------------- | ------------------------------------------------- |
| `checkout.session.completed`    | vincula `Customer`/`Subscription` ao tenant       |
| `customer.subscription.created` | tenant `trial`/`ativo` conforme status            |
| `invoice.paid`                  | tenant `ativo` + upsert em `faturas` (paid)       |
| `invoice.payment_failed`        | tenant `inadimplente` (grace; Stripe faz o retry) |
| `customer.subscription.updated` | sincroniza status (`past_due`, `canceled`…)       |
| `customer.subscription.deleted` | tenant `inativo`                                  |

#### 6.4 Regras de negócio

- **Trial:** 30 dias nativos do Stripe (`trial_period_days`), definidos no
  provisionamento.
- **Dunning:** delegado ao Stripe (Smart Retries + e-mails). Nosso webhook só
  reflete `past_due`/`canceled` no acesso do tenant (bloqueio após grace).
- **Limites do plano:** enforced em **DB** (constraints/trigger) e em **API**
  (rejeitar inserts em `empresas`/`funcionarios` quando o limite for atingido).
- **Bloqueio de acesso:** quando o tenant não está `ativo`/`trialing`, o app da
  contabilidade entra em modo restrito (sem upload de lotes).

#### 6.5 Frontend

- **Admin:** módulo "Convites" (funil + ação "Provisionar"); em Tenants, botão
  "Abrir no Stripe" e "Estender trial"; aba "Inadimplentes" (status via webhook).
- **Desktop-contabilidade:** barra de aviso quando `trial` está acabando ou o
  tenant está `inadimplente`, com botão "Gerenciar assinatura" → `stripe-portal`.

**DoD**

- ✅ Owner aprova um `convite` → `provisionar-tenant` cria tenant + assinatura
  trial no Stripe (test mode) → contador define senha e paga via Checkout.
- ✅ `invoice.paid` mantém o tenant ativo; `invoice.payment_failed` +
  `customer.subscription.updated(past_due)` bloqueia uploads em até 60s.
- ✅ Webhook idempotente (reenvio do mesmo `event.id` não duplica efeito).
- ✅ E-mails de boas-vindas/confirmação chegam pelo Resend.

### Fase 7.1 — Admin SaaS Operacional

**Estimativa:** 4 dias.

- [ ] Tabela `admin_users` com `role` própria (não confiar em
      `user_metadata`).
- [ ] Módulo "Convites": funil de leads + ação "Provisionar".
- [ ] Página "Logs": tail das Edge Functions via API Supabase + filtros.
- [ ] Página "Lotes com erro": agrega erros de processamento e permite
      reprocessar (chamada manual a `process-lote`).
- [ ] Página "Suporte": notas livres por tenant + reset de senha do
      contador.
- [ ] Métricas: gráfico de MRR por mês, churn mensal, tempo médio entre
      upload e leitura.

### Fase 7.2 — Provisionamento de Tenants (onboarding fechado)

> **Mudança de modelo:** o onboarding é **invite-only**. Não há self-service
> nem signup público — a landing page é só marketing, sem conexão com o backend.

- [ ] Landing page **desacoplada** (Framer/estático): CTA "fale conosco"
      (WhatsApp/form externo). Zero chamadas ao Supabase.
- [ ] Fluxo no Admin: lead → qualificação → aprovação → `provisionar-tenant`.
- [ ] `provisionar-tenant` (transacional): cria `auth.users` (contador) +
      `tenants` + `Customer`/`Subscription(trial)` no Stripe.
- [ ] Convite por e-mail (Resend) com link para definir senha + baixar o app.
- [ ] `enable_signup = false` no Supabase Auth (sem cadastro público).
- [ ] Fluxo de instalação documentado (Windows): MSI assinado +
      auto-updater + telemetria opt-in.

---

## 5. Qualidade de Engenharia (transversal)

### 5.1 Testes

Mínimo viável para virar profissional:

| Camada                 | Ferramenta                          | Cobertura mínima                      |
| ---------------------- | ----------------------------------- | ------------------------------------- |
| `packages/shared`      | Vitest                              | 90 % (CPF, CNPJ, formatadores)        |
| Edge Functions         | `deno test`                         | matcher, pdf-utils, webhooks          |
| Apps React (web/Tauri) | Vitest + Testing Library            | hooks (`AuthContext`), forms críticos |
| Mobile                 | Jest + Testing Library RN           | telas de auth, listagem               |
| Banco                  | pgTAP em `supabase/tests/`          | RLS por perfil, JWT hook              |
| E2E                    | Playwright (admin) + Detox (mobile) | golden path de cada perfil            |

Setup recomendado:

- Adicionar `vitest` ao root e criar `pnpm test` (filtrado pelo turbo).
- Job CI separado: `pnpm test:ci` rodando após type-check.
- Em PRs que tocam `supabase/`, rodar `supabase db reset` + pgTAP em
  container.

### 5.2 Observabilidade

- **Sentry** em todos os apps (`@sentry/react`, `@sentry/react-native`,
  `@sentry/nextjs`, e `Sentry.Deno.init` nas Edge Functions). DSN no env.
- **Logs estruturados**: substituir `console.log` por util em
  `packages/shared/src/log.ts` com nível + correlation id (lote_id, etc.).
- **Métricas**: Supabase já expõe pgwatch/pg_stat. Adicionar dashboard
  Grafana Cloud (free tier) lendo o endpoint Prometheus do Supabase.
- **Alertas**: Sentry → Slack para erros em produção; falha no
  `stripe-webhook` → e-mail.

### 5.3 Segurança e LGPD

Antes do go-live:

- [ ] Termos de uso + política de privacidade (texto jurídico, link no
      rodapé de cada app).
- [ ] Termo de consentimento LGPD no primeiro login do funcionário,
      registrado em coluna nova `funcionarios.consentimento_em`.
- [ ] Endpoint de **DSAR (direito ao esquecimento)**: Edge Function
      `excluir-dados-funcionario` que apaga `documentos`, `eventos`,
      `expo_push_tokens`, `auth_codes` e anonimiza `funcionarios`
      (mantém ID + tenant para integridade contábil, mas zera nome/email/
      hashes). Fluxo iniciado pelo funcionário no app mobile.
- [ ] Política de retenção: documentos > 60 meses são movidos para
      `storage/arquivos-frios/` (bucket separado, sem signed URL público).
- [ ] Rate limit nas Edge Functions de auth (`auth-empresa`,
      `auth-funcionario`) — usar `supabase.functions.limit` ou
      contadores em Postgres (`rate_limit(funcionario_id, '1 minute', 5)`).
- [ ] Pen test interno mínimo: tentar ler dados de outro tenant com JWT
      válido (RLS); subir doc em path errado (Storage RLS); brute-force
      OTP.
- [ ] Backup automático Supabase (incluso no plano Pro) + script de
      restore documentado.
- [ ] `.env` real fora de `git` (já está; reforçar revisão `git secrets`).

### 5.4 Performance e Escala

Hipóteses de carga MVP (1.000 tenants):

- 1.000 tenants × 50 empresas × 50 funcionários = **2,5 M funcionarios**.
- 2 documentos/mês × 2,5 M = **5 M docs/mês = 60 M/ano**.

Decisões para suportar essa ordem de grandeza:

- Particionar `documentos` e `eventos_documento` por `ano_referencia`
  (`PARTITION BY RANGE`).
- Mover `storage_path` para coluna `text NOT NULL` com `CHECK
(storage_path ~ '^[0-9a-f-]+/...')` — evita inconsistência.
- Reescrever `v_status_documentos` como **MATERIALIZED VIEW** atualizada
  por trigger ou pg_cron a cada N minutos. JOIN de eventos com docs em
  view comum vira gargalo.
- Compactação dos PDFs antes do upload (pdf-lib `compress: true`).
- CDN-style signed URLs com TTL maior (5 min em vez de 2 min) e cache no
  app mobile.
- `process-lote` precisa virar **fila** (ver B7). Sugestão: tabela
  `processamento_jobs(lote_id, indice, status, tentativas)` consumida por
  pg_cron a cada minuto. Edge Function fica idempotente.

### 5.5 CI/CD

Promover o workflow atual para algo de produção:

```yaml
jobs:
  lint: # já existe
  type-check: # já existe
  format: # já existe
  test: # novo — pnpm test
  build: # novo — pnpm build (Turbo cache no GitHub)
  supabase: # novo — supabase db reset + pgTAP em PR que toca migrations/
  security: # novo — npm audit + trivy + git-secrets
  release-mobile: # Expo EAS Build em push para tag v*
  release-desktop: # Tauri build (Win+Mac) assinado em push para tag v*
  deploy-admin: # Vercel deploy automático (já configurado via vercel.json)
```

Reservar uma chave de API "deploy-bot" no Supabase para aplicar migrations
em produção via `supabase db push --linked` no CI (após approval manual).

---

## 6. Roteiro de Distribuição

| Canal         | Estado | Ação                                                                                                                                                                                           |
| ------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tauri Windows | ❌     | Comprar certificado EV (DigiCert ~ US$ 400/ano), assinar, configurar `tauri-plugin-updater` apontando para `https://updates.contabhub.com/{app}/{target}/{version}` (servir do bucket público) |
| Tauri macOS   | ❌     | Apple Developer ID (US$ 99/ano), notarização automática via `tauri-action`                                                                                                                     |
| Android       | ❌     | Conta Google Play (US$ 25 vitalício), EAS build, internal testing → closed → production                                                                                                        |
| iOS           | ❌     | Apple Developer ID, EAS submit, TestFlight                                                                                                                                                     |
| Admin (web)   | 🟡     | `vercel.json` existe; falta `vercel link` + secrets                                                                                                                                            |
| Landing       | ❌     | Framer/estático — **apenas marketing, desacoplado** (sem signup público)                                                                                                                       |

---

## 7. Riscos Atualizados

| Risco                                       | Probabilidade | Impacto | Mitigação                                                             |
| ------------------------------------------- | ------------- | ------- | --------------------------------------------------------------------- |
| PDF de algum software não parseia           | Alta          | Alto    | Coletar amostras na Fase 8 do ROADMAP; modo `--dry-run`               |
| Webhook do Stripe chega duas vezes          | Média         | Médio   | Tabela `webhook_eventos` com `UNIQUE (gateway, event_id)`             |
| Service role key vazada                     | Baixa         | Crítico | Rotação trimestral; service key só em Edge Function (nunca no client) |
| RLS configurado errado em migration nova    | Média         | Crítico | pgTAP rodando em CI antes de merge                                    |
| Edge Function process-lote timeout          | Média         | Alto    | Migrar para fila (Fase 2.1)                                           |
| Contabilidade reclamar de UX                | Alta          | Médio   | Beta com 2-3 contabilidades reais antes do go-live                    |
| Funcionário não consegue logar (CPF errado) | Alta          | Médio   | Mensagem clara + reset via empresa; suporte WhatsApp                  |
| LGPD: vazamento de CPF                      | Baixa         | Crítico | CPF é hash; logs sem PII; HTTPS em tudo; pen test antes do GA         |

---

## 8. Cronograma Recomendado (a partir de "hoje")

Considerando dedicação principal de 1 desenvolvedor sênior:

| Semana | Foco                                                       | Saída                                   |
| ------ | ---------------------------------------------------------- | --------------------------------------- |
| 1      | Corrigir B1–B4; ligar Sentry; iniciar coleta de PDFs reais | Bugfix release v0.1.1 + observabilidade |
| 2      | Fase 2.1 (PDF engine + fila)                               | Lotes reais processando em staging      |
| 3      | Fase 5.1 (mobile + Autentique)                             | App mobile assinando documentos         |
| 4      | Fase 6 (schema + Stripe test mode + Checkout/Portal)       | Trial → assinatura ativa em test mode   |
| 5      | Fase 6 (webhook + bloqueio por status) + Fase 4.1          | App empresa completo + billing E2E      |
| 6      | Fase 7.1 + 7.2 (admin + provisionamento fechado)           | SaaS pronto para receber tenants reais  |
| 7      | LGPD + segurança + testes (E2E + pgTAP) + landing          | Pen test interno + termos publicados    |
| 8      | Beta fechado com 2-3 contabilidades (FASE 8 do ROADMAP)    | Feedback consolidado + ajustes finais   |
| 9      | Hardening + go-live (FASE 9)                               | **MVP em produção**                     |

Margens de 20 % por semana já consideradas. Datas de calendário podem
deslizar 1–2 semanas se algum software contábil exigir parser específico
ou se a homologação Apple/Google for lenta.

---

## 9. Definition of Done — Produto

O MVP é considerado pronto quando, num ambiente de produção isolado:

1. Um novo tenant consegue se cadastrar pela landing, baixar o desktop
   assinado, instalar no Windows, importar 1 empresa + 10 funcionários via
   Excel e fazer upload de um lote real (PDF do software contábil dele).
2. Cada funcionário recebe push, abre o app, lê o doc e assina via
   Autentique.
3. A contabilidade vê em tempo real (Realtime) a chegada das leituras e
   assinaturas no app desktop e na exportação CSV.
4. O trial de 30 dias termina; o Stripe cobra automaticamente; o
   tenant continua usando sem interrupção; em caso de não pagamento, o
   Stripe reprocessa (Smart Retries) e, persistindo, o webhook bloqueia o
   acesso após o grace period.
5. O admin SaaS mostra MRR atualizado e logs de Edge Function
   permitindo diagnóstico em < 5 min.
6. Pen test interno sem findings críticos (sem cross-tenant leak; sem
   service-key no client; sem CPF em log).
7. Backup automático e restore documentado e testado em staging.

---

## 10. Próximos Passos Imediatos (este sprint)

> Lista pronta para virar issues no GitHub.

1. **fix(mobile):** corrigir referência `expo_tokens` → `expo_push_tokens`
   em `apps/mobile/src/hooks/useNotifications.ts:58`.
2. **fix(process-lote):** remover insert de `eventos_documento{tipo:'visualizado'}`
   em `supabase/functions/process-lote/index.ts:310-316`.
3. **fix(auth-funcionario):** filtrar `auth_codes` por `funcionario_id`
   resolvido por `(empresa_id, cpf)` na etapa `confirm` (B3).
4. **feat(process-lote):** validar JWT do caller e conferir `tenant_id`
   contra `lote.tenant_id` (B4).
5. **chore(db):** migration 0013 — `CREATE INDEX
idx_eventos_doc_tipo_data ON eventos_documento (documento_id, tipo,
created_at DESC);` + trigger `updated_at` em tabelas-chave.
6. **chore(db):** migration 0014 — job pg_cron `DELETE FROM auth_codes
WHERE expires_at < now() - interval '7 days'` (executar diariamente).
7. **chore(obs):** instalar Sentry nos 4 apps + Edge Functions; documentar
   DSNs no `.env.example`.
8. **docs:** publicar este `IMPLEMENTATION_PLAN.md` como fonte da verdade
   do projeto; ROADMAP.md passa a referenciá-lo.

---

_Documento vivo. Atualizar sempre que uma fase mudar de status, um bug for
fechado ou uma decisão arquitetural for revisada. Última atualização:
maio/2026._
