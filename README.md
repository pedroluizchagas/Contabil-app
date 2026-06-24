# ContaHub

> SaaS multi-tenant que permite **contabilidades** enviarem holerites e recibos de férias de forma
> automatizada e individualizada para cada **funcionário** das **empresas** clientes — com
> rastreabilidade de leitura e (roadmap) assinatura digital.

**Status:** MVP funcional em produção. Os três perfis de usuário fazem login, o fluxo
contabilidade → upload de lote → split de PDF por funcionário → entrega mobile com rastreio de
leitura está **implementado e funcionando**. Billing (Stripe) está pronto no código, porém ainda
**não provisionado**. Veja o detalhamento em **[docs/ESTADO_DO_PROJETO.md](docs/ESTADO_DO_PROJETO.md)**.

---

## Hierarquia

```
Contabilidade (tenant)
└── Empresas (clientes da contabilidade)
    └── Funcionários
        └── Documentos (holerites / recibos de férias)
```

## Módulos

| Módulo            | Stack                | Usuário         | Diretório                     |
| ----------------- | -------------------- | --------------- | ----------------------------- |
| App Contabilidade | Tauri 2 + React + TS | Contador        | `apps/desktop-contabilidade/` |
| App Empresa       | Tauri 2 + React + TS | Empresa cliente | `apps/desktop-empresa/`       |
| App Funcionário   | Expo + React Native  | Funcionário     | `apps/mobile/`                |
| Admin SaaS        | Next.js 14           | Owner           | `apps/admin/`                 |

**Backend:** Supabase (PostgreSQL + RLS, Auth, Storage, Edge Functions/Deno).
**Externos:** Stripe (billing), Resend (e-mail), Expo Push, Autentique (assinatura — roadmap), Sentry.

## Estrutura do monorepo

```
apps/        desktop-contabilidade · desktop-empresa · mobile · admin
packages/    ui (design system) · supabase (cliente + tipos) · shared (lógica/formatadores)
supabase/    migrations/ (17) · functions/ (11 edge functions) · config.toml · seed.sql
docs/        documentação técnica (ver índice abaixo)
.github/     workflows de CI e de deploy
```

## Desenvolvimento

```bash
pnpm install                 # raiz do monorepo (pnpm 9)
pnpm dev                     # todos os apps em paralelo
pnpm --filter admin dev      # um app específico

pnpm lint && pnpm type-check && pnpm format:check   # checagens do CI

# Supabase
supabase start                                       # stack local (requer Docker)
supabase functions deploy <nome> --project-ref bybkvipmwckemyftqoda
```

> Pré-requisitos: Node 20+, pnpm 9, Rust (para builds Tauri), Supabase CLI. Variáveis em `.env`
> (baseado em `.env.example`).

## Documentação

| Doc                                                          | Conteúdo                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **[docs/ESTADO_DO_PROJETO.md](docs/ESTADO_DO_PROJETO.md)**   | ✅ **O que está implementado e funcionando** (estado real, por módulo) |
| **[docs/OPERACAO.md](docs/OPERACAO.md)**                     | 🛠️ Runbook: ambientes, migrations, deploy, segredos, gotchas           |
| [CLAUDE.md](CLAUDE.md)                                       | Guia de arquitetura e convenções (para humanos e IAs)                  |
| [ROADMAP.md](ROADMAP.md)                                     | Visão, fases de desenvolvimento e backlog                              |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)   | Plano técnico de implementação por fase                                |
| [docs/BILLING_E_ONBOARDING.md](docs/BILLING_E_ONBOARDING.md) | Modelo de cobrança (Stripe) e onboarding fechado                       |

## Segurança & LGPD

CPF, data de nascimento e senhas **apenas como hash** (pgcrypto/bcrypt); PDFs sem URL pública
(signed URLs); **RLS** com isolamento por `tenant_id` em todas as tabelas sensíveis; acessos a
documentos logados em `eventos_documento`.

---

_Projeto privado. Onboarding fechado (invite-only) — não há cadastro público._
