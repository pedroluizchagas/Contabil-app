-- ============================================================
-- Seed de Desenvolvimento — ContaHub
-- Executar com: supabase db reset
-- ============================================================

-- ============================================================
-- Planos
-- ============================================================
INSERT INTO public.planos (id, nome, preco_mensal, limite_empresas, limite_funcionarios) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Starter',     97.00,   5,  100),
  ('a1000000-0000-0000-0000-000000000002', 'Profissional', 197.00,  20, 500),
  ('a1000000-0000-0000-0000-000000000003', 'Enterprise',   397.00,  999, 9999);

-- ============================================================
-- Usuário Auth: Contabilidade (email: contador@teste.com / senha: Senha@123)
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  aud, role, confirmation_token, recovery_token
) VALUES (
  'b1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'contador@teste.com',
  crypt('Senha@123', gen_salt('bf', 10)),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"nome":"Contabilidade Teste"}',
  'authenticated', 'authenticated', '', ''
);

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  '{"sub":"b1000000-0000-0000-0000-000000000001","email":"contador@teste.com"}',
  'email', 'contador@teste.com', now(), now(), now()
);

-- ============================================================
-- Tenant (Contabilidade)
-- ============================================================
INSERT INTO public.tenants (id, auth_user_id, nome, cnpj, email, status) VALUES
  ('c1000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001',
   'Contabilidade Teste Ltda',
   '12345678000195',
   'contador@teste.com',
   'ativo');

INSERT INTO public.subscriptions (tenant_id, plano_id, status, proximo_vencimento) VALUES
  ('c1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000002',
   'ativo',
   (now() + interval '30 days')::date);

-- ============================================================
-- Usuário Auth: Empresa 1 (login via CNPJ: 98765432000110 / senha: Empresa@123)
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  aud, role, confirmation_token, recovery_token
) VALUES (
  'b2000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'empresa1@teste.com',
  crypt('Empresa@123', gen_salt('bf', 10)),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"nome":"Empresa Alpha"}',
  'authenticated', 'authenticated', '', ''
);

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  'b2000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  '{"sub":"b2000000-0000-0000-0000-000000000001","email":"empresa1@teste.com"}',
  'email', 'empresa1@teste.com', now(), now(), now()
);

-- ============================================================
-- Empresas
-- ============================================================
INSERT INTO public.empresas (id, tenant_id, auth_user_id, nome, cnpj, senha_hash, email) VALUES
  ('d1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   'b2000000-0000-0000-0000-000000000001',
   'Empresa Alpha Ltda',
   '98765432000110',
   crypt('Empresa@123', gen_salt('bf', 10)),
   'empresa1@teste.com'),

  ('d1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000001',
   NULL,
   'Empresa Beta S/A',
   '11222333000144',
   crypt('Beta@456', gen_salt('bf', 10)),
   'empresa2@teste.com');

-- ============================================================
-- Usuários Auth: Funcionários
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  aud, role, confirmation_token, recovery_token
) VALUES
  ('b3000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'joao.silva@teste.com', crypt('func123', gen_salt('bf', 10)),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated', '', ''),
  ('b3000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000',
   'maria.souza@teste.com', crypt('func123', gen_salt('bf', 10)),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated', '', ''),
  ('b3000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000',
   'pedro.costa@teste.com', crypt('func123', gen_salt('bf', 10)),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   'authenticated', 'authenticated', '', '');

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES
  ('b3000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001',
   '{"sub":"b3000000-0000-0000-0000-000000000001","email":"joao.silva@teste.com"}',
   'email', 'joao.silva@teste.com', now(), now(), now()),
  ('b3000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000002',
   '{"sub":"b3000000-0000-0000-0000-000000000002","email":"maria.souza@teste.com"}',
   'email', 'maria.souza@teste.com', now(), now(), now()),
  ('b3000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000003',
   '{"sub":"b3000000-0000-0000-0000-000000000003","email":"pedro.costa@teste.com"}',
   'email', 'pedro.costa@teste.com', now(), now(), now());

-- ============================================================
-- Funcionários
-- CPF de teste (sem máscara): 11144477735, 22255588846, 33366699957
-- Data de nascimento: YYYY-MM-DD
-- ============================================================
INSERT INTO public.funcionarios (
  id, empresa_id, tenant_id, auth_user_id, nome,
  cpf_hash, data_nascimento_hash, codigo, email
) VALUES
  ('e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   'b3000000-0000-0000-0000-000000000001',
   'João Silva',
   crypt('11144477735', gen_salt('bf', 10)),
   crypt('1990-05-15', gen_salt('bf', 10)),
   'ALPHA001', 'joao.silva@teste.com'),

  ('e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   'b3000000-0000-0000-0000-000000000002',
   'Maria Souza',
   crypt('22255588846', gen_salt('bf', 10)),
   crypt('1985-11-22', gen_salt('bf', 10)),
   'ALPHA002', 'maria.souza@teste.com'),

  ('e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000001',
   'b3000000-0000-0000-0000-000000000003',
   'Pedro Costa',
   crypt('33366699957', gen_salt('bf', 10)),
   crypt('1992-03-08', gen_salt('bf', 10)),
   'BETA001', 'pedro.costa@teste.com');

-- ============================================================
-- Documentos de exemplo
-- ============================================================
INSERT INTO public.documentos (
  funcionario_id, empresa_id, tenant_id, tipo,
  mes_referencia, ano_referencia, storage_path, status_envio
) VALUES
  ('e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   'holerite', 2, 2026,
   'tenants/c1000000/empresas/d1000000-01/funcionarios/e1000000-01/holerite_2026_02.pdf',
   'enviado'),

  ('e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   'holerite', 2, 2026,
   'tenants/c1000000/empresas/d1000000-01/funcionarios/e1000000-02/holerite_2026_02.pdf',
   'enviado');
