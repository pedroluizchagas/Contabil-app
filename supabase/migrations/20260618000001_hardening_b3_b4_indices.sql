-- ============================================================
-- Migration 0013: Hardening — auth de funcionário (B3),
-- validação de tenant (B4 dá suporte), índices e limpeza
-- ============================================================

-- ------------------------------------------------------------
-- B3: resolver o funcionário por (empresa_id, CPF) sem exigir a
-- data de nascimento na etapa "confirm" do OTP.
--
-- Permite que a Edge Function auth-funcionario filtre auth_codes
-- pelo funcionario_id correto, em vez de varrer os códigos ativos
-- do banco inteiro (vazamento por canal lateral + falha sob
-- concorrência). SECURITY DEFINER para ignorar RLS de forma
-- controlada, igual às demais funções de verificação.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscar_funcionario_id_por_cpf(
  p_empresa_id uuid,
  p_cpf text
)
RETURNS TABLE(id uuid, auth_user_id uuid, ativo boolean)
LANGUAGE sql
SECURITY DEFINER
-- 'extensions' no path: o pgcrypto (crypt) é instalado nesse schema no
-- Supabase hosted; com search_path = public apenas, crypt() não resolve
-- e a função falha (testado no projeto hosted).
SET search_path = public, extensions
AS $$
  SELECT f.id, f.auth_user_id, f.ativo
  FROM funcionarios f
  WHERE f.empresa_id = p_empresa_id
    AND crypt(p_cpf, f.cpf_hash) = f.cpf_hash
  LIMIT 1;
$$;

-- ------------------------------------------------------------
-- Índice composto para consultas de status de leitura/assinatura.
-- Relatórios filtram eventos por documento + tipo, ordenando pela
-- data — em escala (1k tenants) isso evita scans sequenciais.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_eventos_doc_tipo_data
  ON eventos_documento (documento_id, tipo, created_at DESC);

-- ------------------------------------------------------------
-- Limpeza de auth_codes expirados. A tabela cresce indefinidamente;
-- removemos códigos vencidos há mais de 7 dias.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION limpar_auth_codes_expirados()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removidos integer;
BEGIN
  DELETE FROM auth_codes
  WHERE expires_at < now() - interval '7 days';
  GET DIAGNOSTICS v_removidos = ROW_COUNT;
  RETURN v_removidos;
END;
$$;

-- Agenda diária às 04:00 se pg_cron estiver disponível (produção).
-- Em ambientes sem pg_cron (ex.: local), a função permanece disponível
-- para chamada manual ou via scheduler externo — sem quebrar o reset.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'limpar-auth-codes-diario',
      '0 4 * * *',
      'SELECT public.limpar_auth_codes_expirados();'
    );
  END IF;
END;
$$;
