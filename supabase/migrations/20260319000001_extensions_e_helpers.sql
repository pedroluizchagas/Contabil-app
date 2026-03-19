-- ============================================================
-- Migration 0001: Extensões e funções auxiliares
-- ============================================================

-- pgcrypto: hash de CPF, data de nascimento e senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- uuid-ossp: geração de UUIDs (fallback, gen_random_uuid() já existe no PG14+)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Funções auxiliares de criptografia
-- ============================================================

-- Gera hash bcrypt de um texto (para CPF, data de nascimento, senhas)
CREATE OR REPLACE FUNCTION hash_texto(p_texto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT crypt(p_texto, gen_salt('bf', 10));
$$;

-- Verifica se um texto corresponde a um hash bcrypt
CREATE OR REPLACE FUNCTION verificar_hash(p_texto text, p_hash text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT crypt(p_texto, p_hash) = p_hash;
$$;

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

-- Verifica CPF + data de nascimento de um funcionário
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
