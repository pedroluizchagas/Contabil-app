-- ============================================================
-- Migration 0007: Custom Access Token Hook
--
-- Injeta tenant_id, user_role, empresa_id e funcionario_id
-- no payload do JWT a cada geração de token.
--
-- Ativar no Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token Hook
--   URI: pg-functions://postgres/public/custom_access_token_hook
--
-- Ou via config.toml (Supabase local):
--   [auth.hook.custom_access_token]
--   enabled = true
--   uri = "pg-functions://postgres/public/custom_access_token_hook"
-- ============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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

  -- 1. Verificar se é uma Contabilidade (tenant)
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}',  to_jsonb(v_tenant_id::text));
    claims := jsonb_set(claims, '{user_role}',  '"contabilidade"');
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  -- 2. Verificar se é uma Empresa
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

  -- 3. Verificar se é um Funcionário
  SELECT id, tenant_id INTO v_func_id, v_tenant_id
  FROM public.funcionarios
  WHERE auth_user_id = v_user_id
  LIMIT 1;

  IF v_func_id IS NOT NULL THEN
    -- Buscar empresa_id do funcionário
    SELECT empresa_id INTO v_empresa_id
    FROM public.funcionarios
    WHERE id = v_func_id;

    claims := jsonb_set(claims, '{tenant_id}',      to_jsonb(v_tenant_id::text));
    claims := jsonb_set(claims, '{user_role}',      '"funcionario"');
    claims := jsonb_set(claims, '{funcionario_id}', to_jsonb(v_func_id::text));
    claims := jsonb_set(claims, '{empresa_id}',     to_jsonb(v_empresa_id::text));
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  -- Usuário sem perfil (ex: admin técnico) — retorna sem claims customizadas
  RETURN event;
END;
$$;

-- Conceder permissão de execução para o role supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;

-- Conceder leitura nas tabelas necessárias para o hook
GRANT SELECT ON public.tenants      TO supabase_auth_admin;
GRANT SELECT ON public.empresas     TO supabase_auth_admin;
GRANT SELECT ON public.funcionarios TO supabase_auth_admin;
