import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { login, session } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  // Redireciona se já autenticado
  if (session) {
    navigate('/dashboard', { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    const erro = await login(email.trim(), senha)
    setCarregando(false)
    if (erro) {
      setErro(erro)
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-sidebar-bg">
      <div className="w-full max-w-[360px]">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-brand text-[20px] font-extrabold text-[#111]">
            C
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-bold text-white">ContaHub</h1>
            <p className="mt-0.5 text-[12px] text-[#666]">Acesso para Contabilidades</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-card bg-card p-8 shadow-card">
          <h2 className="mb-5 text-[15px] font-semibold text-ink">Entrar na sua conta</h2>

          {erro && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-danger">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contador@suacontabilidade.com.br"
                required
                autoFocus
                className="w-full rounded-lg border border-[#e0e0e0] px-3 py-2.5 text-[12.5px] text-ink placeholder-[#bbb] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-muted"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-[#e0e0e0] px-3 py-2.5 text-[12.5px] text-ink placeholder-[#bbb] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-muted"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="mt-1 w-full rounded-lg bg-brand px-4 py-2.5 text-[12.5px] font-semibold text-[#111] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
