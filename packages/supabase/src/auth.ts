/**
 * Utilitários de autenticação — ContaHub
 *
 * Três perfis de usuário com fluxos distintos:
 *  - Contabilidade: e-mail + senha (Supabase Auth padrão)
 *  - Empresa: CNPJ + senha (via Edge Function auth-empresa)
 *  - Funcionário: CPF + data de nascimento + OTP (via Edge Function auth-funcionario)
 */

import { supabase } from './client'
import type { Session } from '@supabase/supabase-js'

// ─── Tipos de resposta ────────────────────────────────────────────────────────

export interface AuthResult {
  session: Session | null
  error: string | null
}

// ─── Contabilidade (e-mail + senha) ──────────────────────────────────────────

export async function loginContabilidade(
  email: string,
  senha: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  return {
    session: data.session,
    error: error ? traduzirErroAuth(error.message) : null,
  }
}

export async function cadastrarContabilidade(
  email: string,
  senha: string,
  nome: string,
  cnpj: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, cnpj },
    },
  })
  return {
    session: data.session,
    error: error ? traduzirErroAuth(error.message) : null,
  }
}

// ─── Empresa (CNPJ + senha via Edge Function) ────────────────────────────────

export async function loginEmpresa(cnpj: string, senha: string): Promise<AuthResult> {
  const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl

  const response = await fetch(`${supabaseUrl}/functions/v1/auth-empresa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnpj, senha }),
  })

  const body = await response.json()

  if (!response.ok) {
    return { session: null, error: body.error ?? 'Erro ao fazer login.' }
  }

  // Seta a sessão no cliente Supabase
  if (body.session) {
    await supabase.auth.setSession({
      access_token: body.session.access_token,
      refresh_token: body.session.refresh_token,
    })
  }

  return { session: body.session, error: null }
}

// ─── Funcionário (CPF + data de nascimento + OTP) ────────────────────────────

export interface VerificarFuncionarioResult {
  ok: boolean
  error: string | null
  emailMascarado?: string
}

/** Etapa 1: verifica credenciais e envia OTP */
export async function verificarFuncionario(
  empresaId: string,
  cpf: string,
  dataNascimento: string
): Promise<VerificarFuncionarioResult> {
  const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl

  const response = await fetch(`${supabaseUrl}/functions/v1/auth-funcionario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: 'verify',
      empresa_id: empresaId,
      cpf,
      data_nascimento: dataNascimento,
    }),
  })

  const body = await response.json()

  if (!response.ok) {
    return { ok: false, error: body.error ?? 'Erro ao verificar credenciais.' }
  }

  return { ok: true, error: null, emailMascarado: body.message }
}

/** Etapa 2: confirma OTP e retorna sessão */
export async function confirmarOtpFuncionario(
  empresaId: string,
  cpf: string,
  codigo: string
): Promise<AuthResult> {
  const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl

  const response = await fetch(`${supabaseUrl}/functions/v1/auth-funcionario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: 'confirm',
      empresa_id: empresaId,
      cpf,
      codigo,
    }),
  })

  const body = await response.json()

  if (!response.ok) {
    return { session: null, error: body.error ?? 'Código inválido.' }
  }

  if (body.session) {
    await supabase.auth.setSession({
      access_token: body.session.access_token,
      refresh_token: body.session.refresh_token,
    })
  }

  return { session: body.session, error: null }
}

// ─── Logout (todos os perfis) ─────────────────────────────────────────────────

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}

// ─── Recuperação de senha (Contabilidade) ────────────────────────────────────

export async function recuperarSenha(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  return { error: error ? traduzirErroAuth(error.message) : null }
}

// ─── Claims do JWT ────────────────────────────────────────────────────────────

export interface JwtClaims {
  user_role: 'contabilidade' | 'empresa' | 'funcionario'
  tenant_id: string
  empresa_id?: string
  funcionario_id?: string
}

/** Extrai as claims customizadas do JWT atual */
export async function getJwtClaims(): Promise<JwtClaims | null> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null

  // Decodifica o payload do JWT (sem verificar assinatura — confiamos no Supabase)
  const payload = data.session.access_token.split('.')[1]
  const decoded = JSON.parse(atob(payload))

  return {
    user_role: decoded.user_role,
    tenant_id: decoded.tenant_id,
    empresa_id: decoded.empresa_id,
    funcionario_id: decoded.funcionario_id,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function traduzirErroAuth(message: string): string {
  const traducoes: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'Confirme seu e-mail antes de fazer login.',
    'User already registered': 'Este e-mail já está cadastrado.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
  }
  return traducoes[message] ?? message
}
