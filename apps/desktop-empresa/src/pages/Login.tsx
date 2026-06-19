import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Campo, Input, AlertaErro } from '@/components/ui'

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
    const erroLogin = await login(cnpj, senha)
    setCarregando(false)
    if (erroLogin) {
      setErro(erroLogin)
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-app-bg">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            C
          </div>
          <h1 className="text-2xl font-bold text-white">ContaHub</h1>
          <p className="mt-1 text-sm text-ink-faint">Acesso para Empresas</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-surface p-8 shadow-card">
          <h2 className="mb-6 text-lg font-semibold text-ink">Entrar na sua conta</h2>

          <AlertaErro mensagem={erro} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Campo label="CNPJ" obrigatorio>
              <Input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
                placeholder="00.000.000/0001-00"
                required
                autoFocus
                inputMode="numeric"
                className="font-mono"
              />
            </Campo>

            <Campo label="Senha" obrigatorio>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Campo>

            <Button
              type="submit"
              size="lg"
              loading={carregando}
              disabled={carregando || cnpj.replace(/\D/g, '').length < 14}
              className="mt-2 w-full"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-ink-faint">
            Credenciais fornecidas pela sua contabilidade.
          </p>
        </div>
      </div>
    </div>
  )
}
