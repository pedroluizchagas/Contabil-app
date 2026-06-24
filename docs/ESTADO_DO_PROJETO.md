# 📊 Estado do Projeto — ContaHub

> **Fonte da verdade do que está implementado e funcionando** (não do que está planejado —
> para planejamento ver [ROADMAP.md](../ROADMAP.md) e [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)).
>
> _Última atualização: Junho de 2026._

## Legenda

| Símbolo | Significado                                                                 |
| ------- | --------------------------------------------------------------------------- |
| ✅      | Implementado e funcionando                                                  |
| 🟡      | Implementado parcialmente / com lacuna conhecida                            |
| ⚪      | Stub / placeholder (UI existe, lógica não)                                  |
| 🔒      | Código pronto, **não operacional em produção** (depende de provisionamento) |

> ⚠️ **Distinção importante:** "implementado no código" ≠ "operacional em produção".
> O módulo de **Billing/Onboarding** está completo no código, mas a migration de billing
> ainda **não foi aplicada no banco de produção** e o Stripe **não está configurado** —
> portanto está marcado 🔒. Ver [Billing & Onboarding](#billing--onboarding).

---

## 1. Resumo executivo

O ContaHub é um SaaS multi-tenant (Supabase + RLS) onde contabilidades enviam holerites e
recibos de férias, individualizados e rastreáveis, para os funcionários das empresas clientes.
O **núcleo do produto está implementado e funcionando em produção**: os três perfis de usuário
fazem login, contabilidades cadastram empresas/funcionários, fazem upload de um PDF em lote que é
**fatiado por funcionário** (engine de split), e os funcionários recebem/visualizam seus documentos
com rastreio de leitura.

| Módulo                        | Código | Operacional em prod                                 |
| ----------------------------- | ------ | --------------------------------------------------- |
| App Contabilidade (desktop)   | ✅     | ✅                                                  |
| App Empresa (desktop)         | ✅     | ✅                                                  |
| App Funcionário (mobile)      | ✅     | ✅                                                  |
| Admin SaaS (web)              | ✅     | 🟡 (depende de billing p/ Convites/Provisionamento) |
| Backend / Edge Functions      | ✅     | ✅ (auth, lotes) / 🔒 (billing)                     |
| Banco de dados + RLS          | ✅     | ✅ (exceto migration de billing, adiada)            |
| Billing & Onboarding (Stripe) | ✅     | 🔒 não provisionado                                 |

---

## 2. App Contabilidade — `apps/desktop-contabilidade` (Tauri + React)

Aplicativo desktop do contador. Auth via Supabase (e-mail + senha), `tenant_id` no JWT.

| Funcionalidade                              | Status | Observação                                                       |
| ------------------------------------------- | :----: | ---------------------------------------------------------------- |
| Login (e-mail/senha)                        |   ✅   | Sessão persistida; claims de `tenant_id`                         |
| Dashboard (KPIs + gráfico + lotes recentes) |   🟡   | Funciona; sem realtime (refresh manual)                          |
| Empresas — listar/buscar/ativar             |   ✅   | Toggle ativo/inativo inline                                      |
| Empresas — criar/editar                     |   ✅   | Criação via edge `criar-empresa` (tenant_id do JWT)              |
| Funcionários — listar/buscar/ativar         |   ✅   |                                                                  |
| Funcionários — criar/editar                 |   ✅   | Via edge `criar-funcionario`                                     |
| Funcionários — importação Excel (.xlsx)     |   🟡   | Preview + validação por linha; sem feedback por linha pós-import |
| Lotes — upload de PDF + processamento       |   ✅   | Realtime de progresso (`aguardando→processando→concluído`)       |
| Lotes — listar/filtrar                      |   ✅   | Filtro por empresa e status                                      |
| Lotes — detalhes (status por documento)     |   ✅   | Lê a view `v_status_documentos`; abre PDF via signed URL         |
| Documentos — listar/filtrar/ver PDF         |   ✅   | Signed URLs (60s)                                                |
| Configurações — perfil + trocar senha       |   ✅   | Gerenciar plano é stub ⚪                                        |

**Stack:** React 18 + React Router 6 + Tailwind + UI própria (`@contabhub/ui`); Tauri 2 (wrapper
fino — plugins de updater/dialog/fs inicializados mas ainda não usados).

---

## 3. App Empresa — `apps/desktop-empresa` (Tauri + React)

Aplicativo desktop da empresa cliente. Auth via **CNPJ + senha** (edge `auth-empresa`).

| Funcionalidade                           | Status | Observação                                                          |
| ---------------------------------------- | :----: | ------------------------------------------------------------------- |
| Login (CNPJ + senha)                     |   ✅   | Edge `auth-empresa` → RPC `verificar_senha_empresa` (pgcrypto)      |
| Dashboard (KPIs de leitura/assinatura)   |   ✅   | Lê `funcionarios` + `v_status_documentos`                           |
| Documentos (listar/filtrar/ver PDF)      |   ✅   | Read-only; signed URLs (120s)                                       |
| Funcionários (roster + contagem de docs) |   ✅   | Read-only                                                           |
| Conta — dados da empresa (read-only)     |   ✅   |                                                                     |
| Conta — atualizar e-mail                 |   ✅   | `auth.updateUser`                                                   |
| Conta — trocar senha                     |   ✅   | Edge `alterar-senha-empresa` → RPC `verificar_senha_empresa_por_id` |

**Stack:** React 18 + Tailwind + `@contabhub/ui`; Tauri 2.

---

## 4. App Funcionário — `apps/mobile` (Expo + React Native)

Aplicativo mobile do funcionário. Auth em 2 etapas (CPF + data de nascimento → OTP por e-mail).

| Funcionalidade                                     | Status | Observação                                                        |
| -------------------------------------------------- | :----: | ----------------------------------------------------------------- |
| Login etapa 1 (CNPJ + CPF + nascimento → OTP)      |   ✅   | Edge `buscar-empresa` + `auth-funcionario` (step `verify`)        |
| Login etapa 2 (código OTP → sessão)                |   ✅   | Edge `auth-funcionario` (step `confirm`); UX com paste/auto-focus |
| Persistência de sessão / guardas de navegação      |   ✅   | expo-router (auth)/(tabs)                                         |
| Home (pendentes + recentes + resumo do ano)        |   ✅   | Pull-to-refresh                                                   |
| Lista de documentos (filtro/agrupado por mês)      |   ✅   |                                                                   |
| Abrir documento (signed URL) + rastreio de leitura |   ✅   | Insere `eventos_documento` (tipo `visualizado`)                   |
| Perfil + logout                                    |   ✅   |                                                                   |
| Push notifications (registro de token)             |   ✅   | `expo_push_tokens` (multi-dispositivo); canal Android             |

**Stack:** Expo SDK + expo-router + NativeWind. **Assinatura digital de documentos ainda não existe**
(documentos são somente leitura com rastreio; ver [Lacunas](#7-lacunas-conhecidas--dívidas-técnicas)).

---

## 5. Admin SaaS — `apps/admin` (Next.js 14)

Painel do owner. Auth Supabase com checagem de papel `admin` no middleware; usa service role nas
ações sensíveis.

| Funcionalidade                                 | Status | Observação                                                             |
| ---------------------------------------------- | :----: | ---------------------------------------------------------------------- |
| Login + gate de admin                          |   ✅   | Middleware valida `role=admin`                                         |
| Dashboard (MRR, coortes de tenants, atividade) |   ✅   | Server Components                                                      |
| Tenants — listar/buscar/filtrar                |   ✅   | Botão "Novo Tenant" aponta p/ rota inexistente ⚪                      |
| Tenant — detalhe (assinatura, empresas, uso)   |   ✅   | Mostra uso vs. limites do plano                                        |
| Tenant — alterar status                        |   ✅   | Sincroniza `subscriptions`                                             |
| Planos — listar/criar/ativar-desativar         |   ✅   | `stripe_price_id` não editável pela UI 🟡                              |
| Assinaturas — listar/filtrar                   |   ✅   | View-only (sem CRUD manual)                                            |
| Convites (funil de onboarding)                 |   🔒   | Código completo, mas tabela `convites` **não existe no banco de prod** |
| Provisionar tenant (a partir de convite)       |   🔒   | Edge `provisionar-tenant` (Stripe + e-mail); depende de billing        |
| Faturas (UI)                                   |   ⚪   | Tabela `faturas` populada pelo webhook, mas sem tela no admin          |

**Stack:** Next.js 14 (App Router) + Tailwind + `@contabhub/ui`; deploy Vercel.

---

## 6. Backend — Edge Functions & Banco

### 6.1 Edge Functions (Supabase / Deno) — 11 funções, todas implementadas

| Função                  | Status | Papel                                                        |
| ----------------------- | :----: | ------------------------------------------------------------ |
| `auth-empresa`          |   ✅   | Login empresa (CNPJ+senha → sessão). **Deployada v7**        |
| `auth-funcionario`      |   ✅   | Login funcionário OTP em 2 etapas. **Deployada v4**          |
| `alterar-senha-empresa` |   ✅   | Troca de senha da empresa (valida via pgcrypto)              |
| `buscar-empresa`        |   ✅   | Resolve CNPJ → empresa (usado no app mobile)                 |
| `criar-empresa`         |   ✅   | Cria empresa + usuário Auth; `tenant_id` derivado do JWT     |
| `criar-funcionario`     |   ✅   | Cria funcionário + usuário Auth; hash de CPF/nascimento      |
| `process-lote`          |   ✅   | **Engine de split de PDF** (ver abaixo)                      |
| `provisionar-tenant`    |   🔒   | Cria tenant + Customer/Subscription Stripe + e-mail (Resend) |
| `stripe-portal`         |   🔒   | Sessão do Stripe Customer Portal                             |
| `stripe-webhook`        |   🔒   | Sincroniza assinaturas/faturas a partir de eventos Stripe    |
| `_shared`               |   ✅   | Utilitários (CORS, cliente Stripe, e-mail/Resend)            |

**`process-lote` (split de PDF) — ✅ implementado:**

- Parsing **por texto** (pdf-lib + descompressão FlateDecode/zlib; lê operadores `BT/ET`, `Tj/TJ`).
- Associação página→funcionário por **código** (`CÓDIGO/MATRÍCULA: <code>`), com **fallback** para
  "N páginas fixas por funcionário".
- Modo **dry-run** (preview do casamento sem persistir).
- Gera PDF individual → upload no bucket `documentos` → cria `documentos` + dispara **push** (Expo),
  desativando tokens inválidos; atualiza contadores do `lote`.
- _Sem OCR (PDFs escaneados não são suportados — decisão de MVP)._

### 6.2 Banco de dados — 17 migrations, RLS ativo

**Tabelas:** `tenants`, `planos`, `subscriptions`, `empresas`, `funcionarios`, `documentos`,
`eventos_documento`, `lotes`, `auth_codes`, `expo_push_tokens`, `v_status_documentos` (view).
**Billing (migration adiada):** `webhook_eventos`, `faturas`, `convites` + colunas Stripe.

- **Isolamento multi-tenant:** `tenant_id` + RLS; claims `tenant_id`/`user_role`/`empresa_id`/
  `funcionario_id` injetados pelo `custom_access_token_hook`.
- **Segurança:** CPF, data de nascimento e senhas **só como hash bcrypt** (pgcrypto); PDFs sem URL
  pública (signed URLs); acessos logados em `eventos_documento`.
- **Funções auxiliares:** `hash_texto`, `verificar_hash`, `verificar_senha_empresa(_por_id)`,
  `verificar_credenciais_funcionario`, `buscar_funcionario_id_por_cpf`, `get_my_tenant_id`,
  `jwt_tenant_id`, `jwt_user_role`, `incrementar_processados/erros_lote`.
- **Buckets:** `lotes` (PDF original) e `documentos` (PDFs individuais), com RLS por tenant/empresa/funcionário.

### 6.3 Packages compartilhados

| Pacote                | Conteúdo                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `@contabhub/ui`       | Design system (React + Tailwind): Button, Input, Card, Badge, StatusBadge…                        |
| `@contabhub/supabase` | Cliente singleton + tipos gerados + wrappers de auth (`loginContabilidade`, `loginEmpresa`, etc.) |
| `@contabhub/shared`   | Formatadores/validadores BR (CNPJ/CPF/moeda/data) + constantes + tipos de domínio                 |

---

## 7. Infraestrutura & Produção

- **Supabase:** projeto único `bybkvipmwckemyftqoda` (região São Paulo), gerenciado pela integração
  Vercel. **Todos os apps apontam para ele** (não há ambiente dev separado em execução).
- **Edge functions deployadas e ativas** (auth-empresa v7, auth-funcionario v4, criar-empresa, etc.).
- **CI (GitHub Actions):**
  - `CI` — lint + type-check + Prettier em todo PR/push.
  - `Deploy Supabase Functions` — **deploy automático** das edge functions no merge para `main`
    (requer secret `SUPABASE_ACCESS_TOKEN`). Fim do deploy manual.
- **Estado do banco de produção (Jun/2026):** schema completo aplicado **exceto a migration de
  billing** (`20260618000002`), adiada de propósito. Histórico `schema_migrations` reconciliado.
- **Logins verificados funcionando em produção** (empresa e funcionário, end-to-end).

Detalhes operacionais (como aplicar migration, deploy, segredos, gotchas) em [OPERACAO.md](./OPERACAO.md).

---

## 8. Billing & Onboarding {#billing--onboarding}

**Modelo:** onboarding **fechado** (invite-only, sem cadastro público) + Stripe (Checkout + Customer
Portal; dunning delegado ao Stripe). Ver [BILLING_E_ONBOARDING.md](./BILLING_E_ONBOARDING.md).

**Status: 🔒 código completo, não operacional em produção.** Falta para ativar:

1. Aplicar a migration `20260618000002_billing_stripe_e_convites.sql` no banco de produção
   (cria `webhook_eventos`, `faturas`, `convites` + colunas Stripe).
2. Configurar o Stripe (chaves, produtos/prices, endpoint do webhook) e preencher `stripe_price_id`
   nos planos.
3. Configurar o Resend (e-mails transacionais).

Enquanto isso, a aba **Convites** e o **provisionamento** do Admin não funcionam em prod (dependem da
tabela `convites`), e `stripe-webhook`/`stripe-portal`/`provisionar-tenant` ficam inertes.

---

## 9. Lacunas conhecidas & dívidas técnicas

- **Assinatura digital** dos documentos (Autentique) — não implementada; hoje há só leitura + rastreio.
- **Dashboard (contabilidade):** sem realtime (refresh manual).
- **Importação Excel:** sem feedback de erro por linha após o import.
- **Admin:** sem criação manual de tenant (rota `/tenants/novo` inexistente), `stripe_price_id` não
  editável, sem tela de faturas, sem audit log de ações do admin.
- **Seed:** `seed.sql` insere contas em `auth.users` com colunas de token NULL → o GoTrue não as
  carrega (login dessas contas de teste falha até reparar). Ver [OPERACAO.md](./OPERACAO.md).
- **Tauri:** plugins nativos (updater/dialog/fs) inicializados mas não usados; sem auto-update assinado.

---

## 10. Próximos passos sugeridos

1. **Redesign de frontend** (PRs abertos #6 D0/D1 e #5; Fase D2 do app empresa em branch).
2. **Ativar billing** quando for cobrar (passos da seção 8).
3. **Assinatura digital** (Autentique) — maior funcionalidade ainda ausente do fluxo.
4. **Distribuição:** assinar executáveis Tauri (Windows) e publicar mobile (Play/TestFlight).
