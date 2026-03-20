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
