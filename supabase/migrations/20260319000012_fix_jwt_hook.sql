-- ============================================================
-- Migration 0012: Correcoes na custom_access_token_hook
--
-- Problemas corrigidos:
-- 1. Ausencia de SET search_path: funcoes SECURITY DEFINER devem
--    ter search_path fixo para evitar que o contexto de execucao
--    do chamador (supabase_auth_admin) interfira na resolucao
--    de nomes de tabela.
-- 2. Ausencia de tratamento de excecao: se a funcao lancar erro,
--    o Supabase Auth falha em emitir o JWT inteiro, causando o
--    erro "JWT failed verification" no cliente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claims         jsonb;
  v_user_id      uuid;
  v_tenant_id    uuid;
  v_empresa_id   uuid;
  v_func_id      uuid;
BEGIN
  claims    := event -> 'claims';
  v_user_id := (event ->> 'user_id')::uuid;

  -- 1. Verificar se e uma Contabilidade (tenant)
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(v_tenant_id::text));
    claims := jsonb_set(claims, '{user_role}',  '"contabilidade"');
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  -- 2. Verificar se e uma Empresa
  SELECT id, tenant_id INTO v_empresa_id, v_tenant_id
  FROM public.empresas
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_empresa_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}',  to_jsonb(v_tenant_id::text));
    claims := jsonb_set(claims, '{user_role}',  '"empresa"');
    claims := jsonb_set(claims, '{empresa_id}', to_jsonb(v_empresa_id::text));
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  -- 3. Verificar se e um Funcionario
  SELECT id, tenant_id, empresa_id INTO v_func_id, v_tenant_id, v_empresa_id
  FROM public.funcionarios
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_func_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}',      to_jsonb(v_tenant_id::text));
    claims := jsonb_set(claims, '{user_role}',      '"funcionario"');
    claims := jsonb_set(claims, '{funcionario_id}', to_jsonb(v_func_id::text));
    claims := jsonb_set(claims, '{empresa_id}',     to_jsonb(v_empresa_id::text));
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  -- Perfil nao encontrado — retorna sem claims customizadas
  -- (ex: owner do SaaS logando pelo admin panel)
  RETURN event;

EXCEPTION WHEN OTHERS THEN
  -- Nunca deixar o hook lancar excecao: isso causa "JWT failed verification"
  -- no cliente. Retorna o evento original sem modificacoes.
  RETURN event;
END;
$$;

-- Reconfirmar grants (idempotente)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;

GRANT SELECT ON public.tenants      TO supabase_auth_admin;
GRANT SELECT ON public.empresas     TO supabase_auth_admin;
GRANT SELECT ON public.funcionarios TO supabase_auth_admin;
