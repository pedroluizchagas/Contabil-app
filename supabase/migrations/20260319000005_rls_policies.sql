-- ============================================================
-- Migration 0005: Row Level Security (RLS)
-- Garante isolamento por tenant e por perfil de usuário.
--
-- Claims customizadas no JWT (via hook na migration 0007):
--   tenant_id    → UUID do tenant (contabilidade)
--   user_role    → 'contabilidade' | 'empresa' | 'funcionario'
--   empresa_id   → UUID da empresa  (apenas para role 'empresa')
--   funcionario_id → UUID do func.  (apenas para role 'funcionario')
-- ============================================================

-- Helper: extrai tenant_id do JWT como uuid
CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$;

-- Helper: extrai user_role do JWT
CREATE OR REPLACE FUNCTION public.jwt_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'user_role';
$$;

-- ============================================================
-- PLANOS (somente leitura para todos autenticados)
-- ============================================================
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planos_leitura_publica" ON planos
  FOR SELECT USING (ativo = true);

-- ============================================================
-- TENANTS
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Contabilidade lê e edita o próprio tenant
CREATE POLICY "tenant_contabilidade_select" ON tenants
  FOR SELECT USING (id = public.jwt_tenant_id());

CREATE POLICY "tenant_contabilidade_update" ON tenants
  FOR UPDATE USING (
    id = public.jwt_tenant_id()
    AND public.jwt_user_role() = 'contabilidade'
  );

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Contabilidade vê a própria subscription
CREATE POLICY "subscription_contabilidade_select" ON subscriptions
  FOR SELECT USING (
    tenant_id = public.jwt_tenant_id()
    AND public.jwt_user_role() = 'contabilidade'
  );

-- ============================================================
-- EMPRESAS
-- ============================================================
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Contabilidade: acesso total às empresas do seu tenant
CREATE POLICY "empresa_contabilidade_all" ON empresas
  FOR ALL USING (
    tenant_id = public.jwt_tenant_id()
    AND public.jwt_user_role() = 'contabilidade'
  );

-- Empresa: lê apenas os próprios dados
CREATE POLICY "empresa_self_select" ON empresas
  FOR SELECT USING (
    id = (auth.jwt() ->> 'empresa_id')::uuid
    AND public.jwt_user_role() = 'empresa'
  );

-- ============================================================
-- FUNCIONÁRIOS
-- ============================================================
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;

-- Contabilidade: acesso total aos funcionários do seu tenant
CREATE POLICY "funcionario_contabilidade_all" ON funcionarios
  FOR ALL USING (
    tenant_id = public.jwt_tenant_id()
    AND public.jwt_user_role() = 'contabilidade'
  );

-- Empresa: lê funcionários da própria empresa
CREATE POLICY "funcionario_empresa_select" ON funcionarios
  FOR SELECT USING (
    empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    AND public.jwt_user_role() = 'empresa'
  );

-- Funcionário: lê apenas os próprios dados
CREATE POLICY "funcionario_self_select" ON funcionarios
  FOR SELECT USING (
    id = (auth.jwt() ->> 'funcionario_id')::uuid
    AND public.jwt_user_role() = 'funcionario'
  );

-- ============================================================
-- DOCUMENTOS
-- ============================================================
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Contabilidade: acesso total
CREATE POLICY "documento_contabilidade_all" ON documentos
  FOR ALL USING (
    tenant_id = public.jwt_tenant_id()
    AND public.jwt_user_role() = 'contabilidade'
  );

-- Empresa: lê documentos da sua empresa
CREATE POLICY "documento_empresa_select" ON documentos
  FOR SELECT USING (
    empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    AND public.jwt_user_role() = 'empresa'
  );

-- Funcionário: lê apenas os próprios documentos
CREATE POLICY "documento_funcionario_select" ON documentos
  FOR SELECT USING (
    funcionario_id = (auth.jwt() ->> 'funcionario_id')::uuid
    AND public.jwt_user_role() = 'funcionario'
  );

-- ============================================================
-- EVENTOS_DOCUMENTO
-- ============================================================
ALTER TABLE eventos_documento ENABLE ROW LEVEL SECURITY;

-- Contabilidade: lê todos os eventos do seu tenant
CREATE POLICY "evento_contabilidade_select" ON eventos_documento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documentos d
      WHERE d.id = documento_id
        AND d.tenant_id = public.jwt_tenant_id()
    )
    AND public.jwt_user_role() = 'contabilidade'
  );

-- Empresa: lê eventos da sua empresa
CREATE POLICY "evento_empresa_select" ON eventos_documento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documentos d
      WHERE d.id = documento_id
        AND d.empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    )
    AND public.jwt_user_role() = 'empresa'
  );

-- Funcionário: insere e lê os próprios eventos
CREATE POLICY "evento_funcionario_insert" ON eventos_documento
  FOR INSERT WITH CHECK (
    funcionario_id = (auth.jwt() ->> 'funcionario_id')::uuid
    AND public.jwt_user_role() = 'funcionario'
  );

CREATE POLICY "evento_funcionario_select" ON eventos_documento
  FOR SELECT USING (
    funcionario_id = (auth.jwt() ->> 'funcionario_id')::uuid
    AND public.jwt_user_role() = 'funcionario'
  );

-- ============================================================
-- LOTES
-- ============================================================
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;

-- Contabilidade: acesso total
CREATE POLICY "lote_contabilidade_all" ON lotes
  FOR ALL USING (
    tenant_id = public.jwt_tenant_id()
    AND public.jwt_user_role() = 'contabilidade'
  );

-- Empresa: lê os lotes da própria empresa
CREATE POLICY "lote_empresa_select" ON lotes
  FOR SELECT USING (
    empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    AND public.jwt_user_role() = 'empresa'
  );

-- ============================================================
-- AUTH_CODES (sem acesso direto — apenas service role via Edge Functions)
-- ============================================================
ALTER TABLE auth_codes ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: apenas service_role acessa esta tabela
