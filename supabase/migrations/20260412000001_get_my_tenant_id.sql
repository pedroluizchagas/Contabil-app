-- ============================================================
-- Migration 20260412000001: Função auxiliar get_my_tenant_id()
--
-- Retorna o tenant_id do usuário autenticado consultando a tabela
-- tenants por auth.uid(). Usada como fallback no frontend quando
-- o JWT hook não injetou a claim tenant_id (ex: hook desabilitado
-- no dashboard ou sessão emitida antes do hook estar ativo).
--
-- SECURITY DEFINER: executa como owner (postgres), ignorando RLS,
-- o que é seguro pois só expõe o tenant_id do próprio usuário.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
