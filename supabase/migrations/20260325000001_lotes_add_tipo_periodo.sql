-- ============================================================
-- Migration 0013: Adiciona tipo e período de referência aos lotes
-- ============================================================
-- O edge function 'process-lote' recebe tipo/mes/ano mas não
-- os persistia na tabela lotes, impedindo o rastreamento histórico.

ALTER TABLE lotes
  ADD COLUMN tipo           text    NOT NULL DEFAULT 'holerite'
    CHECK (tipo IN ('holerite', 'ferias')),
  ADD COLUMN mes_referencia integer NOT NULL DEFAULT 1
    CHECK (mes_referencia BETWEEN 1 AND 12),
  ADD COLUMN ano_referencia integer NOT NULL DEFAULT 2026;
