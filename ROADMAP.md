# 🗺️ ROADMAP — SaaS Multi-tenant para Contabilidades

> Documento vivo. Atualizar conforme decisões forem tomadas durante o desenvolvimento.

---

## 🧭 Visão Geral do Projeto

**Nome provisório:** ContaHub *(renomear conforme identidade definida)*

**Proposta de valor:** Plataforma que permite contabilidades enviarem holerites e recibos de férias de forma automatizada e individualizada para cada funcionário, com assinatura digital e rastreabilidade de leitura.

**Modelo de negócio:** SaaS multi-tenant com recorrência mensal por contabilidade (tenant).

**Escala alvo:** 100 a 1.000 contabilidades (tenants).

---

## 🏗️ Arquitetura Macro

### Hierarquia de dados

```
Contabilidade (tenant)
  └── Empresas (clientes da contabilidade)
        └── Funcionários
              └── Documentos
                    ├── Holerites
                    └── Recibos de Férias
```

### Isolamento multi-tenant

- **Estratégia:** Shared database com Row Level Security (RLS) no Supabase
- **Justificativa:** Escala de até 1.000 tenants não justifica schemas separados; RLS resolve o isolamento com custo e complexidade mínimos

### Módulos do sistema

| Módulo            | Tipo                         | Usuário         |
|-------------------|------------------------------|-----------------|
| App Contabilidade | Desktop (Tauri + React)      | Contador        |
| App Empresa       | Desktop (Tauri + React)      | Empresa cliente |
| App Funcionário   | Mobile (Expo + React Native) | Funcionário     |
| Admin SaaS        | Web (Next.js + Vercel)       | Você (owner)    |

---

## 🗄️ Stack Técnica

### Backend & Dados

| Camada         | Tecnologia              | Função                               |
|----------------|-------------------------|--------------------------------------|
| Banco de dados | Supabase (PostgreSQL)   | Dados relacionais com RLS            |
| Autenticação   | Supabase Auth           | 3 perfis de usuário                  |
| Storage        | Supabase Storage        | PDFs por tenant/empresa/funcionário  |
| Realtime       | Supabase Realtime       | Status de leitura e notificações     |
| Edge Functions | Supabase Edge Functions | Split de PDF, webhooks, notificações |

### Frontend

| App                   | Stack                         | Alvo                        |
|-----------------------|-------------------------------|-----------------------------|
| Desktop Contabilidade | Tauri v2 + React + TypeScript | Windows (prioritário), macOS|
| Desktop Empresa       | Tauri v2 + React + TypeScript | Windows (prioritário), macOS|
| Mobile Funcionário    | Expo SDK + React Native       | Android (prioritário), iOS  |
| Admin Web             | Next.js 14 + Vercel           | Web                         |

### Design System

- Shadcn/ui como base de componentes
- Tailwind CSS para estilização
- Design system compartilhado entre os apps Tauri e o admin web

### Serviços Externos

| Serviço                 | Função                                    | Quando integrar |
|-------------------------|-------------------------------------------|-----------------|
| Autentique              | Assinatura digital com validade jurídica  | MVP             |
| Pagar.me                | Billing recorrente (PIX + boleto + cartão)| MVP             |
| Resend                  | E-mails transacionais                     | MVP             |
| Expo Push Notifications | Notificações push mobile                  | MVP             |

---

## 🗃️ Modelagem do Banco de Dados

### Tabelas principais

```sql
-- Tenants (Contabilidades)
tenants
  id, nome, cnpj, email, plano, status, created_at

-- Planos e Billing
planos
  id, nome, preco_mensal, limite_empresas, limite_funcionarios

subscriptions
  id, tenant_id, plano_id, status, proximo_vencimento, gateway_id

-- Empresas (clientes da contabilidade)
empresas
  id, tenant_id, nome, cnpj, senha_hash, email, ativo, created_at

-- Funcionários
funcionarios
  id, empresa_id, tenant_id, nome, cpf_hash, data_nascimento_hash, codigo, email, ativo

-- Documentos
documentos
  id, funcionario_id, empresa_id, tenant_id, tipo (holerite|ferias),
  mes_referencia, ano_referencia, storage_path, status_envio, created_at

-- Leitura e assinatura
eventos_documento
  id, documento_id, funcionario_id, tipo (visualizado|assinado),
  ip, user_agent, created_at

-- Lotes de upload (arquivo original da contabilidade)
lotes
  id, tenant_id, empresa_id, storage_path_original, total_documentos,
  processados, erros, status, created_at
```

### Políticas RLS (Row Level Security)

Toda tabela com `tenant_id` terá política:

```sql
-- Exemplo para tabela empresas
CREATE POLICY "tenant_isolation" ON empresas
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

---

## 📋 Fases de Desenvolvimento

---

### FASE 0 — Fundação do Projeto ✅

**Objetivo:** Monorepo configurado, ambientes prontos, CI/CD básico

#### Tarefas

- [x] Estrutura do monorepo (`apps/`, `packages/`, `supabase/`, `docs/`)
- [x] Setup Turborepo + pnpm workspaces
- [x] Setup ESLint + Prettier + TypeScript base configs compartilhados
- [x] Variáveis de ambiente documentadas (`.env.example`)
- [x] GitHub Actions: lint + type-check + format-check em PRs
- [x] `CLAUDE.md` para assistentes de IA
- [ ] Setup Supabase projeto (dev + prod)
- [ ] Setup Supabase CLI com migrations
- [ ] Configurar Supabase localmente para desenvolvimento

#### Entregável

Monorepo funcionando com `pnpm dev` subindo todos os apps simultaneamente.

---

### FASE 1 — Banco de Dados e Autenticação

**Estimativa:** 1 semana
**Objetivo:** Schema completo no Supabase com RLS e autenticação dos 3 perfis

#### Tarefas

- [ ] Migration: todas as tabelas principais
- [ ] Migration: políticas RLS por tenant_id
- [ ] Migration: índices de performance (cpf_hash, cnpj, tenant_id)
- [ ] Gerar types TypeScript do Supabase (`supabase gen types`)
- [ ] Auth: fluxo de login da Contabilidade (email + senha)
- [ ] Auth: fluxo de login da Empresa (CNPJ + senha)
- [ ] Auth: fluxo de login do Funcionário (CPF + data de nascimento)
  - Validação: CPF + data de nascimento com código de 6 dígitos por e-mail
- [ ] Auth: JWT customizado com `tenant_id` e `role` no payload
- [ ] Seed de dados de desenvolvimento

#### Entregável

Supabase com schema completo, RLS ativo e autenticação dos 3 perfis funcionando via Supabase Studio.

---

### FASE 2 — Engine de Split de PDF

**Estimativa:** 1,5 semanas
**Objetivo:** Lógica central de leitura, parsing e desmembramento de arquivos

#### Contexto

Esta é a feature mais crítica do sistema. A qualidade do parsing depende do software contábil utilizado. **Conversar com 2-3 contabilidades antes de codar** para entender os formatos reais dos PDFs (Domínio, Alterdata, Questor, etc.).

#### Tarefas

- [ ] Estudar amostras de PDFs reais das contabilidades alvo
- [ ] Definir estratégia de parsing:
  - Opção A: parsing por texto (PDFs gerados digitalmente — preferível)
  - Opção B: OCR (PDFs escaneados — muito mais complexo, evitar no MVP)
- [ ] Edge Function: `process-lote`
  - Recebe `lote_id` via webhook após upload no Storage
  - Lê o PDF original do Storage
  - Identifica blocos por funcionário (nome + código)
  - Gera PDF individual por funcionário
  - Salva em `/tenants/{tenant_id}/empresas/{empresa_id}/funcionarios/{func_id}/{doc_id}.pdf`
  - Cria registro na tabela `documentos` por funcionário
  - Cria registro na tabela `eventos_documento` (status: enviado)
  - Dispara notificação push via Expo
  - Atualiza `lote` com totais e status
- [ ] Tratamento de erros: funcionário não encontrado, PDF corrompido
- [ ] Painel de log do lote no app da contabilidade
- [ ] Testes com PDFs reais de cada software contábil identificado

#### Entregável

Edge Function processando um lote real e gerando documentos individuais no Storage com rastreabilidade.

---

### FASE 3 — App Desktop: Contabilidade

**Estimativa:** 2 semanas
**Objetivo:** App Tauri funcional para o fluxo principal da contabilidade

#### Tarefas

- [ ] Setup Tauri v2 (`src-tauri/`) no app `desktop-contabilidade`
- [ ] Setup Shadcn/ui
- [ ] Tela de Login (email + senha)
- [ ] Dashboard principal
  - Resumo: empresas cadastradas, documentos enviados, pendências
- [ ] Módulo Empresas
  - Listagem com busca e filtros
  - Cadastro de empresa (nome, CNPJ, e-mail)
  - Edição e desativação
- [ ] Módulo Funcionários
  - Listagem por empresa
  - Cadastro individual (nome, CPF, data nascimento, código, e-mail)
  - Importação via planilha Excel (.xlsx)
  - Edição e desativação
- [ ] Módulo Upload de Lotes
  - Seleção de empresa
  - Seleção de tipo (holerite ou férias)
  - Seleção de mês/ano referência
  - Upload do PDF único
  - Acompanhamento do processamento em tempo real (Supabase Realtime)
  - Visualização do log de erros
- [ ] Módulo Documentos
  - Histórico de envios por empresa/funcionário
  - Status de leitura e assinatura por documento
  - Filtros por período, empresa, status
- [ ] Auto-updater do Tauri configurado
- [ ] Build para Windows (prioritário) + macOS

#### Entregável

App funcional para o fluxo completo da contabilidade: cadastrar empresa, cadastrar funcionários, fazer upload, acompanhar envio e visualizar status de leitura.

---

### FASE 4 — App Desktop: Empresa

**Estimativa:** 1,5 semanas
**Objetivo:** App Tauri para as empresas clientes acompanharem seus funcionários

#### Tarefas

- [ ] Setup Tauri v2 (`src-tauri/`) no app `desktop-empresa`
- [ ] Tela de Login (CNPJ + senha)
- [ ] Primeiro acesso: definição de senha
- [ ] Dashboard principal
  - Total de funcionários, documentos recentes, pendências de assinatura
- [ ] Módulo Funcionários
  - Listagem com status de leitura por documento
  - Filtros: visualizado / não visualizado / assinado / não assinado
- [ ] Módulo Documentos
  - Listagem de todos os documentos enviados
  - Visualização do PDF no app
  - Status detalhado por funcionário (visualizado em X, assinado em Y)
- [ ] Notificações in-app quando novos documentos chegam (Supabase Realtime)
- [ ] Auto-updater do Tauri configurado
- [ ] Build para Windows + macOS

#### Entregável

App funcional para empresa acompanhar status de leitura e assinatura de todos os funcionários.

---

### FASE 5 — App Mobile: Funcionário

**Estimativa:** 2 semanas
**Objetivo:** App mobile para funcionários acessarem e assinarem seus documentos

#### Tarefas

- [ ] Fluxo de Login
  - CPF + data de nascimento
  - Verificação via código de 6 dígitos por e-mail (primeiro acesso)
- [ ] Push Notifications (Expo Push + Supabase Realtime)
- [ ] Tela inicial: lista de documentos recentes com status
- [ ] Visualização de documentos
  - Leitor de PDF nativo
  - Registrar evento "visualizado" ao abrir
- [ ] Assinatura digital
  - Integração com API do Autentique
  - Registrar evento "assinado"
- [ ] Histórico completo de documentos
  - Filtros por tipo e período
- [ ] Configurações: atualizar e-mail para notificações
- [ ] Build para Android (prioritário) + iOS
- [ ] Publicação na Google Play (TestFlight para iOS)

#### Entregável

App mobile publicado em ambiente de testes com fluxo completo: login, visualização, notificação push e assinatura digital.

---

### FASE 6 — Billing e Planos

**Estimativa:** 1 semana
**Objetivo:** Cobrança recorrente funcional

#### Tarefas

- [ ] Definição de planos (ex: Básico, Profissional, Enterprise)
  - Diferencial por número de empresas e/ou funcionários
- [ ] Integração Pagar.me
  - Criação de assinatura no cadastro do tenant
  - Webhook: `subscription.paid` → ativar tenant
  - Webhook: `subscription.unpaid` → bloquear acesso (grace period)
  - Webhook: `subscription.canceled` → desativar tenant
- [ ] Tela de planos e upgrade no Admin
- [ ] E-mail automático: cobrança, confirmação de pagamento, inadimplência (Resend)
- [ ] Período de trial (ex: 30 dias gratuitos)

#### Entregável

Tenant criado com trial de 30 dias → cobrança automática iniciada → bloqueio por inadimplência funcionando.

---

### FASE 7 — Admin SaaS (Painel Owner)

**Estimativa:** 1 semana
**Objetivo:** Painel web para você gerenciar todas as contabilidades

#### Tarefas

- [ ] Autenticação owner (e-mail protegido)
- [ ] Dashboard geral
  - MRR, tenants ativos, churn, novos tenants
- [ ] Módulo Tenants
  - Listagem com plano, status, MRR
  - Detalhes: empresas, funcionários, documentos, uso
  - Ações: ativar/desativar, mudar plano, extender trial
- [ ] Módulo Billing
  - Histórico de pagamentos por tenant
  - Inadimplentes
- [ ] Módulo Logs
  - Erros de processamento de lotes
  - Edge Function logs

#### Entregável

Painel web funcional para operar o SaaS: acompanhar tenants, resolver problemas e monitorar receita.

---

### FASE 8 — Onboarding e Testes com Contabilidades Reais

**Estimativa:** 2 semanas
**Objetivo:** Validação com usuários reais antes do lançamento

#### Tarefas

- [ ] Selecionar 2-3 contabilidades para beta fechado
- [ ] Documentação de uso (vídeos curtos + manual PDF)
- [ ] Suporte via WhatsApp Business durante o beta
- [ ] Coletar amostras de PDFs de diferentes softwares contábeis e ajustar o parser
- [ ] Identificar e corrigir bugs de UX e fluxo
- [ ] Testar o fluxo de instalação dos apps desktop em máquinas reais de Windows
- [ ] Testar notificações push em dispositivos Android reais
- [ ] Ajustar performance de queries lentas no Supabase (EXPLAIN ANALYZE)
- [ ] Definir pricing final baseado no feedback

#### Entregável

Sistema validado com pelo menos 1 contabilidade real processando documentos de funcionários reais.

---

### FASE 9 — Lançamento MVP

**Estimativa:** 1 semana
**Objetivo:** Go-live com cobrança ativa

#### Tarefas

- [ ] Migrar Supabase para projeto de produção separado
- [ ] Configurar domínio e SSL
- [ ] Landing page (pode ser Framer inicialmente)
- [ ] Configurar monitoramento (Sentry para erros, Supabase Dashboard para banco)
- [ ] Backup automático do banco configurado
- [ ] Política de privacidade e termos de uso (LGPD)
- [ ] Publicar app Android na Google Play (produção)
- [ ] Distribuir apps desktop via link de download assinado
- [ ] Primeiros tenants pagantes migrados do beta

#### Entregável

**MVP em produção com cobrança ativa.**

---

## ⚠️ Riscos e Mitigações

| Risco                                                           | Probabilidade | Impacto | Mitigação                                           |
|-----------------------------------------------------------------|---------------|---------|-----------------------------------------------------|
| PDFs com formato imprevisível                                   | Alta          | Alto    | Coletar amostras antes de codar o parser            |
| Baixa adesão dos funcionários ao app mobile                     | Média         | Alto    | UX simples, notificação por e-mail como fallback    |
| Problemas de instalação dos apps desktop em Windows corporativo | Média         | Médio   | Testar em máquinas reais cedo, assinar o executável |
| Validade jurídica da assinatura digital                         | Baixa         | Alto    | Usar Autentique desde o MVP (ICP-Brasil)            |
| Escopo crescendo além do MVP                                    | Alta          | Médio   | Congelar escopo do MVP; backlog separado para v2    |

---

## 🔐 Compliance e Segurança (LGPD)

- [ ] CPF armazenado como hash (bcrypt ou argon2) — nunca em texto puro
- [ ] Data de nascimento armazenada como hash
- [ ] PDFs com path estruturado por tenant, sem URLs públicas diretas
- [ ] Logs de acesso a documentos (quem acessou, quando, de onde)
- [ ] Política de retenção de dados definida
- [ ] Termo de consentimento no primeiro login do funcionário
- [ ] Política de privacidade publicada antes do lançamento
- [ ] Processo de exclusão de dados (direito ao esquecimento)

---

## 📌 Backlog Pós-MVP (v2)

Itens intencionalmente fora do MVP para não atrasar o lançamento:

- Integração direta com softwares contábeis via API (Domínio, Questor)
- Relatórios avançados exportáveis para a contabilidade
- App web para funcionários (alternativa ao mobile)
- Multi-idioma
- Suporte a outros tipos de documento (contratos, avisos)
- White-label por contabilidade (logo e cores próprias)
- SSO com Google para a contabilidade
- Notificações por WhatsApp

---

## 📅 Timeline Estimada (MVP)

| Fase                       | Estimativa   | Acumulado      |
|----------------------------|--------------|----------------|
| Fase 0 — Fundação          | 1 semana     | 1 semana       |
| Fase 1 — Banco + Auth      | 1 semana     | 2 semanas      |
| Fase 2 — Engine PDF        | 1,5 semanas  | 3,5 semanas    |
| Fase 3 — App Contabilidade | 2 semanas    | 5,5 semanas    |
| Fase 4 — App Empresa       | 1,5 semanas  | 7 semanas      |
| Fase 5 — App Mobile        | 2 semanas    | 9 semanas      |
| Fase 6 — Billing           | 1 semana     | 10 semanas     |
| Fase 7 — Admin             | 1 semana     | 11 semanas     |
| Fase 8 — Beta e Testes     | 2 semanas    | 13 semanas     |
| Fase 9 — Lançamento        | 1 semana     | **14 semanas** |

> Estimativas para desenvolvimento solo com dedicação principal ao projeto.
> Com time ou dedicação parcial, ajustar proporcionalmente.

---

## 🚀 Próximos Passos Imediatos

1. **Coletar amostras de PDFs** de pelo menos 2 softwares contábeis diferentes
2. **Criar projeto no Supabase** (dev e prod separados)
3. **Iniciar Fase 1** — banco de dados e autenticação
4. **Confirmar nome e identidade visual** do produto

---

*Última atualização: Março 2026*
