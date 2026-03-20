-- ============================================================
-- Migration 0011: Corrige SECURITY DEFINER na view v_status_documentos
--
-- Por padrao, views no PostgreSQL rodam com as permissoes do
-- criador (SECURITY DEFINER), bypassando o RLS do usuario que
-- consulta. Com security_invoker = on, a view respeita as
-- politicas RLS do usuario chamador — garantindo isolamento
-- de tenant.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
-- ============================================================

CREATE OR REPLACE VIEW public.v_status_documentos WITH (security_invoker = on) AS
SELECT
  d.id                    AS documento_id,
  d.funcionario_id,
  f.nome                  AS funcionario_nome,
  f.codigo                AS funcionario_codigo,
  d.empresa_id,
  e.nome                  AS empresa_nome,
  d.tenant_id,
  d.tipo,
  d.mes_referencia,
  d.ano_referencia,
  d.status_envio,
  d.storage_path,
  d.created_at            AS enviado_em,
  MAX(CASE WHEN ev.tipo = 'visualizado' THEN ev.created_at END) AS visualizado_em,
  MAX(CASE WHEN ev.tipo = 'assinado'    THEN ev.created_at END) AS assinado_em,
  COUNT(CASE WHEN ev.tipo = 'visualizado' THEN 1 END)           AS total_visualizacoes
FROM documentos d
JOIN funcionarios f ON f.id = d.funcionario_id
JOIN empresas e     ON e.id = d.empresa_id
LEFT JOIN eventos_documento ev ON ev.documento_id = d.id
GROUP BY d.id, f.nome, f.codigo, e.nome;
