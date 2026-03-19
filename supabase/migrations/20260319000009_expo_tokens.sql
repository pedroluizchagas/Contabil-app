-- ============================================================
-- Migration 0009: Tokens de Push Notification (Expo)
-- ============================================================

CREATE TABLE expo_push_tokens (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  token          text NOT NULL,
  ativo          boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- Um funcionário pode ter múltiplos dispositivos
  CONSTRAINT expo_tokens_funcionario_token_unique UNIQUE (funcionario_id, token)
);

ALTER TABLE expo_push_tokens ENABLE ROW LEVEL SECURITY;

-- Funcionário gerencia os próprios tokens
CREATE POLICY "expo_token_funcionario_all" ON expo_push_tokens
  FOR ALL USING (
    funcionario_id = (auth.jwt() ->> 'funcionario_id')::uuid
    AND auth.user_role() = 'funcionario'
  );

-- Índice para busca por funcionário
CREATE INDEX idx_expo_tokens_funcionario ON expo_push_tokens (funcionario_id) WHERE ativo = true;
