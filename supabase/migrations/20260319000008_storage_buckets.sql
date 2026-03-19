-- ============================================================
-- Migration 0008: Storage Buckets para PDFs
-- ============================================================

-- Bucket para os PDFs originais enviados pela contabilidade
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lotes',
  'lotes',
  false,
  52428800,  -- 50 MB
  ARRAY['application/pdf']
);

-- Bucket para os PDFs individuais de cada funcionário
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760,  -- 10 MB
  ARRAY['application/pdf']
);

-- ============================================================
-- RLS do Storage: Bucket lotes
-- Estrutura: lotes/{tenant_id}/{lote_id}/original.pdf
-- ============================================================

-- Contabilidade pode fazer upload e leitura no próprio path
CREATE POLICY "lotes_contabilidade_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lotes'
    AND auth.user_role() = 'contabilidade'
    AND (storage.foldername(name))[1] = auth.tenant_id()::text
  );

CREATE POLICY "lotes_contabilidade_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lotes'
    AND auth.user_role() = 'contabilidade'
    AND (storage.foldername(name))[1] = auth.tenant_id()::text
  );

CREATE POLICY "lotes_contabilidade_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'lotes'
    AND auth.user_role() = 'contabilidade'
    AND (storage.foldername(name))[1] = auth.tenant_id()::text
  );

-- ============================================================
-- RLS do Storage: Bucket documentos
-- Estrutura: documentos/{tenant_id}/{empresa_id}/{funcionario_id}/{doc_id}.pdf
-- ============================================================

-- Contabilidade: acesso total ao próprio tenant
CREATE POLICY "documentos_contabilidade_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documentos'
    AND auth.user_role() = 'contabilidade'
    AND (storage.foldername(name))[1] = auth.tenant_id()::text
  );

-- Empresa: leitura de documentos da sua empresa
CREATE POLICY "documentos_empresa_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos'
    AND auth.user_role() = 'empresa'
    AND (storage.foldername(name))[1] = auth.tenant_id()::text
    AND (storage.foldername(name))[2] = (auth.jwt() ->> 'empresa_id')
  );

-- Funcionário: leitura dos próprios documentos
CREATE POLICY "documentos_funcionario_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos'
    AND auth.user_role() = 'funcionario'
    AND (storage.foldername(name))[1] = auth.tenant_id()::text
    AND (storage.foldername(name))[3] = (auth.jwt() ->> 'funcionario_id')
  );
