import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface FuncionarioInfo {
  id: string
  nome: string
  email: string
  codigo: string
  empresa_id: string
  empresa_nome: string
  tenant_id: string
}

/** Estado temporário guardado entre etapa 1 e etapa 2 do login */
interface PendingAuth {
  empresa_id: string
  empresa_nome: string
  cpf: string
  email_mascarado: string
  expires_in_minutes: number
}

interface AuthContextValue {
  session: Session | null
  funcionario: FuncionarioInfo | null
  pendingAuth: PendingAuth | null
  carregando: boolean
  /** Etapa 1: CNPJ empresa + CPF + data de nascimento → envia OTP */
  loginStep1: (
    cnpj_empresa: string,
    cpf: string,
    data_nascimento: string
  ) => Promise<string | null>
  /** Etapa 2: código OTP → cria sessão */
  loginStep2: (codigo: string) => Promise<string | null>
  /** Cancela o processo de login (volta da tela OTP) */
  cancelarLogin: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [funcionario, setFuncionario] = useState<FuncionarioInfo | null>(null)
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) carregarFuncionario(data.session.user.id)
      else setCarregando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (sess) carregarFuncionario(sess.user.id)
      else { setFuncionario(null); setCarregando(false) }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function carregarFuncionario(userId: string) {
    const { data } = await supabase
      .from('funcionarios')
      .select('id, nome, email, codigo, empresa_id, tenant_id, empresas(nome)')
      .eq('auth_user_id', userId)
      .single()

    if (data) {
      setFuncionario({
        id: data.id,
        nome: data.nome,
        email: data.email,
        codigo: data.codigo,
        empresa_id: data.empresa_id,
        empresa_nome: (data.empresas as unknown as { nome: string })?.nome ?? '',
        tenant_id: data.tenant_id,
      })
    }
    setCarregando(false)
  }

  async function loginStep1(
    cnpj_empresa: string,
    cpf: string,
    data_nascimento: string
  ): Promise<string | null> {
    const cnpjLimpo = cnpj_empresa.replace(/\D/g, '')
    const cpfLimpo = cpf.replace(/\D/g, '')

    // 1. Resolve empresa pelo CNPJ
    const { data: empresaData, error: empresaError } = await supabase.functions.invoke<{
      id: string
      nome: string
      error?: string
    }>('buscar-empresa', { body: { cnpj: cnpjLimpo } })

    if (empresaError || empresaData?.error) {
      return empresaData?.error ?? 'Empresa não encontrada.'
    }
    if (!empresaData?.id) return 'Empresa não encontrada.'

    // 2. Solicita OTP
    const { data: otpData, error: otpError } = await supabase.functions.invoke<{
      message?: string
      expires_in_minutes?: number
      error?: string
    }>('auth-funcionario', {
      body: {
        step: 'verify',
        empresa_id: empresaData.id,
        cpf: cpfLimpo,
        data_nascimento,
      },
    })

    if (otpError || otpData?.error) {
      return traduzirErro(otpData?.error ?? otpError?.message ?? '')
    }

    // Guarda estado para a etapa 2
    setPendingAuth({
      empresa_id: empresaData.id,
      empresa_nome: empresaData.nome,
      cpf: cpfLimpo,
      email_mascarado: otpData?.message ?? '',
      expires_in_minutes: otpData?.expires_in_minutes ?? 10,
    })

    return null
  }

  async function loginStep2(codigo: string): Promise<string | null> {
    if (!pendingAuth) return 'Sessão expirada. Inicie o login novamente.'

    const { data, error } = await supabase.functions.invoke<{
      session?: Session
      error?: string
    }>('auth-funcionario', {
      body: {
        step: 'confirm',
        empresa_id: pendingAuth.empresa_id,
        cpf: pendingAuth.cpf,
        codigo: codigo.trim(),
      },
    })

    if (error || data?.error) {
      return traduzirErro(data?.error ?? error?.message ?? '')
    }

    if (!data?.session) return 'Erro ao criar sessão. Tente novamente.'

    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    setPendingAuth(null)
    return null
  }

  function cancelarLogin() {
    setPendingAuth(null)
  }

  async function logout() {
    await supabase.auth.signOut()
    setFuncionario(null)
    setPendingAuth(null)
  }

  return (
    <AuthContext.Provider
      value={{ session, funcionario, pendingAuth, carregando, loginStep1, loginStep2, cancelarLogin, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}

function traduzirErro(msg: string): string {
  const map: Record<string, string> = {
    'Credenciais inválidas.': 'CPF, data de nascimento ou CNPJ da empresa incorretos.',
    'Acesso inativo. Contate sua empresa.': 'Seu acesso está inativo. Contate sua empresa.',
    'Código inválido ou expirado.': 'Código incorreto ou expirado. Solicite um novo.',
    'Nenhum código válido encontrado. Solicite um novo.': 'Código expirado. Solicite um novo.',
    'Empresa não encontrada ou inativa.': 'CNPJ da empresa não encontrado.',
  }
  return map[msg] ?? (msg || 'Erro ao fazer login. Tente novamente.')
}
