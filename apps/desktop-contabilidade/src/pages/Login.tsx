import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button, AlertaErro } from '@/components/ui'

export function LoginPage() {
  const { login, session } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  if (session) {
    navigate('/dashboard', { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    const erroMsg = await login(email.trim(), senha)
    setCarregando(false)
    if (erroMsg) setErro(erroMsg)
    else navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex h-screen items-center justify-center bg-app-bg">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg"
            style={{ background: '#7DC82E' }}
          >
            C
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">ContaHub</h1>
            <p className="mt-0.5 text-sm text-gray-400">Acesso para Contabilidades</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
          <h2 className="mb-6 text-base font-semibold text-gray-800">Entrar na sua conta</h2>

          <AlertaErro mensagem={erro} />

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
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
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
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>

            <Button type="submit" loading={carregando} className="mt-2 w-full justify-center" size="lg">
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
