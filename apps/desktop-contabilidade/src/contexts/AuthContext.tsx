import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  tenantId: string | null
  carregando: boolean
  login: (email: string, senha: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Carrega sessão existente
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })

    // Escuta mudanças de autenticação
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(email: string, senha: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) return traduzirErro(error.message)
    return null
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const tenantId = extrairClaim(session, 'tenant_id')

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, tenantId, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}

function extrairClaim(session: Session | null, claim: string): string | null {
  if (!session) return null
  try {
    const payload = session.access_token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded[claim] ?? null
  } catch {
    return null
  }
}

function traduzirErro(msg: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'Confirme seu e-mail antes de continuar.',
    'Too many requests': 'Muitas tentativas. Aguarde alguns minutos.',
  }
  return map[msg] ?? 'Erro ao fazer login. Tente novamente.'
}
