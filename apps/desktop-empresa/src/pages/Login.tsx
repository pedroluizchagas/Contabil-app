import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { login, session } = useAuth()
  const navigate = useNavigate()

  const [cnpj, setCnpj] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  if (session) {
    navigate('/dashboard', { replace: true })
    return null
  }

  function formatarCnpj(valor: string): string {
    const s = valor.replace(/\D/g, '').slice(0, 14)
    if (s.length <= 2) return s
    if (s.length <= 5) return `${s.slice(0, 2)}.${s.slice(2)}`
    if (s.length <= 8) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5)}`
    if (s.length <= 12) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8)}`
    return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    const erro = await login(cnpj, senha)
    setCarregando(false)
    if (erro) {
      setErro(erro)
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">ContaHub</h1>
          <p className="mt-1 text-sm text-gray-500">Acesso para Empresas</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-gray-800">Entrar na sua conta</h2>

          {erro && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">CNPJ</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
                placeholder="00.000.000/0001-00"
                required
                autoFocus
                inputMode="numeric"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 font-mono"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <button
              type="submit"
              disabled={carregando || cnpj.replace(/\D/g, '').length < 14}
              className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400">
            Credenciais fornecidas pela sua contabilidade.
          </p>
        </div>
      </div>
    </div>
  )
}
