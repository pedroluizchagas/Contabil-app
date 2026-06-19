-- ============================================================
-- Migration 20260618000003: Função verificar_senha_empresa_por_id
--
-- A Edge Function 'alterar-senha-empresa' valida a senha atual da
-- empresa via este RPC antes de gravar a nova senha. A função
-- existente (verificar_senha_empresa) recebe o CNPJ; aqui a empresa
-- já está autenticada e é identificada pelo seu id.
--
-- Sem esta função o fluxo "alterar senha" do app desktop-empresa
-- falha em runtime ("function ... does not exist").
--
-- SECURITY DEFINER: executa como owner para ler empresas.senha_hash
-- ignorando RLS. Retorna apenas um boolean — nunca expõe o hash.
-- Mesma convenção das funções verificar_senha_empresa / hash_texto.
-- ============================================================

CREATE OR REPLACE FUNCTION public.verificar_senha_empresa_por_id(
  p_empresa_id uuid,
  p_senha text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empresas e
    WHERE e.id = p_empresa_id
      AND e.ativo = true
      AND crypt(p_senha, e.senha_hash) = e.senha_hash
  );
$$;

-- Único chamador legítimo é a Edge Function (service_role). Bloqueia
-- invocação direta via API pública por anon/authenticated.
-- Nota: o Supabase concede EXECUTE a anon/authenticated via default
-- privileges, então é preciso revogar desses papéis explicitamente —
-- REVOKE FROM PUBLIC sozinho não basta.
REVOKE ALL ON FUNCTION public.verificar_senha_empresa_por_id(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_senha_empresa_por_id(uuid, text) TO service_role;
