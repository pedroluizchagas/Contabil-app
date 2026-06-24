# 🛠️ Operação & Runbook — ContaHub

> Guia operacional: ambientes, acesso, migrations, deploy de edge functions, segredos e os
> "gotchas" reais do projeto. _Última atualização: Junho de 2026._

## 1. Ambientes

| Recurso       | Detalhe                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase**  | Projeto único `bybkvipmwckemyftqoda` ("markin-punheteiro"), região São Paulo, **gerenciado pela integração Vercel** (org `vercel_icfg_…`).   |
| **Apps**      | Todos (desktop-contabilidade, desktop-empresa, mobile, admin) apontam para esse mesmo projeto. **Não há ambiente dev separado em execução.** |
| **Admin web** | Deploy na Vercel (automático na branch `main`).                                                                                              |

> ⚠️ Como é projeto único, mudanças no banco/funcs afetam o ambiente real. Trate como produção.

## 2. Acesso ao Supabase (importante)

O acesso à **management API** (deploy de functions, migrations via CLI) **depende da conta logada**:

- A conta certa é a que **lista "markin-punheteiro"** em `supabase projects list`.
- Conta errada → **403** ("account does not have the necessary privileges"). Se aparecer 403,
  rode `supabase login` com a conta correta.
- O token do `supabase login` pode **expirar** (vira 401 no CLI) — basta relogar. Não afeta a CI.

## 3. Variáveis de ambiente

`.env` na raiz (gitignored) — escrito pela integração Vercel + segredos. Principais:

```env
# Supabase
SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
POSTGRES_URL_NON_POOLING   # conexão direta (porta 5432) — usada p/ migrations
SUPABASE_ACCESS_TOKEN      # token de management (deploy/migrations); = secret da CI

# Serviços externos (billing — quando ativar)
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / RESEND_API_KEY / AUTENTIQUE_API_KEY
```

Os apps usam prefixos próprios: `VITE_*` (Tauri), `EXPO_PUBLIC_*` (mobile), `NEXT_PUBLIC_*` (admin),
cada um no seu `.env.local`. Manter `.env.example` atualizado.

## 4. Banco de dados — aplicar migrations

Migrations versionadas em `supabase/migrations/` (`<timestamp>_nome.sql`).

```bash
# Caminho recomendado: conexão DIRETA, contornando a management API
DBURL=$(grep -E '^POSTGRES_URL_NON_POOLING=' .env | sed -E 's/^POSTGRES_URL_NON_POOLING=//; s/^"//; s/"$//')
supabase db push --db-url "$DBURL"            # ou --dry-run para conferir
```

**Gotchas de migration:**

- **`crypt`/search_path:** o `pgcrypto` (e `crypt`) fica no schema **`extensions`**. Funções
  `SECURITY DEFINER` que usam `crypt` precisam de `SET search_path = public, extensions` — só
  `public` quebra com "function crypt does not exist".
- **Colisão de versão:** sempre confira `ls supabase/migrations/` na `main` atualizada antes de criar
  uma migration — `version` é PK de `schema_migrations`; duas com o mesmo timestamp não coexistem.
- **Conexão pg direta (node):** o `.env` usa `sslmode=require`; clientes modernos tratam como
  `verify-full` e rejeitam o cert. Remova o query string da URL e passe `ssl: { rejectUnauthorized: false }`.
- **Billing adiado:** a migration `20260618000002_billing_stripe_e_convites.sql` **não está aplicada
  em produção** (de propósito). Aplicar só ao ativar o billing.

## 5. Edge Functions — deploy

### Automático (recomendado)

O workflow `.github/workflows/supabase-deploy.yml` roda `supabase functions deploy` **no merge para
`main`** que toque `supabase/functions/**` ou `supabase/config.toml`.

- **Requer o secret `SUPABASE_ACCESS_TOKEN`** em _Settings → Secrets and variables → Actions_
  (token de conta com acesso ao projeto — gerar em https://supabase.com/dashboard/account/tokens).
  Sem o secret, o job é pulado com aviso (não falha).

### Manual (quando necessário)

```bash
supabase functions deploy <nome> --project-ref bybkvipmwckemyftqoda
# sem <nome> = deploya todas. Usa o config.toml local p/ o verify_jwt de cada função.
```

> `auth-empresa`/`criar-empresa` usam `verify_jwt = false` (o `custom_access_token_hook` gera JWTs
> que o Edge Runtime rejeita; a verificação é feita internamente via `auth.getUser`). `stripe-webhook`
> também (a autenticidade vem da assinatura do Stripe).

## 6. CI/CD

| Workflow                    | Gatilho                                       | O que faz                                                                                       |
| --------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `CI`                        | PR / push em `main`                           | `pnpm lint` + `pnpm type-check` + `pnpm format:check` (Prettier `**/*.{ts,tsx,js,jsx,json,md}`) |
| `Deploy Supabase Functions` | push em `main` (paths de functions) ou manual | deploy das edge functions                                                                       |

**Padrões:** sem `any` explícito (ESLint), formatação Prettier obrigatória, Conventional Commits.

## 7. Runbook — situações conhecidas

### Contas de teste do seed não logam (GoTrue 500)

O `seed.sql` insere em `auth.users` com colunas de token NULL → `getUserById` retorna
**"Database error loading user"** → login dá "Conta não configurada". Reparo (seguro, idempotente):

```sql
UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token,''),
  recovery_token = COALESCE(recovery_token,''),
  email_change_token_new = COALESCE(email_change_token_new,''),
  email_change = COALESCE(email_change,''),
  email_change_token_current = COALESCE(email_change_token_current,''),
  phone_change = COALESCE(phone_change,''),
  phone_change_token = COALESCE(phone_change_token,''),
  reauthentication_token = COALESCE(reauthentication_token,'')
WHERE confirmation_token IS NULL OR email_change IS NULL; -- etc.
```

> Contas criadas pelo **app** (`auth.admin.createUser`) não têm esse problema. _Idealmente corrigir o
> `seed.sql` para inserir essas colunas como `''`._

### Testar login em produção (sem UI)

```bash
URL=https://bybkvipmwckemyftqoda.supabase.co
ANON=<SUPABASE_ANON_KEY>
curl -s -X POST "$URL/functions/v1/auth-empresa" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d '{"cnpj":"<cnpj>","senha":"<senha>"}'   # 200 + access_token = ok
```

### Ferramentas locais ausentes

`psql`, `deno` e `psycopg` não estão instalados na máquina de dev. Para SQL avulso via Node:
`npm i pg` num diretório temporário e conectar com a `POSTGRES_URL_NON_POOLING` (ver §4).

## 8. Comandos de desenvolvimento

```bash
pnpm install                         # raiz do monorepo
pnpm dev                             # todos os apps
pnpm --filter desktop-contabilidade dev
pnpm --filter admin dev
pnpm lint && pnpm type-check && pnpm format:check
pnpm --filter desktop-contabilidade tauri build
```
