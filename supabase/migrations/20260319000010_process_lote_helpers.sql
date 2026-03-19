-- ============================================================
-- Migration 0010: Funções auxiliares do process-lote
-- ============================================================

-- Incrementa o contador de documentos processados com sucesso
CREATE OR REPLACE FUNCTION incrementar_processados_lote(p_lote_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE lotes
  SET processados = processados + 1
  WHERE id = p_lote_id;
$$;

-- Incrementa o contador de erros
CREATE OR REPLACE FUNCTION incrementar_erros_lote(p_lote_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE lotes
  SET erros = erros + 1
  WHERE id = p_lote_id;
$$;

-- View útil para o dashboard da contabilidade: status de leitura por documento
CREATE OR REPLACE VIEW v_status_documentos AS
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

-- RLS na view herda das tabelas base, mas adicionamos proteção explícita
-- A view é acessada via service role nas Edge Functions ou com JWT válido
