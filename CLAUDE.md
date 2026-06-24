# CLAUDE.md — ContaHub (Contabil-app)

> Guia de referência para assistentes de IA trabalhando neste repositório.
> Atualizar conforme o projeto evolui.

---

## Visão Geral do Projeto

**ContaHub** é um SaaS multi-tenant que permite contabilidades enviarem holerites e recibos de férias de forma automatizada e individualizada para cada funcionário, com assinatura digital e rastreabilidade de leitura.

**Modelo de negócio:** Recorrência mensal por contabilidade (tenant), via Stripe.
**Escala alvo:** 100 a 1.000 contabilidades (tenants).

**Onboarding fechado (invite-only):** **não há cadastro público**. A landing
page é apenas marketing, sem nenhuma conexão com o backend. As contabilidades
são qualificadas e aprovadas manualmente pelo owner, que as provisiona pelo
Admin SaaS (cria o tenant + a assinatura no Stripe). Decisão tomada para
proteger a plataforma e curar quem assina. Ver `docs/BILLING_E_ONBOARDING.md`.

---

## Hierarquia de Dados

```
Contabilidade (tenant)
  └── Empresas (clientes da contabilidade)
        └── Funcionários
              └── Documentos
                    ├── Holerites
                    └── Recibos de Férias
```

---

## Arquitetura Macro

### Estratégia Multi-tenant

- **Shared database** com Row Level Security (RLS) no Supabase
- Toda tabela com dados sensíveis possui `tenant_id` e políticas RLS correspondentes
- JWT customizado com `tenant_id` e `role` no payload

### Módulos do Sistema

| Módulo            | Stack                   | Usuário         | Diretório                     |
| ----------------- | ----------------------- | --------------- | ----------------------------- |
| App Contabilidade | Tauri v2 + React + TS   | Contador        | `apps/desktop-contabilidade/` |
| App Empresa       | Tauri v2 + React + TS   | Empresa cliente | `apps/desktop-empresa/`       |
| App Funcionário   | Expo SDK + React Native | Funcionário     | `apps/mobile/`                |
| Admin SaaS        | Next.js 14              | Owner           | `apps/admin/`                 |

---

## Stack Técnica

### Backend & Dados

| Camada         | Tecnologia              | Função                               |
| -------------- | ----------------------- | ------------------------------------ |
| Banco de dados | Supabase (PostgreSQL)   | Dados relacionais com RLS            |
| Autenticação   | Supabase Auth           | 3 perfis de usuário                  |
| Storage        | Supabase Storage        | PDFs por tenant/empresa/funcionário  |
| Realtime       | Supabase Realtime       | Status de leitura e notificações     |
| Edge Functions | Supabase Edge Functions | Split de PDF, webhooks, notificações |

### Frontend

| App                   | Stack                                    | Alvo                         |
| --------------------- | ---------------------------------------- | ---------------------------- |
| Desktop Contabilidade | Tauri v2 + React + TypeScript + Tailwind | Windows (prioritário), macOS |
| Desktop Empresa       | Tauri v2 + React + TypeScript + Tailwind | Windows (prioritário), macOS |
| Mobile Funcionário    | Expo SDK + React Native + NativeWind     | Android (prioritário), iOS   |
| Admin Web             | Next.js 14 + Vercel                      | Web                          |

### Design System

- **Shadcn/ui** como base de componentes (apps Tauri e admin web)
- **Tailwind CSS** para estilização
- **NativeWind** para o app mobile (Tailwind para React Native)
- Design system compartilhado em `packages/ui/`
- **Marca:** verde `#7DC82E` (`brand`) + tokens `ink` + fonte DM Sans. A
  referência é o `desktop-contabilidade`. A unificação do design entre todos os
  apps (via pacote compartilhado) e a geração dos instaláveis estão planejadas
  em `docs/FRONTEND_E_DISTRIBUICAO.md`.

### Serviços Externos

| Serviço                 | Função                                          |
| ----------------------- | ----------------------------------------------- |
| Autentique              | Assinatura digital com validade jurídica        |
| Stripe                  | Billing recorrente (cartão + Pix + boleto, BRL) |
| Resend                  | E-mails transacionais                           |
| Expo Push Notifications | Notificações push mobile                        |
| Sentry                  | Monitoramento de erros                          |

> **Billing via Stripe (modelo hosted):** usamos **Stripe Checkout** (pagamento)
> e **Stripe Customer Portal** (trocar cartão, ver faturas). A cobrança em
> atraso (dunning) é delegada ao Stripe (Smart Retries + e-mails do Stripe);
> nosso `stripe-webhook` apenas reage ao status para liberar/bloquear o tenant.

---

## Estrutura do Monorepo

```
/
├── apps/
│   ├── desktop-contabilidade/   ← Tauri v2 + React (para contadores)
│   ├── desktop-empresa/         ← Tauri v2 + React (para empresas clientes)
│   ├── mobile/                  ← Expo + React Native (para funcionários)
│   └── admin/                   ← Next.js 14 (painel owner)
├── packages/
│   ├── ui/                      ← Design system compartilhado (shadcn/ui base)
│   ├── supabase/                ← Cliente Supabase + types gerados
│   └── shared/                  ← Lógica de negócio compartilhada
├── supabase/
│   ├── migrations/              ← Migrations SQL versionadas
│   └── functions/               ← Edge Functions (Deno)
├── docs/                        ← Documentação adicional
├── .env.example                 ← Template de variáveis de ambiente
├── pnpm-workspace.yaml
├── turbo.json
└── CLAUDE.md                    ← Este arquivo
```

---

## Banco de Dados

### Schema Principal

```sql
-- Tenants (Contabilidades)
tenants (id, nome, cnpj, email, plano, status, stripe_customer_id, created_at)

-- Planos e Billing (Stripe)
planos (id, nome, preco_mensal, limite_empresas, limite_funcionarios, stripe_price_id)
subscriptions (id, tenant_id, plano_id, status, proximo_vencimento, stripe_subscription_id)
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'  (alinhado ao Stripe)

-- Funil de onboarding (CRM leve — invite-only)
convites (id, nome, cnpj, email, plano_id, status, notas, created_at)
  status: 'lead' | 'contatado' | 'aprovado' | 'ativo' | 'recusado'

-- Idempotência de webhooks (Stripe / Autentique)
webhook_eventos (id, gateway, event_id, tipo, payload, processado_em, created_at)
  UNIQUE (gateway, event_id)

-- Faturas (espelho das invoices do Stripe)
faturas (id, tenant_id, subscription_id, stripe_invoice_id, valor, status, vencimento, paga_em, created_at)

-- Empresas (clientes da contabilidade)
empresas (id, tenant_id, nome, cnpj, senha_hash, email, ativo, created_at)

-- Funcionários
funcionarios (id, empresa_id, tenant_id, nome, cpf_hash, data_nascimento_hash, codigo, email, ativo)

-- Documentos
documentos (id, funcionario_id, empresa_id, tenant_id, tipo, mes_referencia, ano_referencia, storage_path, status_envio, created_at)
  tipo: 'holerite' | 'ferias'

-- Eventos de leitura/assinatura
eventos_documento (id, documento_id, funcionario_id, tipo, ip, user_agent, created_at)
  tipo: 'visualizado' | 'assinado'

-- Lotes de upload
lotes (id, tenant_id, empresa_id, storage_path_original, total_documentos, processados, erros, status, created_at)
```

### Políticas RLS

Toda tabela com `tenant_id` deve ter policy de isolamento:

```sql
CREATE POLICY "tenant_isolation" ON <tabela>
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### Convenções de Banco de Dados

- Sempre usar `snake_case` para nomes de tabelas e colunas
- Toda tabela deve ter `id` (UUID) e `created_at` (timestamptz)
- CPF e data de nascimento NUNCA em texto puro — sempre hash (bcrypt ou argon2)
- Índices obrigatórios em: `cpf_hash`, `cnpj`, `tenant_id`, `empresa_id`
- Migrations versionadas em `supabase/migrations/` com prefixo de timestamp

---

## Fluxos de Autenticação

| Perfil        | Credenciais                                  | Mecanismo                                 |
| ------------- | -------------------------------------------- | ----------------------------------------- |
| Contabilidade | E-mail + senha                               | Supabase Auth padrão                      |
| Empresa       | CNPJ + senha                                 | Supabase Auth com campo customizado       |
| Funcionário   | CPF + data de nascimento + código por e-mail | Supabase Auth com verificação em 2 etapas |

O JWT deve conter `tenant_id` e `role` no payload para que o RLS funcione corretamente.

> **Sem signup público:** `enable_signup = false` no Supabase Auth. O usuário do
> contador é criado pelo Admin no provisionamento (service role) e recebe um
> link para definir a senha (convite por e-mail via Resend). Empresa e
> funcionário já têm logins customizados.

---

## Edge Functions (Supabase / Deno)

### `process-lote`

Função principal responsável pelo split de PDF:

1. Recebe `lote_id` via webhook após upload no Storage
2. Lê o PDF original do Storage
3. Identifica blocos por funcionário (nome + código)
4. Gera PDF individual por funcionário
5. Salva em `/tenants/{tenant_id}/empresas/{empresa_id}/funcionarios/{func_id}/{doc_id}.pdf`
6. Cria registros em `documentos` e `eventos_documento`
7. Dispara notificações push via Expo
8. Atualiza o `lote` com totais e status

**Estratégia de parsing de PDF:**

- Preferir parsing por texto (PDFs gerados digitalmente)
- Evitar OCR no MVP (complexidade alta)
- Testar com PDFs reais de: Domínio, Alterdata, Questor (coletar amostras antes de implementar)

### Billing e Onboarding (Stripe)

- `stripe-webhook` — recebe eventos do Stripe, valida a assinatura
  (`Stripe-Signature`), garante idempotência (`webhook_eventos.event_id`) e
  sincroniza `subscriptions`/`faturas` + o status do tenant.
- `provisionar-tenant` — **ação do Admin** (não pública): cria `tenants` +
  usuário do contador + `Customer`/`Subscription` no Stripe (com trial) e
  dispara o e-mail de boas-vindas (Resend).
- `stripe-portal` — gera uma sessão do Stripe Customer Portal para o contador
  gerenciar pagamento/faturas.
- `enviar-email` — wrapper sobre o Resend (templates transacionais).

Detalhes completos em `docs/BILLING_E_ONBOARDING.md`.

---

## Convenções de Código

### Geral

- **TypeScript** em todo o projeto — sem `any` explícito
- **ESLint + Prettier** configurados na raiz do monorepo
- Imports absolutos usando path aliases (`@/`, `@contabhub/ui`, etc.)
- Nomes em inglês para código; português para comentários e mensagens de UI
- Commits seguem Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, etc.

### React / Frontend

- Componentes como funções (sem classes)
- Props tipadas com `interface` (não `type` para props de componente)
- Hooks customizados em `hooks/` com prefixo `use`
- Separar lógica de negócio de componentes de UI
- Estado do servidor via Supabase client; estado local via `useState`/`useReducer`

### Tauri (apps desktop)

- Comandos Rust em `src-tauri/src/` apenas para operações nativas necessárias
- Preferir chamar Supabase direto do frontend React quando possível
- Auto-updater configurado para Windows e macOS

### React Native / Expo

- Usar NativeWind para estilos (sintaxe Tailwind)
- Navegação via Expo Router
- Notificações push via `expo-notifications` + token registrado no Supabase

### Supabase Client

- Cliente singleton em `packages/supabase/`
- Types gerados automaticamente via `supabase gen types typescript`
- Sempre verificar erros retornados (`.error`) antes de usar `.data`
- Usar Supabase Realtime para atualizações em tempo real (ex: status de lote)

---

## Segurança e LGPD

- **CPF e data de nascimento** armazenados como hash — nunca em texto puro
- **PDFs** com path estruturado por tenant, sem URLs públicas diretas
- **RLS** ativo em todas as tabelas com dados de tenant
- **Logs de acesso** a documentos registrados em `eventos_documento`
- **Política de retenção** de dados deve ser definida antes do lançamento
- **Termo de consentimento** no primeiro login do funcionário
- **Direito ao esquecimento** — implementar endpoint de exclusão de dados

---

## Variáveis de Ambiente

Criar `.env` local baseado em `.env.example`. As variáveis principais são:

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Supabase local (dev)
SUPABASE_LOCAL_URL=http://localhost:54321

# Serviços externos
AUTENTIQUE_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=

# Admin (Next.js)
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

Nunca commitar arquivos `.env` com valores reais. O `.env.example` deve sempre estar atualizado.

---

## Comandos de Desenvolvimento

```bash
# Instalar dependências (raiz do monorepo)
pnpm install

# Rodar todos os apps em paralelo
pnpm dev

# Rodar app específico
pnpm --filter desktop-contabilidade dev
pnpm --filter desktop-empresa dev
pnpm --filter mobile dev
pnpm --filter admin dev

# Type-check em todo o monorepo
pnpm type-check

# Lint em todo o monorepo
pnpm lint

# Supabase local
supabase start
supabase db reset          # Aplica migrations + seed
supabase gen types typescript --local > packages/supabase/types.ts

# Build apps desktop
pnpm --filter desktop-contabilidade tauri build

# Build app mobile
pnpm --filter mobile expo build
```

---

## CI/CD

- **GitHub Actions** roda em todo PR: lint + type-check
- Builds de produção dos apps desktop são assinados antes da distribuição
- App Android publicado na Google Play; iOS via TestFlight
- Admin web via Vercel (deploy automático na branch `main`)
- Supabase prod é projeto separado do dev — nunca usar service role key do prod localmente

---

## Fases do Projeto (Status)

| Fase | Descrição                     | Status   |
| ---- | ----------------------------- | -------- |
| 0    | Fundação do Monorepo          | Pendente |
| 1    | Banco de Dados e Auth         | Pendente |
| 2    | Engine de Split de PDF        | Pendente |
| 3    | App Desktop: Contabilidade    | Pendente |
| 4    | App Desktop: Empresa          | Pendente |
| 5    | App Mobile: Funcionário       | Pendente |
| 6    | Billing e Planos              | Pendente |
| 7    | Admin SaaS                    | Pendente |
| 8    | Beta com Contabilidades Reais | Pendente |
| 9    | Lançamento MVP                | Pendente |

Consultar `ROADMAP.md` para detalhamento completo de cada fase.

---

## Principais Riscos Técnicos

1. **Parsing de PDF** — Formatos variam por software contábil (Domínio, Alterdata, Questor). Coletar amostras reais antes de implementar o parser.
2. **Instalação Tauri em Windows corporativo** — Assinar executáveis cedo; testar em máquinas reais.
3. **RLS mal configurado** — Sempre testar isolamento de tenant com usuários de tenants diferentes antes de subir para produção.
4. **CPF/dados sensíveis** — Nunca logar, nunca expor em URLs, nunca armazenar sem hash.

---

_Última atualização: Março 2026_
