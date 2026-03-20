-- ============================================================
-- Migration 0003: Empresas e Funcionários
-- ============================================================

-- Empresas: clientes das contabilidades
CREATE TABLE empresas (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome         text NOT NULL,
  cnpj         text NOT NULL,
  senha_hash   text NOT NULL,              -- bcrypt via pgcrypto
  email        text NOT NULL,
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- CNPJ único por tenant
  CONSTRAINT empresas_tenant_cnpj_unique UNIQUE (tenant_id, cnpj)
);

-- Funcionários: vinculados a uma empresa e ao tenant
CREATE TABLE funcionarios (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id            uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome                  text NOT NULL,
  cpf_hash              text NOT NULL,              -- bcrypt do CPF (sem máscara)
  data_nascimento_hash  text NOT NULL,              -- bcrypt da data (YYYY-MM-DD)
  codigo                text NOT NULL,              -- código identificador no software contábil
  email                 text NOT NULL,
  ativo                 boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  -- CPF único por empresa
  CONSTRAINT funcionarios_empresa_cpf_unique UNIQUE (empresa_id, cpf_hash),
  -- Código único por tenant
  CONSTRAINT funcionarios_tenant_codigo_unique UNIQUE (tenant_id, codigo)
);

-- ============================================================
-- Funções de verificação de credenciais (dependem das tabelas acima)
-- ============================================================

-- Verifica CNPJ + senha de uma empresa (usada pela Edge Function de auth)
-- Executada com SECURITY DEFINER para acessar a tabela sem RLS
CREATE OR REPLACE FUNCTION verificar_senha_empresa(p_cnpj text, p_senha text)
RETURNS TABLE(id uuid, tenant_id uuid, auth_user_id uuid, ativo boolean)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT e.id, e.tenant_id, e.auth_user_id, e.ativo
  FROM empresas e
  WHERE e.cnpj = p_cnpj
    AND e.ativo = true
    AND crypt(p_senha, e.senha_hash) = e.senha_hash;
$$;

-- Verifica CPF + data de nascimento de um funcionario
CREATE OR REPLACE FUNCTION verificar_credenciais_funcionario(
  p_empresa_id uuid,
  p_cpf text,
  p_data_nascimento text
)
RETURNS TABLE(id uuid, tenant_id uuid, auth_user_id uuid, email text, ativo boolean)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT f.id, f.tenant_id, f.auth_user_id, f.email, f.ativo
  FROM funcionarios f
  WHERE f.empresa_id = p_empresa_id
    AND f.ativo = true
    AND crypt(p_cpf, f.cpf_hash) = f.cpf_hash
    AND crypt(p_data_nascimento, f.data_nascimento_hash) = f.data_nascimento_hash;
$$;
