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
