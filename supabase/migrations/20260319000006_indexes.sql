-- ============================================================
-- Migration 0006: Índices de Performance
-- ============================================================

-- TENANTS
CREATE INDEX idx_tenants_cnpj          ON tenants (cnpj);
CREATE INDEX idx_tenants_auth_user_id  ON tenants (auth_user_id);

-- SUBSCRIPTIONS
CREATE INDEX idx_subscriptions_tenant  ON subscriptions (tenant_id);

-- EMPRESAS
CREATE INDEX idx_empresas_tenant       ON empresas (tenant_id);
CREATE INDEX idx_empresas_cnpj         ON empresas (cnpj);
CREATE INDEX idx_empresas_auth_user    ON empresas (auth_user_id);

-- FUNCIONÁRIOS
CREATE INDEX idx_funcionarios_empresa  ON funcionarios (empresa_id);
CREATE INDEX idx_funcionarios_tenant   ON funcionarios (tenant_id);
CREATE INDEX idx_funcionarios_cpf      ON funcionarios (cpf_hash);
CREATE INDEX idx_funcionarios_auth     ON funcionarios (auth_user_id);

-- DOCUMENTOS
CREATE INDEX idx_documentos_funcionario ON documentos (funcionario_id);
CREATE INDEX idx_documentos_empresa     ON documentos (empresa_id);
CREATE INDEX idx_documentos_tenant      ON documentos (tenant_id);
CREATE INDEX idx_documentos_periodo     ON documentos (ano_referencia, mes_referencia);
CREATE INDEX idx_documentos_tipo        ON documentos (tipo);

-- EVENTOS_DOCUMENTO
CREATE INDEX idx_eventos_documento     ON eventos_documento (documento_id);
CREATE INDEX idx_eventos_funcionario   ON eventos_documento (funcionario_id);
CREATE INDEX idx_eventos_tipo          ON eventos_documento (tipo);

-- LOTES
CREATE INDEX idx_lotes_tenant          ON lotes (tenant_id);
CREATE INDEX idx_lotes_empresa         ON lotes (empresa_id);
CREATE INDEX idx_lotes_status          ON lotes (status);

-- AUTH_CODES
CREATE INDEX idx_auth_codes_funcionario ON auth_codes (funcionario_id);
CREATE INDEX idx_auth_codes_expires     ON auth_codes (expires_at);
