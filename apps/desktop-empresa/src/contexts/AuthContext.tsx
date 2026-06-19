import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface EmpresaInfo {
  id: string
  nome: string
  cnpj: string
  tenantId: string
}

interface AuthContextValue {
  session: Session | null
  empresa: EmpresaInfo | null
  carregando: boolean
  login: (cnpj: string, senha: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) carregarEmpresa(data.session)
      else setCarregando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) carregarEmpresa(newSession)
      else {
        setEmpresa(null)
        setCarregando(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function carregarEmpresa(sess: Session) {
    // O auth_user_id da empresa está na sessão — busca os dados dela
    const userId = sess.user.id
    const { data } = await supabase
      .from('empresas')
      .select('id, nome, cnpj, tenant_id')
      .eq('auth_user_id', userId)
      .single()

    if (data) {
      setEmpresa({ id: data.id, nome: data.nome, cnpj: data.cnpj, tenantId: data.tenant_id })
    }
    setCarregando(false)
  }

  async function login(cnpj: string, senha: string): Promise<string | null> {
    const cnpjLimpo = cnpj.replace(/\D/g, '')

    // Chama Edge Function customizada (CNPJ + senha → sessão Supabase)
    const { data, error } = await supabase.functions.invoke<{ session: Session }>('auth-empresa', {
      body: { cnpj: cnpjLimpo, senha },
    })

    if (error) {
      let mensagem = error.message
      try {
        const body = await (error as { context?: Response }).context?.json()
        if (body?.error) mensagem = body.error
      } catch {
        /* response body não legível */
      }
      return traduzirErro(mensagem)
    }

    if (!data?.session) return 'Erro ao criar sessão. Tente novamente.'

    // Seta a sessão manualmente no cliente Supabase
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    return null
  }

  async function logout() {
    await supabase.auth.signOut()
    setEmpresa(null)
  }

  return (
    <AuthContext.Provider value={{ session, empresa, carregando, login, logout }}>
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
    'CNPJ ou senha inválidos.': 'CNPJ ou senha incorretos.',
    'Empresa inativa. Contate sua contabilidade.': 'Empresa inativa. Contate sua contabilidade.',
    'Conta não configurada. Contate sua contabilidade.':
      'Conta não configurada. Contate sua contabilidade.',
  }
  return map[msg] ?? (msg || 'Erro ao fazer login. Tente novamente.')
}
