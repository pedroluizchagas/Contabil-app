-- ============================================================
-- Migration 0004: Documentos, Eventos e Lotes
-- ============================================================

-- Documentos individuais por funcionário
CREATE TABLE documentos (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id  uuid NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  empresa_id      uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo            text NOT NULL CHECK (tipo IN ('holerite', 'ferias')),
  mes_referencia  integer NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  ano_referencia  integer NOT NULL,
  storage_path    text NOT NULL,           -- caminho no Supabase Storage
  status_envio    text NOT NULL DEFAULT 'pendente'
                    CHECK (status_envio IN ('pendente', 'enviado', 'erro')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Eventos de acesso a documentos (leitura e assinatura)
CREATE TABLE eventos_documento (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id   uuid NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  tipo           text NOT NULL CHECK (tipo IN ('visualizado', 'assinado')),
  ip             text,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Lotes de upload: arquivo PDF original enviado pela contabilidade
CREATE TABLE lotes (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empresa_id            uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  storage_path_original text NOT NULL,     -- PDF original antes do split
  total_documentos      integer NOT NULL DEFAULT 0,
  processados           integer NOT NULL DEFAULT 0,
  erros                 integer NOT NULL DEFAULT 0,
  status                text NOT NULL DEFAULT 'aguardando'
                          CHECK (status IN ('aguardando', 'processando', 'concluido', 'erro')),
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Códigos OTP para autenticação de funcionários
CREATE TABLE auth_codes (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  code_hash      text NOT NULL,            -- hash do código de 6 dígitos
  expires_at     timestamptz NOT NULL,
  used_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
